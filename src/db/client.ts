import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Klien database.
 *
 * PENTING — `prepare: false`:
 * DATABASE_URL memakai Supabase **transaction pooler** (port 6543 / pgbouncer).
 * Pgbouncer mode transaction tidak mendukung prepared statement bernama;
 * postgres.js mengirimnya secara default dan query akan gagal saat trafik
 * naik. Opsi ini wajib, jangan dihapus.
 *
 * Catatan keamanan: user postgres (service role) **bypass** Row Level
 * Security. RLS hanya berlaku untuk klien Supabase (anon/publishable key).
 * Jadi setiap query dari server WAJIB memfilter tenantId secara eksplisit.
 *
 * File ini TIDAK meng-import "server-only" supaya bisa dipakai juga oleh
 * script CLI (drizzle-kit, verify, seed). Untuk pemakaian aplikasi, import
 * dari "@/db" (index.ts) yang memasang guard "server-only".
 */

const globalForDb = globalThis as unknown as {
  sqlClient?: ReturnType<typeof postgres>;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diset. Salin .env.example ke .env lalu isi nilainya.",
    );
  }

  return postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
}

export const sqlClient = globalForDb.sqlClient ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
export { schema };
