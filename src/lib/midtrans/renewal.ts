import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { PLANS } from "@/lib/plans";
import { effectivePriceMonthly } from "@/lib/platform-settings";
import {
  isUniqueViolation,
  monthsForPeriod,
  nextSubscriptionPeriod,
} from "@/lib/renewal";
import { createSaasCharge } from "@/lib/midtrans/saas";

/**
 * Perpanjangan langganan (PRD §2.C).
 *
 * TIGA hal di sini yang tidak boleh diasumsikan, dan ketiganya pernah jadi
 * sumber kesalahan:
 *
 * 1. **Periode perpanjangan diambil dari invoice langganan terakhir yang
 *    LUNAS, bukan dari `tenants`.** Tenant menyimpan paketnya
 *    (`tenants.plan`) tapi TIDAK menyimpan apakah dia membayar bulanan atau
 *    tahunan -- dan itu yang menentukan periode perpanjangan. Menebak
  *    "selalu bulanan" memberi satu bulan dengan harga satu tahun;
 *    menebak "selalu tahunan" menerbitkan tagihan Rp 5.700.000 untuk
 *    orang yang biasanya membayar Rp 500.000 sebulan.
 *
 * 2. **Harga dibaca dari `effectivePriceMonthly`, bukan dari `PLANS` dan
 *    bukan dari invoice sebelumnya.** Owner boleh mengubah harga paket dari
 *    panel; kalau perpanjangan memakai harga lama, override-nya tidak pernah
 *    berlaku untuk siapa pun kecuali pendaftar baru. Invoice lama tetap
 *    menyimpan nominal lamanya, jadi riwayat tidak ikut berubah.
 *
 * 3. **Tidak ada tenggat otomatis, dan itu disengaja.** Tidak ada kode di
 *    sini yang mematikan langganan yang tidak dibayar. Keputusan "sampai
 *    kapan storefront masih hidup setelah periode habis" belum diambil, dan
 *    cron tidak boleh mengambilnya diam-diam: mematikan toko orang tanpa
 *    persetujuan adalah tindakan yang jauh lebih besar daripada menagih.
 */

export type RenewalFailureReason =
  /** Sudah ada tagihan hidup untuk periode ini. Kondisi NORMAL, bukan error. */
  | "sudah_ada"
  /** Tenant belum pernah membayar, atau langganannya belum aktif. */
  | "belum_lunas"
  | "tenant_tidak_ada"
  /** Midtrans menolak atau tidak bisa dihubungi. */
  | "midtrans_gagal"
  /** `MIDTRANS_SERVER_KEY` kosong. */
  | "tidak_konfigurasi";

export type RenewalResult =
  | {
      ok: true;
      invoiceId: string;
      orderId: string;
      amount: number;
      periodStart: string;
      periodEnd: string;
      /** URL Midtrans, supaya pengrajin bisa membayar dari halaman mana pun. */
      redirectUrl: string;
    }
  | { ok: false; reason: RenewalFailureReason; error: string };

/*
 * Pemeriksaan unique violation ada di `src/lib/renewal.ts`
 * (`isUniqueViolation`), sama seperti pola yang dipakai mesin payout.
 */

/** Kolom `date` disimpan sebagai `YYYY-MM-DD`, bukan objek `Date`. */
function hari(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Kontak owner untuk tagihan. Sama seperti di `addons/actions.ts`. */
async function kontakOwner(tenantId: string) {
  const [owner] = await db
    .select({ fullName: users.fullName, email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "owner")))
    .limit(1);
  return owner ?? null;
}

/**
 * Terbitkan tagihan perpanjangan untuk satu tenant.
 *
 * URUTANNYA penting dan tidak boleh dibalik: cek dulu (jalur cepat),
 * baru insert, baru panggil Midtrans, dan kalau Midtrans gagal invoice-nya
 * DILEPAS.
 *
 * Kenapa invoice harus dilepas saat Midtrans gagal: unique index
 * `saas_invoice_subscription_live_period_uniq` memeriksa status `pending`,
 * jadi invoice `pending` yang menggantung akan MENOLAK perpanjangan
 * berikutnya untuk periode yang sama. Satu gangguan jaringan sesaat, dan
 * tenant itu tidak akan pernah ditagih lagi -- selamanya. Yang dikunci
 * seharusnya "tagihan hidup", dan tagihan yang tidak pernah sampai ke
 * Midtrans bukan tagihan hidup.
 */
export async function createSubscriptionRenewal(
  tenantId: string,
  now: Date,
  /**
   * Asal aplikasi untuk `finishUrl` Midtrans.
   *
   * DIOPERKANNYA, bukan dibaca sendiri dari `headers()`.
   *
   * Versi pertama memanggil `headers()` di dalam fungsi ini, dan itu berarti
   * fungsi penerbit tagihan diam-diam butuh request yang sedang berjalan.
   * Akibatnya ia melempar "headers was called outside a request scope" dari
   * cron yang dijadwalkan manual, dari skrip, dan dari setiap tes -- dan
   * pesannya tidak menyiratkan apa pun soal penyebabnya: pemanggil lupa
   * mengoper URL. Dependensi tersembunyi seperti ini selalu berkembang di
   * tempat yang paling mahal.
   */
  origin: string,
): Promise<RenewalResult> {
  const [tenant] = await db
    .select({
      name: tenants.name,
      plan: tenants.plan,
      subscriptionStatus: tenants.subscriptionStatus,
      subscriptionExpiresAt: tenants.subscriptionExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return {
      ok: false,
      reason: "tenant_tidak_ada",
      error: "Tenant tidak ditemukan.",
    };
  }

  /*
   * Hanya tenant yang langganannya benar-benar aktif. Tenant `pending` --
   * yang tagihan pendaftarannya belum dibayar -- tidak boleh mendapat
   * tagihan kedua, karena itu dua invoice untuk hal yang sama.
   */
  if (tenant.subscriptionStatus !== "active") {
    return {
      ok: false,
      reason: "belum_lunas",
      error: "Langganan belum aktif, tagihan perpanjangan tidak diterbitkan.",
    };
  }

  const [terakhir] = await db
    .select({ period: saasInvoices.period })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.tenantId, tenantId),
        eq(saasInvoices.itemType, "subscription"),
        eq(saasInvoices.status, "paid"),
      ),
    )
    .orderBy(desc(saasInvoices.periodEnd))
    .limit(1);

  if (!terakhir) {
    return {
      ok: false,
      reason: "belum_lunas",
      error: "Belum ada langganan yang pernah dibayar.",
    };
  }

  const bulan = monthsForPeriod(terakhir.period);
  const periode = nextSubscriptionPeriod(now, tenant.subscriptionExpiresAt, bulan);
  const periodStart = hari(periode.start);
  const periodEnd = hari(periode.end);

  /*
   * Pengecekan lebih dulu HANYA sebagai jalur cepat. Yang benar-benar
   * menutup dua proses cron yang tumpang tindih adalah unique index --
   * `if (!ada)` di sini tidak menutup apa pun terhadap balapan, dan cron
   * yang tumpang tindih bukan kasus teoritis.
   */
  const [sudahAda] = await db
    .select({ id: saasInvoices.id })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.tenantId, tenantId),
        eq(saasInvoices.itemType, "subscription"),
        eq(saasInvoices.periodEnd, periodEnd),
        inArray(saasInvoices.status, ["pending", "paid"]),
      ),
    )
    .limit(1);

  if (sudahAda) {
    return {
      ok: false,
      reason: "sudah_ada",
      error: `Sudah ada tagihan untuk periode yang berakhir ${periodEnd}.`,
    };
  }

  const amount = await effectivePriceMonthly(tenant.plan, terakhir.period);
  const orderId = `saas-${tenantId.slice(0, 8)}-${now.getTime()}`;

  let invoiceId: string;
  try {
    const [invoice] = await db
      .insert(saasInvoices)
      .values({
        tenantId,
        plan: tenant.plan,
        period: terakhir.period,
        amount,
        midtransAmount: amount,
        status: "pending",
        isRenewal: true,
        midtransOrderId: orderId,
        periodStart,
        periodEnd,
      })
      .returning({ id: saasInvoices.id });
    invoiceId = invoice.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        reason: "sudah_ada",
        error: `Sudah ada tagihan untuk periode yang berakhir ${periodEnd}.`,
      };
    }
    throw error;
  }

  const owner = await kontakOwner(tenantId);

  try {
    const charge = await createSaasCharge({
      orderId,
      amount,
      customerName: owner?.fullName ?? tenant.name,
      customerEmail: owner?.email ?? "admin@furnitech.id",
      customerPhone: owner?.phone ?? null,
      itemName: `Perpanjangan FurniTech ${PLANS[tenant.plan].label}`,
      finishUrl: `${origin}/dashboard/tagihan`,
    });

    /*
     * URL pembayaran DISIMPAN, bukan dikembalikan saja.
     *
     * Cron tidak punya layar untuk mengarahkan orang ke Midtrans, jadi kalau
     * URL ini hanya dikembalikan ke pemanggil cronline ia dibuang -- dan
     * invoice yang terbit menjadi satu yang tidak bisa dibayar dari mana pun.
     * Notifikasi "tagihan Anda sudah terbit" tanpa jalan melunasnya lebih
     * buruk daripada tidak memberitahu sama sekali: sekarang orang tahu ia
     * berutang dan tidak bisamovement apa pun.
     */
    await db
      .update(saasInvoices)
      .set({ midtransRedirectUrl: charge.redirectUrl })
      .where(eq(saasInvoices.id, invoiceId));

    return {
      ok: true,
      invoiceId,
      orderId,
      amount,
      periodStart,
      periodEnd,
      redirectUrl: charge.redirectUrl,
    };
  } catch (error) {
    /*
     * Lepas invoice-nya, JANGAN hanya menandainya `failed` dengan
     * `midtransOrderId` utuh.
     *
     * Order itu tidak pernah sampai ke Midtrans, jadi menyimpan
     * `order_id`-nya membuat baris ini tampak punya tagihan yang bisa
     * dibayar padahal tidak. `null` lolos unique index
     * `saas_invoice_midtrans_idx` (Postgres mengizinkan banyak NULL), dan
     * status `failed` membebaskan periode supaya run berikutnya bisa
     * mencoba lagi.
     *
     * Baris ini TIDAK dihapus: jejaknya tetap ada untuk jawaban "kenapa
     * tagihan tidak terbit", dan menghapusnya membuat pertanyaan itu tidak
     * punya jawaban.
     */
    await db
      .update(saasInvoices)
      .set({ status: "failed", midtransOrderId: null })
      .where(eq(saasInvoices.id, invoiceId));

    const belumKonfigurasi = !process.env.MIDTRANS_SERVER_KEY?.trim();
    console.error("Gagal membuat tagihan perpanjangan:", error);
    return {
      ok: false,
      reason: belumKonfigurasi ? "tidak_konfigurasi" : "midtrans_gagal",
      error: (error as Error).message.slice(0, 300),
    };
  }
}
