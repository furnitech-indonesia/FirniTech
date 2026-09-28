import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
     * Semula NOT NULL, jadi invoice add-ondipaksa mengarang salah satu dari
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
    status: invoiceStatusEnum("status").default("pending").notNull(),
    midtransOrderId: text("midtrans_order_id"),
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
    // Mencegah dua invoice add-on untuk periode yang sama. SENGaja tidak
    // berlaku untuk langganan: pembayaran bulanan yang terlambat sah punya
    // beberapa invoice dengan period_start sama. Lihat migrasi 0023.
    uniqueIndex("saas_invoice_addon_period_uniq")
      .on(table.tenantId, table.itemType, table.periodStart)
      .where(sql`${table.itemType} <> 'subscription' and ${table.status} <> 'refunded'`),
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
