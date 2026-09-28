import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/plans";
import { effectiveAddonPriceNumber } from "@/lib/addons/settings";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Onboarding owner: membuat akun Supabase, tenant, dan tagihan pertama.
 *
 * KENAPA FILE INI BUKAN "use server" (meski ROADMAP menyebut `provisionOwner()`
 * di `src/lib/auth/actions.ts`):
 *
 * Setiap export dari berkas `"use server"` menjadi **endpoint HTTP** yang bisa
 * dipanggil siapa saja, dengan argumen yang mereka pilih sendiri. Kalau
 * `provisionOwner(input)` diekspor dari sana, siapa pun bisa memintanya
 * membuat akun owner untuk tenant mana pun, tanpa perlu email terverifikasi
 * dan tanpa perlu membayar. Itu bukan bug kecil — itu pendaftaran owner
 * gratis untuk siapa saja.
 *
 * Jadi pemanggilnya (`registerOwner` di actions.ts) tetap Server Action yang
 * tervalidasi, sedangkan Provisioning-nya function server biasa yang tidak
 * bisa dipanggil langsung. Bedanya satu baris `export`, tapi bedanya adalah
 * "@/` bebas" vs "butuh pembayaran".
 */

export type ProvisionInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  workshopName: string;
  slug: string;
  plan: PlanId;
  period: "monthly" | "yearly";
  /**
   * Paket Pendirian PT Perorangan dibeli sekalian di langkah paket (PRD §2.E).
   *
   * `false` berarti TIDAK ADA invoice legalitas sama sekali. Bukan invoice
   *Rp 0: tagihan Rp 0 yang tercatat adalah barang yang tidak bisa dibaca
   * bedanya dari barang yang ditagih dan tidak dibayar.
   */
  tambahLegalitas: boolean;
};

export type ProvisionFailure = {
  ok: false;
  /** Pesan untuk pengguna. Tidak pernah berisi detail internal. */
  error: string;
  /** Field yang perlu disorot, kalau kegagalan bisa dilacak ke field tertentu. */
  fieldErrors?: Record<string, string>;
};

export type ProvisionSuccess = {
  ok: true;
  tenantId: string;
  invoiceId: string;
  /** Tagihan sudah tercatat di Midtrans; pengguna tinggal membayar. */
  midtransOrderId: string;
  /** Total yang harus dikirim ke Midtrans: langganan + add-on, kalau ada. */
  amount: number;
  /**
   * Nominal langganan saja, TANPA add-on.
   *
   * Dipakai untuk mencetak label invoice, yang menjelaskan APA yang dibeli.
   * Kalau
   * `itemName` memakai `amount` dan isinya sudah termasuk add-on, pengguna
   * melihat "FurniTech Pro bulanan" di halaman pembayaran dengan nominal
   * Rp 1.250.000 -- dan tidak ada baris yang menjelaskan selisihnya.
   */
  langgananAmount: number;
  /** Invoice legalitas yang dibuat bareng, kalau ada. */
  legalitasInvoiceId: string | null;
};

export type ProvisionResult = ProvisionSuccess | ProvisionFailure;

function addMonths(from: Date, months: number): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** Periode tagihan dalam hitungan hari, mengikuti `PLANS`. */
function periodMonths(period: "monthly" | "yearly"): number {
  return period === "yearly" ? 12 : 1;
}

/** Kolom `date` disimpan sebagai `YYYY-MM-DD`, bukan objek Date. */
function toTanggal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Slug masih bisa taken antara pemeriksaan di wizard dan saat disimpan —
 * `tenant_slug_idx` adalah unique index, jadi balapan itu nyata, bukan
 * teoritis. Handle di sini bersifat definitif: index yang menang, dan
 * pemanggil membaca pesan PostgreSQL-nya.
 */
function isSlugConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("tenant_slug_idx") ||
    (message.includes("duplicate key") && message.includes("slug"))
  );
}

/**
 * Satu-satunya tempat tenant & owner dibuat. WAJIB dipanggil dari Server
 * Action yang sudah divalidasi skemanya.
 *
 * Urutan langkah penting dan tidak boleh dibalik:
 *   1. Buat user Supabase. Trigger `handle_new_user` sudah membuat baris
 *      `users` dengan `role = admin_penjualan` dan `tenant_id = NULL`; itu
 *      yang membuat role tidak bisa dipalsukan lewat `raw_user_meta_data`.
 *   2. Tulis tenant (`isActive = false`, `subscriptionStatus = 'pending'`) dan
 *      tagihan, lalu perbarui baris `users` itu menjadi `owner` + tenantId,
 *      semuanya dalam satu transaksi. Baris yang diperbarui, bukan insert
 *      baru — kalau insert, bentrok dengan `users_pkey` dan menyisakan dua
 *      baris untuk satu orang.
 *
 * Tenant TIDAK diaktifkan di sini. Yang menyalakannya adalah webhook Midtrans
 * (app/api/webhooks/midtrans), jadi satu-satunya jalan menuju "langganan
 * aktif" tetap uangnya benar-benar masuk.
 *
 * INVOICE ADD-ON YANG DIBAYAR BARENG (PRD §2.E): kalau pemilik toko memilih
 * Paket Pendirian PT di langkah paket, DUA invoice dibuat dalam satu
 * transaksi dan dibayar dengan SATU charge. Yang menautkannya adalah
 * `bundledWith` + `midtransAmount` (migrasi 0025), bukan `order_id` yang
 * sama -- lihat penjelasan lengkapnya di `app/api/webhooks/midtrans/route.ts`.
 *
 * SOAL KREDENTIAL MIDTRANS YANG KOSONG: provisioning TIDAK berhenti hanya
 * karena `MIDTRANS_SERVER_KEY` belum diisi. Tenant tetap dibuat dan ditandai
 * `pending`; `registerOwner` yang menentukan apa yang ditunjukkan ke
 * pengguna. Alasannya, ada dua akibat yang lebih buruk daripada berhenti
 * total:
 *   - Menolak pendaftaran membuat wizard tidak bisa diuji sama sekali di
 *     lingkungan mana pun yang kredensialnya belum terisi.
 *   - Pendaftaran yang berhasil lalu gagal di langkah pembayaran menyisakan
 *     akun yang emailnya sudah terpakai, jadi tidak bisa diulang.
 * Yang dipisah di sini adalah "provisioning berhasil" dari "pembayaran
 * terkonfigurasi", lalu keduanya dilaporkan jujur ke pengguna. Tenant seperti
 * ini bisa diaktifkan manual lewat panel super admin.
 */
export async function provisionOwner(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const admin = createSupabaseAdmin();

  // 1. Akun Supabase. `email_confirm: true` supaya pengguna bisa langsung
  //    masuk setelah membayar — tanpa email konfirmasi, alurnya berhenti di
  //    inbox dan tenant menua sebagai `pending`.
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });

  if (createError || !created.user) {
    const message = createError?.message ?? "Gagal membuat akun.";
    const alreadyExists =
      message.includes("already") && message.includes("registered");

    return {
      ok: false,
      error: alreadyExists
        ? "Email ini sudah terdaftar. Masuk dengan email tersebut, atau pakai email lain."
        : "Gagal membuat akun. Coba lagi sebentar.",
      fieldErrors: alreadyExists ? { email: "Email sudah terdaftar." } : undefined,
    };
  }

  const userId = created.user.id;

  // 2-4. Tenant, owner, dan tagihan. Empat hal yang tidak boleh terpisah:
  //     kalau tenant tertulis tanpa invoice, tidak ada yang bisa ditagih;
  //     kalau invoice tanpa tenant, tidak ada yang bisa diaktifkan.
  const amount =
    input.period === "yearly"
      ? PLANS[input.plan].priceYearly
      : PLANS[input.plan].priceMonthly;

  const now = new Date();
  const periodEnd = addMonths(now, periodMonths(input.period));
  // Saat pending, kolom ini baru berisi tanggal mulai yang AKAN berlaku.
  // Nilainya baru berarti setelah webhook mengaktifkan tenant.
  const periodStart = now;

  /*
   * Harga add-on dibaca di sini, dari server, BUKAN dari FormData.
   *
   * Owner bisa mengubah harga add-on dari panel (migrasi 0024), jadi angka
   * yang tampil di wizard bisa berbeda dari `LEGALITAS_ADDON.price`. Yang
   * ditagih harus yang berlaku sekarang, dan yang berlaku sekarang hanya
   * bisa dibaca dari database.
   */
  const legalitasAmount = input.tambahLegalitas
    ? await effectiveAddonPriceNumber("legalitas")
    : 0;
  const totalDitagih = amount + legalitasAmount;

  // Punya payor, harus punya tagihan yang bisa dicari lewat order_id.
  const midtransOrderId = `saas-${userId.slice(0, 8)}-${now.getTime()}`;

  try {
    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: input.workshopName,
          slug: input.slug,
          plan: input.plan,
          subscriptionStatus: "pending",
          subscriptionExpiresAt: periodStart,
          // Dinyalakan webhook, bukan di sini.
          isActive: false,
        })
        .returning();

      // Baris `users` sudah ada (dibuat trigger). Update, bukan insert.
      const [profile] = await tx
        .update(users)
        .set({
          role: "owner",
          tenantId: tenant.id,
          fullName: input.fullName,
          phone: input.phone,
        })
        .where(and(eq(users.id, userId), isNull(users.tenantId)))
        .returning();

      if (!profile) {
        // `tenant_id IS NULL` tidak cocok. Dua kemungkinan: barisnya tidak
        // ada (trigger tidak berjalan) atau sudah terikat tenant lain.
        // Keduanya berarti kondisi tidak seperti yang diharapkan, jadi
        // transaksi dibatalkan.
        throw new Error(
          "Baris profil untuk pengguna baru tidak ditemukan atau sudah terikat tenant lain.",
        );
      }

      /*
       * `midtransAmount` = `totalDitagih`, bukan `amount`.
       *
       * Kalau Paket Pendirian PT dibeli sekalian, Midtrans menerima SATU
       * charge untuk kedua invoice. `gross_amount` di notifikasi nanti
       * adalah penjumlahannya, jadi inilah yang harus dibandingkan webhook.
       * Dan kalau add-onnya tidak diambil, nilainya tetap sama dengan
       * `amount` -- tidak ada jalur kode yang menghasilkan tagihan
       * wikipedia tanpa add-on.
       */
      const [invoice] = await tx
        .insert(saasInvoices)
        .values({
          tenantId: tenant.id,
          plan: input.plan,
          period: input.period,
          amount,
          midtransAmount: totalDitagih,
          status: "pending",
          midtransOrderId,
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
        })
        .returning();

      /*
       * Invoice add-on yang dibayar bareng (PRD §2.E).
       *
       * `midtransOrderId` sengaja NULL. Order-nya milik invoice langganan,
       * dan `saas_invoice_midtrans_idx` adalah UNIQUE -- dua baris dengan
       * order_id yang sama membuat webhook tidak bisa tahu invoice mana
       * yang harus ditulis. Yang menautkannya adalah `bundledWith`.
       *
       * `period` satu hari, sama seperti `createLegalitasInvoice`. Periode
       * 12 bulan di sini akan membuat invoice ini masuk MRR DAN terlihat
       * seperti langganan yang sudah dibayar -- dan `legalitas` bukan
       * pendapatan berulang sama sekali.
       */
      const [legalitasInvoice] = legalitasAmount
        ? await tx
            .insert(saasInvoices)
            .values({
              tenantId: tenant.id,
              itemType: "legalitas",
              plan: null,
              period: "monthly",
              amount: legalitasAmount,
              midtransAmount: legalitasAmount,
              status: "pending",
              bundledWith: invoice.id,
              periodStart: toTanggal(now),
              periodEnd: toTanggal(now),
            })
            .returning()
        : [undefined];

      return { tenant, invoice, legalitasInvoice };
    });

    return {
      ok: true,
      tenantId: result.tenant.id,
      invoiceId: result.invoice.id,
      midtransOrderId,
      amount: totalDitagih,
      langgananAmount: amount,
      legalitasInvoiceId: result.legalitasInvoice?.id ?? null,
    };
  } catch (error) {
    // Kompensasi: hapus user Auth yang barusan dibuat, supaya emailnya bisa
    // dipakai ulang. Tenant & invoice ikut hilang lewat cascade karena
    // transaksi di atas sudah rollback.
    //
    // Batasnya: kompensasi ini TIDAK membatalkan tagihan di sisi Midtrans
    // kalau kegagalannya terjadi setelah Midtrans sudah menerima request.
    // Karena itu `midtransOrderId` tetap dicatat di log audit, dan admin
    // bisa mencocokkannya manual kalau tagihan yatim muncul di Midtrans.
    await admin.auth.admin
      .deleteUser(userId)
      .catch((cleanupError: unknown) => {
        console.error(
          "Gagal menghapus user Auth setelah provisioning gagal:",
          cleanupError,
        );
      });

    if (isSlugConflict(error)) {
      return {
        ok: false,
        error: "Slug workshop sudah dipakai workshop lain. Pilih slug lain.",
        fieldErrors: { slug: "Slug sudah dipakai." },
      };
    }

    console.error("Provisioning owner gagal:", error);
    return {
      ok: false,
      error: "Pendaftaran gagal. Tidak ada akun yang dibuat, silakan coba lagi.",
    };
  }
}

/**
 * Slug masih tersedia? Untuk live preview di langkah 2.
 *
 * SANGAT SENGaja hanya memberi jawaban ya/tidak, tidak pernah menyebut tenant
 * mana yang memakainya. Slug yang sudah dipakai = subdomain yang akan dipakai
 * orang, jadi membocorkan pemiliknya berarti memberi enumerasi pelanggan
 * FurniTech ke publik.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return !row;
}
