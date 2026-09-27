import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
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

    /**
     * Satu baris alamat yang sudah dirakit, siap dibaca kurir.
     *
     * Disimpan BERGANDENG dengan kolom-kolom terstruktur di bawah, bukan
     * menggantikannya. Alasannya, tampilan back-office, invoice, dan struk
     * butuh satu baris yang bisa langsung dicetak, sementara form alamat dan
     * pencarian tarif butuh data terpisah. Kalau hanya `address_line`,
     * menjemput addressLine yang sama, memotongnya, lalu mencocokkannya
     * dengan nama kota — itu pencocokan teks yang rapuh.
     */
    addressLine: text("address_line").notNull(),

    /**
     * Nama jalan, nomor rumah, RT, dan RW dipisah agar kurir bisa melihat
     * masing-masing tanpa mem-parsing satu string. RT/RW wajib terpisah
     * karena di banyak daerah kurir benar-benar menanyakan "RT berapa?",
     * dan jawaban itu tidak ada di dalam alamat yang digabung.
     */
    streetName: text("street_name"),
    houseNumber: text("house_number"),
    rt: text("rt"),
    rw: text("rw"),

    /**
     * Id wilayah dari pohon resmi (emsifa v2), disimpan BERSAMA nama
     * formalnya.
     *
     * Id disimpan karena nama bisa berubah atau ditulis berbeda
     * ("Kota Bandung" vs "Bandung"), sedangkan id tidak. Pencocokan tarif
     * ongkir WAJIB memakai id — lihat catatan "jebakan integrasi ongkir" di
     * ROADMAP.md Sprint 5 bagian 3. Nama disimpan supaya halaman ringkasan
     * tetap bisa ditampilkan tanpa memanggil API pihak ketiga.
     */
    provinceId: text("province_id"),
    regencyId: text("regency_id"),
    districtId: text("district_id"),
    villageId: text("village_id"),
    villageName: text("village_name"),
    districtName: text("district_name"),
    regencyName: text("regency_name"),
    provinceName: text("province_name"),

    /** Kota/kabupaten yang dipakai untuk lookup tarif ongkir. */
    cityName: text("city_name").notNull(),
    postalCode: text("postal_code"),

    /**
     * Titik peta, nullable dan OPSIONAL.
     *
     * Nullable karena peta bukan syarat: form alamat harus bisa diselesaikan
     * tanpa peta, dan luring tidak ada tile-nya. Untuk kurir kargo yang
     * perlu bernavigasi, alamat lengkap + RT/RW jauh lebih berguna daripada
     * peta.
     */
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),

    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("address_tenant_phone_idx").on(table.tenantId, table.customerPhone),
    // Satu alamat default per pembeli per tenant: initializing ulang
    // is_default untuk nomor yang sama dijamin unik oleh constraint ini.
    uniqueIndex("address_default_per_phone_uniq")
      .on(table.tenantId, table.customerPhone)
      .where(sql`${table.isDefault} = true`),
  ],
);

export type ShippingRate = typeof shippingRates.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
