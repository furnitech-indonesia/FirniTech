import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { ORDER_ID_PREFIX, nextDomainPeriod } from "@/lib/addons";
import { isUniqueViolation, shouldIssueRenewal } from "@/lib/renewal";
import { effectiveAddonPriceNumber } from "@/lib/addons/settings";
import { createSaasCharge } from "./saas";

/**
 * Pembuatan tagihan add-on: custom domain dan paket pendirian PT.
 *
 * Berdiri sendiri dari `saas.ts` karena dua alasan, keduanya soal bentuk
 * tagihan:
 *
 * 1. **Tagihan domain bergantung pada `tenants`, bukan pada FormData.**
 *    Harga, tenant, dan periode semuanya dibaca dari database. Kalau harga
 *    datang dari klien, orang bisa membeli domain seharga satu rupiah --
 *    dan karena marjinnya Rp 61.333 per invoice, itu bukan bug kecil: satu
 *   saja cukup untuk menutup seluruh laba add-on dalam 4,2 tahun.
 *
 * 2. **Tagihan legalitas tidak punya paket.** `saasInvoices.plan` nullable
 *    supaya baris ini tidak perlu mengarang "paket basic" demi memenuhi
 *    kolom yang tadinya NOT NULL.
 */

/**
 * Alasan kegagalan, supaya pemanggil bisa membedakan kondisi NORMAL dari
 * masalah sungguhan.
 *
 * Tanpa ini, pemanggil harus menebak dari teks pesan -- dan tebakan itu
 * yang membuat cron mencatat "sudah ada tagihan" sebagai kegagalan 30 kali
 * sehari per tenant, sampai tidak ada yang lagi membaca lognya.
 */
export type AddonFailureReason =
  /** Sudah ada invoice hidup untuk periode ini. NORMAL, bukan error. */
  | "sudah_ada"
  /** Midtrans menolak atau tidak bisa dihubungi. */
  | "midtrans_gagal"
  /** Database menolak menyimpan invoice. */
  | "gagal_menyimpan"
  /** Tagihan tidak boleh dibuat sama sekali (mis. domain belum terverifikasi). */
  | "tidak_eligible"
  /** Di luar jendela perpanjangan: periode belum mendekati habis. */
  | "di_luar_jendela";

export type CreateAddonResult =
  | { ok: true; redirectTo: string; amount: number; invoiceId: string }
  | { ok: false; error: string; reason?: AddonFailureReason };

/**
 * Origin dari Host request.
 *
 * `NEXT_PUBLIC_APP_URL` di-inline saat build, jadi satu build untuk lokal
 * dan Vercel akan mengarahkan orang ke domain yang tidak melayani
 * tagihannya -- pola yang sama sudah pernah jadi bug di `createCheckoutOrder`.

/**
 * `dom-<tenant>-<timestamp>` atau `leg-<tenant>-<timestamp>`.
 *
 * Tanda hubung setelah prefix itu WAJIB dan bukan gaya penulisan: webhook
 * mengenali jenis tagihan dengan `orderId.startsWith(prefix)`, dan prefix
 * `leg-` yang ditulis sebagai `leg` tidak akan cocok dengan apa pun.
 * Versi pertama menulis `${prefix}${tenantId}` dan hasilnya `leg5f64b9f7-`,
 * yang `startsWith("leg-")` bernilai FALSE -- jadi setiap invoice legalitas
 * diam-diam jatuh ke cabang langganan dan memberi satu tahun gratis.
 * `test:addons` menangkapnya, tapi hanya karena ia mengirim orderId yang
 * benar-benar terpotret dari kode.
 */
function addonOrderId(prefix: string, tenantId: string, now: Date): string {
  return `${prefix}-${tenantId.slice(0, 8)}-${now.getTime()}`;
}

/* ------------------------------------------------------------------ *
 * Add-on custom domain
 * ------------------------------------------------------------------ */

export async function createDomainInvoice(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string | null;
  finishUrl: string;
}): Promise<CreateAddonResult> {
  const [tenant] = await db
    .select({
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, input.tenantId))
    .limit(1);

  if (!tenant?.customDomain) {
    return { ok: false, error: "Domain belum diatur untuk toko ini." };
  }
  if (!tenant.customDomainVerified) {
    return {
      ok: false,
      error: "Domain belum terverifikasi. Atur DNS dulu sebelum membayar.",
    };
  }

  const now = new Date();
  const period = nextDomainPeriod(now, tenant.customDomainExpiresAt);
  const orderId = addonOrderId(ORDER_ID_PREFIX.domain, input.tenantId, now);
  const price = await effectiveAddonPriceNumber("domain");

  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: input.tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: price,
      midtransAmount: price,
      status: "pending",
      midtransOrderId: orderId,
      periodStart: toDate(period.start),
      periodEnd: toDate(period.end),
    })
    .returning();

  const charge = await createSaasCharge({
    orderId,
    amount: price,
    customerName: input.tenantName,
    customerEmail: input.email,
    customerPhone: input.phone,
    itemName: `Custom domain ${tenant.customDomain} (12 bulan)`,
    finishUrl: input.finishUrl,
  });

  return {
    ok: true,
    redirectTo: charge.redirectUrl,
    amount: price,
    invoiceId: invoice.id,
  };
}

/* ------------------------------------------------------------------ *
 * Add-on Paket Pendirian PT Perorangan
 * ------------------------------------------------------------------ */

export async function createLegalitasInvoice(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string | null;
  finishUrl: string;
}): Promise<CreateAddonResult> {
  const now = new Date();
  const orderId = addonOrderId(ORDER_ID_PREFIX.legalitas, input.tenantId, now);
  const price = await effectiveAddonPriceNumber("legalitas");

  // Sekali bayar: periode = satu hari. `period_end` wajib NOT NULL, dan
  // memberikan periode 12 bulan di sini akan membuat webhook yang salah
  // terlihat benar -- bukan itu yang kita mau.
  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: input.tenantId,
      itemType: "legalitas",
      plan: null,
      period: "monthly",
      amount: price,
      midtransAmount: price,
      status: "pending",
      midtransOrderId: orderId,
      periodStart: toDate(now),
      periodEnd: toDate(now),
    })
    .returning();

  const charge = await createSaasCharge({
    orderId,
    amount: price,
    customerName: input.tenantName,
    customerEmail: input.email,
    customerPhone: input.phone,
    itemName: "Paket Pendirian PT Perorangan",
    finishUrl: input.finishUrl,
  });

  return {
    ok: true,
    redirectTo: charge.redirectUrl,
    amount: price,
    invoiceId: invoice.id,
  };
}

/* ------------------------------------------------------------------ *
 * Renewal domain (dipanggil cron)
 * ------------------------------------------------------------------ */

/**
 * Buat invoice perpanjangan untuk satu tenant.
 *
 * Sengaja accepts `now` supaya bisa diuji tanpa menunggu tanggal tertentu.
/**
 * Buat invoice perpanjangan domain untuk satu tenant (dipanggil cron).
 *
 * KEMBALIANNYA TIDAK PERNAH MELEMPAR, dan itu bukan pilihan gaya. Versi
 * pertama melempar apa adanya, dan dua-duanya merusak:
 *
 * - Unique index menolak insert kedua untuk periode yang sama -- dan
 *   `period_start` untuk renewal domain SELALU sama, karena
 *   `nextDomainPeriod` melanjutkan dari `custom_domain_expires_at`, bukan
 *   dari hari cron berjalan. Cron harian dengan jendela 30 hari berarti
 *   panggilan kedua PASTI ditolak. Kalau itu dilempar, satu exception di
 *   tenant pertama membatalkan seluruh loop: 999 tenant berikutnya tidak
 *   pernah ditagih, dan yang terlihat hanya 500 di log cron.
 * - Kalau Midtrans menolak setelah invoice dibuat, invoice `pending`
 *   tertinggal dan memblokir perpanjangan berikutnya secara permanen.
 */
export async function createDomainRenewal(
  tenantId: string,
  now: Date,
  /**
   * Asal aplikasi untuk `finishUrl` Midtrans.
   *
   * Dioperkan, bukan dibaca sendiri dari `headers()` -- alasannya sama
   * seperti di `createSubscriptionRenewal`: fungsi penerbit tagihan tidak
   * boleh diam-diam butuh request yang sedang berjalan.
   */
  origin: string,
): Promise<CreateAddonResult> {
  const [tenant] = await db
    .select({
      name: tenants.name,
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.customDomain || !tenant.customDomainVerified) {
    return { ok: false, error: "Domain tidak bisa diperpanjang." };
  }

  /*
   * Jendela perpanjangan diperiksa DI DALAM fungsi ini, bukan hanya di cron.
   *
   * Cron memang sudah menyaring, jadi baris ini terlihat berlebihan --
   * tapi tidak: tanpa baris ini, satu pemanggilan dari mana pun (skrip
   * manual, panel admin, cron yangOTHER-nya) bisa menerbitkan tagihan
   * untuk periode yang masih 8 bulan lagi. Tagihan yang terbit sebelum
   * waktunya adalah tagihan yang tidakNetflixMC seen oleh pengrajin, dan
   * kalau ia dibayar hari itu juga, 11 bulan langganannya hangus.
   *
   * `shouldIssueRenewal` yang dipakai, bukan perbandingan manual, karena
   * nilai 30 hari itu juga yang dipakai untuk menghitung "jatuh tempo
   * dalam N hari" di halaman tagihan. Dua angka yang berbeda di dua tempat
   * berarti keduanya tidak cocok dengan tagihan yang benar-benar terbit.
   */
  if (!shouldIssueRenewal(now, tenant.customDomainExpiresAt)) {
    return {
      ok: false,
      error: "Domain belum masuk periode perpanjangan.",
      reason: "di_luar_jendela",
    };
  }

  // `period_start` untuk renewal adalah periode yang SEHARUSNYA berakhir --
  // bukan hari invoice dibuat. Kalau invoice terbit 20 hari sebelum periode
  // habis dan periode barunya dihitung dari `now`, pengrajin kehilangan 20
  // hari yang sudah dibayar. `nextDomainPeriod` sudah menangani keduanya:
  // lanjut dari periode lama kalau masih berjalan, mulai dari `now` kalau
  // sudah lewat.
  const period = nextDomainPeriod(now, tenant.customDomainExpiresAt);
  const periodStart = toDate(period.start);
  const periodEnd = toDate(period.end);

  // Jalur cepat. Yang menutup dua proses cron yang tumpang tindih adalah
  // unique index di database, bukan baris ini.
  const [sudahAda] = await db
    .select({ id: saasInvoices.id })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.tenantId, tenantId),
        eq(saasInvoices.itemType, "domain"),
        eq(saasInvoices.periodStart, periodStart),
        inArray(saasInvoices.status, ["pending", "paid"]),
      ),
    )
    .limit(1);

  if (sudahAda) {
    return {
      ok: false,
      error: `Sudah ada tagihan perpanjangan untuk periode ${periodStart}.`,
      reason: "sudah_ada",
    };
  }

  const orderId = addonOrderId(ORDER_ID_PREFIX.domain, tenantId, now);
  const price = await effectiveAddonPriceNumber("domain");

  let invoiceId: string;
  try {
    const [invoice] = await db
      .insert(saasInvoices)
      .values({
        tenantId,
        itemType: "domain",
        plan: null,
        period: "yearly",
        amount: price,
        midtransAmount: price,
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
        error: `Sudah ada tagihan perpanjangan untuk periode ${periodStart}.`,
        reason: "sudah_ada",
      };
    }
    // Kegagalan lain TIDAK boleh disamarkan jadi "sudah ada" -- itu membuat
    // masalah nyata terlihat seperti kondisi normal.
    return {
      ok: false,
      error: `Gagal menyimpan tagihan: ${(error as Error).message.slice(0, 200)}`,
      reason: "gagal_menyimpan",
    };
  }

  const [owner] = await db
    .select({ fullName: users.fullName, email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "owner")))
    .limit(1);

  try {
    const charge = await createSaasCharge({
      orderId,
      amount: price,
      customerName: owner?.fullName ?? tenant.name,
      customerEmail: owner?.email ?? "admin@furnitech.id",
      customerPhone: owner?.phone ?? null,
      itemName: `Perpanjangan domain ${tenant.customDomain}`,
      finishUrl: `${origin}/dashboard/tagihan`,
    });

    // Disimpan supaya halaman tagihan punya tujuan untuk invoice yang
    // terbit dari cron. Tanpa ini, invoice renewal domain tidak bisa dibayar
    // dari mana pun -- lihat `createSubscriptionRenewal` untuk penjelasan
    // panjangnya.
    await db
      .update(saasInvoices)
      .set({ midtransRedirectUrl: charge.redirectUrl })
      .where(eq(saasInvoices.id, invoiceId));

    return {
      ok: true,
      redirectTo: charge.redirectUrl,
      amount: price,
      invoiceId,
    };
  } catch (error) {
    /*
     * Lepas invoice-nya supaya periode berikutnya bisa dicoba lagi.
     * `midtransOrderId` ikut dikosongkan karena order itu tidak pernah
     * sampai ke Midtrans -- penjelasan panjang ada di
     * `createSubscriptionRenewal` (src/lib/midtrans/renewal.ts).
     */
    await db
      .update(saasInvoices)
      .set({ status: "failed", midtransOrderId: null })
      .where(eq(saasInvoices.id, invoiceId));

    return {
      ok: false,
      error: `Midtrans menolak: ${(error as Error).message.slice(0, 200)}`,
      reason: "midtrans_gagal",
    };
  }
}

function toDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
