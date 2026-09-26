/**
 * Skema database FurniTech (Drizzle ORM + Supabase PostgreSQL).
 *
 * File ini hanya re-export — definisi tabelnya dipisah per domain agar
 * mudah ditinjau. Tambahkan domain baru di sini.
 */
export * from "./enums";
export * from "./tenants";
export * from "./catalog";
export * from "./shipping";
export * from "./orders";
export * from "./progress";
export * from "./payout";
export * from "./billing";
export * from "./operations";
