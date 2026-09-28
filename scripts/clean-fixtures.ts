/**
 * Bersihkan sisa fikstur skrip test.
 *
 * Ada karena dua skrip pernah memanggil `process.exit()` di akhir `main()`,
 * yang membatalkan `.finally()` dan menyisakan tenant. Tenant sisa itu bukan
 * sekadar kebocoran SQL: `test:auth` dan `test:webhook` membaca daftar tenant,
 * dan satu tenant fikstur yang tidak terhapus membuat keduanya melihat
 * kebocoran dari run sebelumnya.
 *
 * HANYA menghapus tenant yang slug-nya diawali `uji-` atau `probe-`, jadi
 * tenant sungguhan tidak mungkin ikut terhapus. Jalankan:
 *   npm run db:clean-fixtures
 */
import "dotenv/config";

import { eq, like, or } from "drizzle-orm";

import { db, sqlClient } from "@/db/client";
import { tenants } from "@/db/schema";

async function main() {
  const rows = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(or(like(tenants.slug, "uji-%"), like(tenants.slug, "probe-%")));

  if (rows.length === 0) {
    console.log("Tidak ada fikstur yang tertinggal.");
    await sqlClient.end();
    return;
  }

  console.log(`Menghapus ${rows.length} tenant fikstur:`);
  for (const row of rows) {
    // Audit log harus dihapus eksplisit: `integration_audit_logs.tenant_id`
    // memakai `onDelete: "set null"`, jadi barisnya tidak ikut terhapus
    // bersama tenant dan akan tercampur ke tabel yang dibaca super admin.
    await sqlClient`delete from integration_audit_logs where tenant_id = ${row.id}`;
    // `eq` bukan templat sqlClient, supaya satu gaya saja di berkas ini.
    await db.delete(tenants).where(eq(tenants.id, row.id));
    console.log(`  - ${row.slug}`);
  }

  const left = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(or(like(tenants.slug, "uji-%"), like(tenants.slug, "probe-%")));
  console.log(`\nSisa: ${left.length}`);
  await sqlClient.end();
}

main().catch((err) => {
  console.error("Gagal membersihkan fikstur:", err);
  process.exit(1);
});
