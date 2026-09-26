import "dotenv/config";

import { defineConfig } from "drizzle-kit";

/**
 * URL database dimuat dari .env (drizzle.config.ts meng-import dotenv/config).
 * Jangan pernah commit nilai ini — .env sudah di-gitignore.
 *
 * PENTING: migrasi WAJIB lewat SESSION pooler (DIRECT_URL, port 5432).
 * drizzle-kit memakai pg_advisory_lock untuk serialisasi migrasi, dan itu tidak
 * didukung oleh transaction pooler (DATABASE_URL, port 6543). memakai 6543
 * membuat `drizzle-kit migrate` gagal TANPA pesan error yang jelas.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL (atau DATABASE_URL) belum diset. Salin .env.example ke .env lalu isi nilainya.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
