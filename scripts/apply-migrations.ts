/**
 * Terapkan file SQL di drizzle/ secara manual dengan pelaporan error jelas
 * dan pencatatan hash yang sama dengan drizzle-kit.
 *
 * Kenapa skrip ini ada: `drizzle-kit migrate` menampilkan spinner yang
 * menelan output error, lalu keluar dengan exit 1 tanpa pesan yang bisa
 * dibaca. Skrip ini dipakai untuk melihat error SQL aslinya.
 *
 * Aman dijalankan berulang: migrasi yang hash-nya sudah tercatat dilewati.
 *
 * Jalankan: npx tsx scripts/apply-migrations.ts
 */
import "dotenv/config";

import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

import { sqlClient as sql } from "../src/db/client";

const MIGRATIONS_DIR = "drizzle";
const LEDGER = "drizzle.__drizzle_migrations";

/**
 * Kumpulkan semua migrasi. drizzle-kit menaruh SQL generated di
 * drizzle/*.sql, sedangkan custom migration (RLS, trigger) di
 * drizzle/<tag>/migration.sql — kedua bentuk harus ikut.
 */
function collectMigrations(): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(MIGRATIONS_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = join(MIGRATIONS_DIR, entry.name, "migration.sql");
      if (existsSync(nested)) files.push(join(entry.name, "migration.sql"));
    } else if (entry.name.endsWith(".sql")) {
      files.push(entry.name);
    }
  }
  return files.sort();
}

/**
 * Pisahkan SQL pada statement-breakpoint yang dipakai drizzle-kit.
 *
 * Chunk yang hanya berisi komentar (dan/atau baris kosong) dibuang — tapi
 * TIDAK boleh membuang seluruh file: custom migration seperti 0001_rls
 * tidak punya statement-breakpoint sama sekali, sehingga utuh satu chunk
 * yang diawali baris komentar.
 */
function splitStatements(content: string): string[] {
  return content
    .split("--> statement-breakpoint")
    .map((chunk) => chunk.trim())
    .filter((chunk) =>
      chunk
        .split("\n")
        .some((line) => {
          const t = line.trim();
          return t.length > 0 && !t.startsWith("--") && !t.startsWith("/*");
        }),
    );
}

async function ensureLedger() {
  // Skema "drizzle" dibuat oleh drizzle-kit; script ini harus aman dijalankan
  // lebih dulu pada database yang belum pernah disentuh drizzle-kit.
  await sql.unsafe("create schema if not exists drizzle");
  await sql.unsafe(`
    create table if not exists ${LEDGER} (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
}

async function appliedHashes(): Promise<Set<string>> {
  const rows = await sql.unsafe<{ hash: string }[]>(
    `select hash from ${LEDGER}`,
  );
  return new Set(rows.map((r) => r.hash));
}

async function main() {
  await ensureLedger();
  const done = await appliedHashes();

  for (const file of collectMigrations()) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    // drizzle-kit memakai sha256 dari isi file migration.
    const hash = createHash("sha256").update(content).digest("hex");

    if (done.has(hash)) {
      console.log(`\n=== ${file} — sudah tercatat, dilewati ===`);
      continue;
    }

    const statements = splitStatements(content);
    console.log(`\n=== ${file} (${statements.length} statement) ===`);

    for (const statement of statements) {
      const preview = statement.replace(/\s+/g, " ").slice(0, 68);
      try {
        // Bungkus per statement agar kegagalan tidak meninggalkan DDL
        // setengah jadi (mis. RLS enabled tanpa policy-nya).
        await sql.begin(async (tx) => {
          await tx.unsafe(statement);
        });
        console.log(`  [ok]   ${preview}...`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  [FAIL] ${preview}...`);
        console.error(`         -> ${message}`);
        await sql.end().catch(() => {});
        process.exit(1);
      }
    }

    await sql`insert into ${sql(LEDGER)} (hash, created_at) values (${hash}, ${Date.now()})`;
    console.log(`  -> tercatat di ${LEDGER}`);
  }

  console.log("\nSemua migrasi sudah diterapkan.\n");
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end().catch(() => {});
  process.exit(1);
});
