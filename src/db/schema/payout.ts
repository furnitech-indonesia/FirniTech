import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { payoutSlotEnum, payoutStatusEnum } from "./enums";
import { orders } from "./orders";
import { tenants } from "./tenants";

/* ==========================================
   7. PAYOUT IRIS (Sprint 6)
   ========================================== */

/**
 * Audit log satu instruksi payout IRIS.
 *
 * Payout adalah BATCH: satu baris mewakili transfer ke satu rekening tenant
 * yang mencakup banyak order — karena itu order detail dipisah ke
 * payout_items. Row ini juga menyimpan snapshot data bank tujuan.
 *
 * Slot disimpan sebagai enum + scheduledFor (timestamptz, UTC) karena
 * "06:00"/"18:00" adalah WIB: 06:00 WIB = 23:00 UTC hari sebelumnya.
 * resolvedAt diisi setelah dana benar-benar cair, bukan saat dibuat.
 */
export const payoutLogs = pgTable(
  "payout_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    amount: bigint("amount", { mode: "number" }).notNull(),

    // Snapshot rekening tujuan (bukan referensi ke tenants.*)
    bankName: text("bank_name").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    bankAccountName: text("bank_account_name").notNull(),

    irisReferenceId: text("iris_reference_id"), // ID dari Midtrans IRIS
    status: payoutStatusEnum("status").default("queued").notNull(),
    errorMessage: text("error_message"),

    slot: payoutSlotEnum("slot").notNull(),
    /** Jadwal eksekusi dalam UTC (06:00 WIB = 23:00 UTC hari sebelumnya). */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    /** Waktu dana benar-benar cair ke rekening pengrajin. */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payout_tenant_idx").on(table.tenantId),
    index("payout_slot_status_idx").on(table.slot, table.status),
  ],
);

/** Rincian order yang tercakup dalam satu payout batch. */
export const payoutItems = pgTable(
  "payout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payoutId: uuid("payout_id")
      .notNull()
      .references(() => payoutLogs.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    /** Nominal net dari order ini yang ikut dicairkan. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payout_item_payout_idx").on(table.payoutId),
    index("payout_item_order_idx").on(table.orderId),
  ],
);

export type PayoutLog = typeof payoutLogs.$inferSelect;
export type PayoutItem = typeof payoutItems.$inferSelect;
