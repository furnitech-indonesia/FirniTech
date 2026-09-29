import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  billingPeriodEnum,
  integrationServiceEnum,
  integrationStatusEnum,
  invoiceStatusEnum,
  notificationChannelEnum,
  saasInvoiceItemTypeEnum,
  subscriptionPlanEnum,
} from "./enums";
import { tenants } from "./tenants";

/* ==========================================
   8. BILLING SAAS & AUDIT (ROADMAP Sprint 2)
   ========================================== */

/**
 * Tagihan langganan SaaS (Basic/Pro/Max, bulanan atau tahunan).
 * tenants.plan hanya menyimpan state saat ini; histori pembayaran,
 * renewal, dan upgrade plan harus terekam di sini agar MRR bisa dihitung.
 */
export const saasInvoices = pgTable(
  "saas_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /**
     * NULL untuk invoice add-on (domain / legalitas).
     *
     * Semula NOT NULL, jadi invoice add-on dipaksa mengarang salah satu dari
     * basic/pro/max -- dan itu membohongi data: tagihan Rp 250.000 domain
     * akan tercatat sebagai "paket basic". NULL lebih jujur.
     */
    plan: subscriptionPlanEnum("plan"),
    period: billingPeriodEnum("period").notNull(),
    /**
     * Jenis tagihan. `subscription` = paket; `domain` = add-on custom
     * domain tahunan; `legalitas` = paket pendirian PT Perorangan.
     */
    itemType: saasInvoiceItemTypeEnum("item_type")
      .default("subscription")
      .notNull(),
    /** Nominal tagihan dalam rupiah penuh. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /**
     * Nominal yang benar-benar ditagih ke Midtrans untuk `midtransOrderId`
     * ini (migrasi 0025).
     *
     * Sama dengan `amount` untuk setiap tagihan yang berdiri sendiri.
     * BEDA hanya kalau invoice ini digabung ke tagihan lain -- misalnya
     * langganan Rp 750.000 ditambah Paket Pendirian PT Rp 500.000, dibayar
     * sekali lewat satu charge Rp 1.250.000.
     *
     * Kenapa kolom terpisah, dan bukan `amount` yang langsung berisi
     * penjumlahan: `amount` adalah apa yang TAGIHAN INI bernilai --
     * dipakai MRR, dipakai rekap pendapatan, dipakai rincian di tagihan.
     * `midtransAmount` adalah apa yang TAGIHAN ITU KIRIM. Mencampurkan
     * keduanya berarti invoice legalitas Rp 500.000 tercatat di MRR
     * sebagai Rp 1.250.000.
     *
     * Dan kenapa webhook membandingkan terhadap kolom ini, bukan `amount`:
     * `gross_amount` di notifikasi adalah nominal charge, bukan nominal
     * invoice. Membandingkannya dengan `amount` akan menolak pembayaran
     * yang sudah benar-benar dikirim uangnya.
     */
    midtransAmount: bigint("midtrans_amount", { mode: "number" }).notNull(),
    status: invoiceStatusEnum("status").default("pending").notNull(),
    midtransOrderId: text("midtrans_order_id"),
    /**
     * Invoice yang membayarnya, kalau invoice ini tidak punya tagihan
     * sendiri (migrasi 0025).
     *
     * `NULL` = tagihan berdiri sendiri, dan `midtransOrderId` terisi.
     * Terisi = ikut tagihan yang disebut, dan `midtransOrderId` NULL.
     *
     * Sifat NULL yang tidak boleh dilupakan: Postgres mengizinkan BANYAK
     * NULL pada unique index, jadi banyak invoice add-on yang digabung ke
     * invoice yang sama tidak bertabrakan.
     */
    bundledWith: uuid("bundled_with").references((): AnyPgColumn => saasInvoices.id, {
      onDelete: "cascade",
    }),
    /**
     * Invoice ini perpanjangan, bukan tagihan baru (migrasi 0026).
     *
     * Tanpa penanda ini, "ini perpanjangan" hanya bisa ditebak dari
     * membandingkan `created_at` dengan tanggal tenant dibuat -- dan
     * tebakan itu salah tepat di kasus yang paling penting: tenant yang
     * DAUR ULANG karena berhenti bayar, lalu berbayar lagi. Tebakan itu
     * akan mengklasifikasikannya sebagai tagihan baru, dan halaman tagihan
     * menampilkan kalimat "tagihan ini belum pernah dibayar" untuk
     * sesuatu yang sebenarnya sedang di-tagih untuk kedua kalinya.
     */
    isRenewal: boolean("is_renewal").default(false).notNull(),
    /**
     * URL halaman pembayaran Midtrans (Snap) untuk invoice ini (migrasi 0027).
     *
     * Invoice yang terbit karena orang menekan tombol tidak butuh kolom ini:
     * `redirectTo` langsung dipakai frontend. Invoice renewal berbeda -- cron
     * yang membuatnya, dan cron tidak punya layar untuk mengarahkan orang ke
     * sana, jadi tanpa kolom ini URL-nya dibuang dan invoice itu tidak bisa
     * dibayar dari mana pun.
     *
     * Disimpan utuh, bukan disusun ulang dari `token`: nomor versi jalannya
     * (`snap/v4/...`) berubah dari waktu ke waktu, dan menyusunnya ulang dari
     * token menghasilkan URL yang salah tanpa error.
     */
    midtransRedirectUrl: text("midtrans_redirect_url"),
    transactionId: text("transaction_id"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("saas_invoice_tenant_idx").on(table.tenantId),
    index("saas_invoice_status_idx").on(table.status, table.periodEnd),
    uniqueIndex("saas_invoice_midtrans_idx").on(table.midtransOrderId),
    /*
     * Predicate-nya `status IN ('pending','paid')`, bukan `<> 'refunded'`.
     *
     * Yang harus mencegah tagihan ganda adalah invoice yang MASIH HIDUP.
     * Invoice `failed` justru harus MEMBEBASKAN periode supaya bisa dicoba
     * lagi -- dan itulah yang tidak bisa terjadi dengan predicate lama:
     * urutan di `createDomainRenewal` adalah "insert invoice dulu, baru
     * panggil Midtrans", jadi satu kali Midtrans menolak menyisakan invoice
     * `failed` yang memblokir SELURUH perpanjangan berikutnya untuk periode
     * itu. Permanen, dan tidak ada yang bisa memperbaikinya tanpa
     * intervensi manual.
     *
     * Sengaja DITARUH DI SCHEMA, bukan di route cron: pemeriksaan "sudah
     * ada tagihan hidup untuk periode ini?" tidak bisa dilewati oleh
     * jalur penulisan lain, dan dua request cron yang tumpang tindih
     * adalah kejadian nyata -- bukan kasus teoritis.
     */
    uniqueIndex("saas_invoice_addon_live_period_uniq")
      .on(table.tenantId, table.itemType, table.periodStart)
      .where(
        sql`${table.itemType} <> 'subscription' and ${table.status} in ('pending', 'paid')`,
      ),
    /*
     * Pengaman yang sama untuk LANGGANAN, dengan kolom yang berbeda.
     *
     * Index di atas sengaja mengecualikan `subscription` karena pembayaran
     * bulanan yang terlambat sah punya beberapa invoice dengan
     * `period_start` sama. Tapi konsekuensinya, perpanjangan langganan
     * tidak punya pengaman apa pun -- cron harian bisa menerbitkan 30
     * invoice untuk bulan yang sama.
     *
     * Yang dikunci `period_end`, bukan `period_start`: "sudah ada tagihan
     * hidup untuk periode yang berakhir bulan depan" persis menggambarkan
     * hal yang tidak boleh terjadi -- pengrajin ditagih dua kali untuk bulan
     * yang sama.
     */
    uniqueIndex("saas_invoice_subscription_live_period_uniq")
      .on(table.tenantId, table.periodEnd)
      .where(
        sql`${table.itemType} = 'subscription' and ${table.status} in ('pending', 'paid')`,
      ),
    // Webhook mencari invoice-add-on-yang-digabung dengan satu kueri saat
    // tagihan langganannya lunas. Tanpa index ini, satu notifikasi
    // melunasi semua invoice tenant yang menunjuk order itu.
    index("saas_invoice_bundled_idx").on(table.bundledWith),
    // Digantikan `saas_invoice_addon_live_period_uniq` di atas (migrasi
    // 0026). Yang lama tidak dihapus dari sini supaya tidak ada yang
    // menjalankan `db:generate` dan membuat ulang index yang predicate-nya
    // sudah terbukti memblokir percobaan ulang.
  ],
);

/** Audit log integrasi pihak ketiga (Midtrans, Cloudflare, Fonnte, ...). */
export const integrationAuditLogs = pgTable(
  "integration_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    service: integrationServiceEnum("service").notNull(),
    action: text("action").notNull(),
    status: integrationStatusEnum("status").notNull(),
    requestMeta: jsonb("request_meta").$type<Record<string, unknown>>(),
    responseMeta: jsonb("response_meta").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("audit_service_idx").on(table.service, table.status),
  ],
);

/**
 * Pemakaian kuota notifikasi per bulan (PRD §2.B):
 * Basic 100 WA/bln, Pro 500 WA/bln, Max unlimited.
 * Satu baris per (tenant, channel, bulan). Counter di-reset per periode.
 */
export const notificationUsage = pgTable(
  "notification_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    /** Awal bulan penghitungan, misal 2026-10-01. */
    periodStart: date("period_start").notNull(),
    usedCount: integer("used_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_usage_uniq").on(
      table.tenantId,
      table.channel,
      table.periodStart,
    ),
  ],
);

export type SaasInvoice = typeof saasInvoices.$inferSelect;
export type IntegrationAuditLog = typeof integrationAuditLogs.$inferSelect;
