import { pgEnum } from "drizzle-orm/pg-core";

/* ==========================================
   1. ENUMS (Tipe Data Konstan)
   ========================================== */

/** Paket langganan SaaS FurniTech (PRD §2.A — tanpa free trial). */
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "pro",
  "max",
]);

/**
 * Status langganan tenant. `past_due` = Midtrans gagal, `expired` = lewat periode.
 *
 * `pending` (2026-09-27) = tenant sudah dibuat tapi pembayarannya belum masuk.
 * Nilai ini wajib ada: tanpa itu, wizard pendaftaran akan memakai `active`
 * untuk tenant yang belum membayar, dan orang bisa masuk back-office tanpa
 * pernah transfer uang. `tenants.isActive` sengaja tidak dipakai untuk ini —
 * ia menandai "akun boleh dipakai", sedangkan `subscriptionStatus` menandai
 * "sudah dibayar". Dua hal berbeda, dua kolom berbeda.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "past_due",
  "canceled",
  "expired",
]);

/**
 * Peran pengguna. `super_admin` milik FurniTech sebagai SaaS owner
 * (tenantId NULL), empat lainnya milik pengrajin.
 * PENTING: tidak ada default — role harus selalu dipilih eksplisit.
 *
 * `kurir` (2026-09-27) — Peran dengan akses paling sempit di seluruh sistem:
 * hanya melihat pengiriman yang ditugaskan kepadanya, dan satu-satunya yang
 * boleh ia lakukan adalah mengunggah bukti barang diterima plus tanda tangan
 * pembeli. Tidak ada katalog, tidak ada keuangan, tidak ada pesanan lain —
 * bukan karena disembunyikan, tapi karena RLS memang tidak meloloskan baris
 * yang bukan miliknya.
 *
 * Peran ini dipisah dari `tukang` dengan sengaja. Tukang bekerja di bengkel
 * dan butuh melihat seluruh antrean produksi; kurir ada di jalan dan butuh
 * satu hal saja. Menggabungkannya akan memaksa kurir melihat data produksi
 * yang tidak boleh ia lihat, dan memaksa tukang masuk ke alur pengiriman.
 */
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "owner",
  "admin_penjualan",
  "tukang",
  "kurir",
]);

/** Status siklus hidup pesanan (bukan status pembayaran). */
export const orderStatusEnum = pgEnum("order_status", [
  "pending_dp",
  "in_production",
  "quality_control",
  "ready_to_ship",
  "shipped",
  "completed",
  "cancelled",
]);

/** Status pembayaran; `dp_paid` = DP masuk, sisanya menunggu pelunasan. */
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "dp_paid",
  "fully_paid",
  "refunded",
]);

/**
 * Tahapan Visual Progress Tracker yang diunggah tukang.
 * Pemetaan stage -> order_status hidup di src/lib/order-status.ts
 * (bukan di sini) supaya jadi satu sumber kebenaran.
 */
export const progressStageEnum = pgEnum("progress_stage", [
  "bahan_dipotong",
  "perakitan",
  "finishing",
  "qc",
  "packing",
]);

/** Slot jadwal payout IRIS. UTC: 06:00 WIB = 23:00 UTC (hari sebelumnya), 18:00 WIB = 11:00 UTC. */
/**
 * Status verifikasi rekening pengrajin (Sprint 6).
 *
 * `unverified` adalah keadaan paling sering, bukan kondisi kesalahan: rekening
 * disimpan tapi belum diperiksa, karena `MIDTRANS_IRIS_API_KEY` belum diisi atau
 * layanan sedang tidak bisa dihubungi. Itu BUKAN alasan menolak menyimpan
 * rekening — alasannya, rekening yang tidak bisa diverifikasi hanya membuat
 * pencairan ditahan, sedangkan rekening yang tidak tersimpan membuat pengrajin
 * tidak bisa menarik uangnya sama sekali.
 *
 * `failed` menyimpan alasannya di `tenants.bankAccountValidationMessage`,
 * karena "diverifikasi dan ditolak" berarti pengrajin harus memperbaiki
 * rekeningnya, sedangkan "belum sempat dicek" tidak.
 */
export const bankAccountStatusEnum = pgEnum("bank_account_status", [
  "unverified",
  "verified",
  "failed",
]);

/**
 * Metode pembayaran sebuah pesanan (Sprint 6).
 *
 * PENTING untuk mesin payout: `cod` TIDAK PERNAH ikut dicairkan. Pada COD,
 * uangnya sudah diterima langsung oleh kurir atau ditransfer langsung ke
 * rekening pengrajin — jadi kalau pesanan COD ikut masuk payout, pengrajin
 * akan menerima uang yang sama dua kali. `payout_items` bahkan tidak akan
 * menyentuhnya karena `orders.payment_method` dipakai sebagai syarat
 * kelayakan, tapi kolomnya tetap ada karena checkout dan halaman lacak
 * membutuhkannya.
 */
export const paymentMethodEnum = pgEnum("payment_method", [
  "va",
  "cod",
]);


/**
 * Status satu payout.
 *
 * `blocked` DITAMBAHKAN pada Sprint 6, dan itu bukan detail kecil. Tanpa
 * itu, penolakan kita sendiri (rekening belum terverifikasi, saldo belum
 * cukup) akan tercampur jadi satu dengan penolakan bank — dan itu dua
 * masalah yang sepenuhnya berbeda, dengan dua tindakan yang sepenuhnya
 * berbeda. Keduanya harus terlihat oleh owner tanpa perlu membaca log server.
 *
 * `processing` dipakai selama panggilan ke Payouts berjalan. Ada karena
 * request HTTP bisa menggantung, dan tanpa status ini payout yang sedang
 * berjalan terlihat sama dengan yang belum pernah mencoba.
 */
export const payoutStatusEnum = pgEnum("payout_status", [
  "queued",
  "processing",
  "success",
  "failed",
  "blocked",
]);

/** Siklus penagihan langganan SaaS (PRD §2.A ada opsi tahunan). */
export const billingPeriodEnum = pgEnum("billing_period", [
  "monthly",
  "yearly",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

/**
 * Jenis tagihan di `saas_invoices` (PRD §2.D dan §2.E, migrasi 0023).
 *
 * Default `subscription` supaya baris yang sudah ada tidak berubah
 * artinya dan sisipkan tanpa kolom ini tetap aman.
 *
 * `legalitas` bukan langganan dan bukan domain: paket pendirian PT
 * Perorangan dibayar SEKALI, dan invoice-nya tidak boleh menyentuh periode
 * langganan sama sekali. Webhook yang menjaga aturan itu ada di
 * `app/api/webhooks/midtrans/route.ts`.
 */
export const saasInvoiceItemTypeEnum = pgEnum("saas_invoice_item_type", [
  "subscription",
  "domain",
  "legalitas",
]);

/**
 * Status add-on custom domain.
 *
 * Pisah dari `saas_invoices.status` karena keduanya menjawab pertanyaan
 * berbeda: `status` menjawab "sudah dibayar?", yang ini menjawab "domainnya
 * hidup?". Invoice bisa lunas sementara domainnya sudah suspended.
 */
export const customDomainStatusEnum = pgEnum("custom_domain_status", [
  "unpaid",
  "active",
  "suspended",
]);

/** Integrasi pihak ketiga yang diaudit di Super Admin Panel (ROADMAP Sprint 2). */
export const integrationServiceEnum = pgEnum("integration_service", [
  "midtrans",
  "iris",
  "cloudflare",
  "fonnte",
  "firebase",
  "supabase",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "success",
  "failed",
]);

/** Kanal notifikasi; kuota WA per paket dicatat di tabel notification_usage. */
export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "push",
]);

/** Alasan perubahan stok bahan baku — dipakai untuk jejak audit inventaris. */
export const materialAdjustmentReasonEnum = pgEnum(
  "material_adjustment_reason",
  [
    "pembelian", // pembelian baru dari pemasok
    "pemakaian", // dipakai untuk produksi
    "rusak", // kerusakan / cacat
    "koreksi", // koreksi hasil hitung fisik (stock opname)
    "retur", // retur dari customer
  ],
);

/** Status percakapan untuk triase Inbox CS (ROADMAP Sprint 3). */
export const conversationStatusEnum = pgEnum("conversation_status", [
  "open", // baru / belum ditangani
  "pending", // menunggu pembeli
  "resolved", // selesai
]);

/** Sumber pesanan: dari storefront atau dicatat staf (Custom Order Builder). */
export const orderSourceEnum = pgEnum("order_source", [
  "storefront",
  "manual",
]);
