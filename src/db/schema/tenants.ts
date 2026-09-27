import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  subscriptionPlanEnum,
  subscriptionStatusEnum,
  userRoleEnum,
} from "./enums";

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
   2. TENANT & PENGGUNA (Multi-Tenant + RBAC)
   ========================================== */

/** Tabel Tenant / Toko Pengrajin — satu baris = satu workshop. */
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(), // Nama Workshop / Toko
    slug: text("slug").notNull(), // Subdomain bawaan (misal: mebeljaya)
    customDomain: text("custom_domain"), // Custom domain (misal: mebeljaya.com)

    /**
     * Custom domain baru TIDAK boleh melayani trafik sebelum Cloudflare
     * untuk SaaS selesai memverifikasi CNAME-nya.
     */
    customDomainVerified: boolean("custom_domain_verified")
      .default(false)
      .notNull(),

    /*
     * Rekening tujuan payout TIDAK disimpan di sini.
     *
     * Semula ada di tabel `tenants`, dan itu SALAH. Policy
     * `tenants_select` adalah `id = current_tenant_id()` — tanpa
     * penyaringan role — jadi kolom rekening ikut bisa dibaca oleh `kurir`,
     * termasuk `bank_account_name` yang bisa jadi nama orang. Dan ini tidak
     * bisa ditutup di tempat lain: RLS menyaring BARIS (dan baris tenancy
     * ini memang milik kurir), sedangkan GRANT menyaring KOLOM per peran
     * database — dan owner, admin penjualan, dan kurir
     * semua memakai peran database yang sama: `authenticated`.
     *
     * Satu-satunya cara yang bisa ditegakkan adalah tabel terpisah dengan
     * policy sendiri: tabel `tenant_bank_accounts`, dengan RLS yang hanya
     * meloloskan owner dan admin penjualan.
     *
     * Alasannya teknis, tapi konsekuensinya produk: nomor rekening ini akan
     * DITAMPILKAN ke pembeli pada COD transfer bank, jadi siapa pun yang
     * bisa membacanya lewat jalur yang tidak ditampilkan adalah kebocoran.
     */

    // Langganan SaaS
    plan: subscriptionPlanEnum("plan").default("basic").notNull(),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .default("active")
      .notNull(),
    subscriptionExpiresAt: timestamp("subscription_expires_at", {
      withTimezone: true,
    }).notNull(),

    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tenant_slug_idx").on(table.slug),
    uniqueIndex("tenant_domain_idx").on(table.customDomain),
  ],
);

/**
 * Profil pengguna. `id` sengaja TIDAK punya defaultRandom karena harus
 * selalu sama dengan `auth.users.id` (Supabase Auth) — inilah join point RLS.
 *
 * tenantId NULL = super_admin (FurniTech SaaS owner, lintas tenant).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // = auth.users.id
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    email: text("email"), // disalin dari auth.users.email
    fullName: text("full_name").notNull(),
    phone: text("phone"), // nullable: auth Email/Magic Link tidak selalu ada HP
    role: userRoleEnum("role").notNull(), // tanpa default — wajib eksplisit
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("user_tenant_idx").on(table.tenantId),
    uniqueIndex("user_email_idx").on(sql`lower(${table.email})`),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
