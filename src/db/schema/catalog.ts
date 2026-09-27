import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
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
   3. INVENTARIS & KATALOG PRODUK
   ========================================== */

/**
 * Stok bahan baku (kayu, cat, hardware, busa).
 * quantity/minStockAlert tetap `numeric` karena satuan bahan bisa pecahan
 * (m3, Liter) — berbeda dari uang yang selalu rupiah bulat.
 */
export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., Papan Kayu Jati 200x20
    category: text("category").notNull(), // Kayu, Finishing, Hardware, Busa
    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .default("0")
      .notNull(),
    unit: text("unit").notNull(), // m3, Liter, Pcs, Lembar
    minStockAlert: numeric("min_stock_alert", { precision: 12, scale: 3 })
      .default("5")
      .notNull(),
    ...timestamps,
  },
  (table) => [index("material_tenant_idx").on(table.tenantId)],
);

/**
 * Katalog produk mebel.
 * basePrice memakai bigint (satuan rupiah penuh, tanpa desimal) — lihat README/AGENTS.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),

    /**
     * Kategori mebel untuk filter katalog storefront (ROADMAP Sprint 5:
     * "filter kategori produk").
     *
     * PENTING: kolom ini tidak ada di desain awal. `category` yang ada di
     * `materials` adalah kategori BAHAN (Kayu, Finishing, Hardware, Busa) dan
     * sama sekali tidak bisa dipakai untuk produk jadi — tidak ada produk
     * yang berkategori "Kayu". Tanpa kolom khusus ini, filter katalog tidak mungkin
     * dibangun, karena memfilter produk dengan kategori bahan akan
     * menghasilkan katalog kosong.
     *
     * Bebas teks, bukan enum: daftar kategori mebeljinak hurt dan tiap
     * pengrajin punya katalognya sendiri. Daftar filter diambil dari nilai
     * yang benar-benar dipakai tenant, bukan dari daftar tetap di kode.
     */
    category: text("category").notNull().default("Lainnya"),

    // Dimensi mebel (Panjang x Lebar x Tinggi) —cm
    lengthCm: integer("length_cm").notNull(),
    widthCm: integer("width_cm").notNull(),
    heightCm: integer("height_cm").notNull(),

    // Detail spesifikasi
    woodType: text("wood_type").notNull(), // e.g., Kayu Jati Perhutani
    finishingType: text("finishing_type").notNull(), // e.g., Natural Matte

    /** Harga dasar rupiah penuh, sebelum ongkir kargo. */
    basePrice: bigint("base_price", { mode: "number" }).notNull(),

    images: jsonb("images").$type<string[]>().default([]).notNull(),

    isPublished: boolean("is_published").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("product_tenant_idx").on(table.tenantId),
    uniqueIndex("product_tenant_slug_idx").on(table.tenantId, table.slug),
  ],
);

export type Material = typeof materials.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
