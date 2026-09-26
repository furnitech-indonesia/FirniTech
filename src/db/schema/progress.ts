import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { progressStageEnum } from "./enums";
import { orders } from "./orders";
import { users } from "./tenants";

/* ==========================================
   6. VISUAL PROGRESS TRACKER
   ========================================== */

/**
 * Foto progres produksi yang diunggah tukang dari HP di bengkel.
 *
 * carpenterId memakai ON DELETE SET NULL (bukan cascade): menghapus akun
 * tukang tidak boleh menghapus riwayat foto karena dibutuhkan untuk
 * pembukuan/dispute. carpenterName di-snapshot sebagai pengganti.
 */
export const productionProgress = pgTable(
  "production_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carpenterId: uuid("carpenter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    carpenterName: text("carpenter_name").notNull(), // snapshot
    stage: progressStageEnum("stage").notNull(),
    photoUrl: text("photo_url").notNull(), // Supabase Storage
    notes: text("notes"),
    /** Penanda notifikasi WhatsApp ke pembeli sudah terkirim (ROADMAP Sprint 4). */
    waNotificationSent: boolean("wa_notification_sent")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("progress_order_idx").on(table.orderId),
    index("progress_carpenter_idx").on(table.carpenterId),
  ],
);

export type ProductionProgress = typeof productionProgress.$inferSelect;
export type NewProductionProgress = typeof productionProgress.$inferInsert;
