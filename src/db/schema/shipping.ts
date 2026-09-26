import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/* ==========================================
   4. ONGKIR & ALAMAT PENGIRIMAN
   ========================================== */

/**
 * Matriks tarif kargo milik pengrajin, flat per kota tujuan.
 * Unik per (tenant, lower(city_name)) supaya "Bandung" dan "bandung"
 * tidak tercipta dua baris dengan tarif berbeda.
 */
export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    cityName: text("city_name").notNull(),
    provinceName: text("province_name").notNull(),
    /** Tarif kargo rupiah penuh (flat, tidak per kg/m3). */
    rateAmount: bigint("rate_amount", { mode: "number" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("shipping_tenant_city_idx").on(table.tenantId, table.cityName),
    uniqueIndex("shipping_tenant_city_uniq").on(
      table.tenantId,
      sql`lower(${table.cityName})`,
    ),
  ],
);

/**
 * Alamat pengiriman pembeli (PRD §4 Modul 1).
 * Pembeli storefront tidak punya akun, jadi alamat di-key per nomor HP
 * agar bisa dipakai ulang pada order berikutnya ("kirim lagi ke alamat lama").
 * Alamat tetap di-snapshot ke orders.* saat checkout.
 */
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerPhone: text("customer_phone").notNull(),
    recipientName: text("recipient_name").notNull(),
    addressLine: text("address_line").notNull(),
    cityName: text("city_name").notNull(),
    provinceName: text("province_name").notNull(),
    postalCode: text("postal_code"),
    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("address_tenant_phone_idx").on(table.tenantId, table.customerPhone),
  ],
);

export type ShippingRate = typeof shippingRates.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
