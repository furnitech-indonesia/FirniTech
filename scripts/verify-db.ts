/**
 * Verifikasi hasil migrasi Sprint 1.
 *
 * Dipakai sebagai pengganti test framework: memastikan tabel, RLS, trigger,
 * dan fungsi bantu benar-benar ada di database — bukan hanya di file SQL.
 *
 * Jalankan: npm run db:verify
 */
import "dotenv/config";

import { sqlClient as sql } from "../src/db/client";

type Check = { name: string; ok: boolean; detail: string };

const EXPECTED_TABLES = [
  "tenants",
  "users",
  "materials",
  "products",
  "customer_addresses",
  "shipping_rates",
  "order_items",
  "orders",
  "production_progress",
  "payout_items",
  "payout_logs",
  "saas_invoices",
  "integration_audit_logs",
  "notification_usage",
  "delivery_proofs",
];

async function main() {
  const checks: Check[] = [];
  const client = sql;

  // 1. Tabel ada
  const tables = await client<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  const existing = new Set(tables.map((t) => t.tablename));
  const missing = EXPECTED_TABLES.filter((t) => !existing.has(t));
  checks.push({
    // Labelnya dihitung, bukan diketik. Angka yang ditulis manual di dalam
    // string akan basi begitu ada tabel baru, dan tidak ada yang menangkapnya
    // karena pemeriksaan ini tetap hijau.
    name: `Tabel dibuat (${EXPECTED_TABLES.length})`,
    ok: missing.length === 0,
    detail: missing.length ? `hilang: ${missing.join(", ")}` : "semua ada",
  });

  // 2. RLS aktif di semua tabel tenant
  const rls = await client<{ tablename: string; rls: boolean }[]>`
    select tablename, rowsecurity as rls
    from pg_tables
    where schemaname = 'public'
  `;
  const withoutRls = rls.filter((t) => !t.rls).map((t) => t.tablename);
  checks.push({
    name: "RLS aktif",
    ok: withoutRls.length === 0,
    detail: withoutRls.length ? `RLS mati: ${withoutRls.join(", ")}` : "semua aktif",
  });

  // 3. Fungsi bantu RLS tersedia (anti rekursi)
  const fns = await client<{ proname: string }[]>`
    select proname from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'current_tenant_id', 'current_user_role',
        'is_super_admin', 'is_tenant_staff', 'handle_new_user'
      )
  `;
  const fnNames = fns.map((f) => f.proname);
  const expectedFns = [
    "current_tenant_id",
    "current_user_role",
    "is_super_admin",
    "is_tenant_staff",
    "handle_new_user",
  ];
  const missingFns = expectedFns.filter((f) => !fnNames.includes(f));
  checks.push({
    name: "Fungsi RLS + trigger signup",
    ok: missingFns.length === 0,
    detail: missingFns.length ? `hilang: ${missingFns.join(", ")}` : "lengkap",
  });

  // 4. Trigger auth.users -> public.users terpasang
  const triggers = await client<{ tgname: string }[]>`
    select tgname from pg_trigger
    where tgrelid = 'auth.users'::regclass and not tgisinternal
  `;
  checks.push({
    name: "Trigger on_auth_user_created",
    ok: triggers.some((t) => t.tgname === "on_auth_user_created"),
    detail: triggers.map((t) => t.tgname).join(", ") || "tidak ada trigger",
  });

  // 5. Kolom uang bertipe bigint (bukan numeric/float)
  const moneyCols = await client<
    { table_name: string; column_name: string; data_type: string }[]
  >`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and data_type not in ('bigint')
      and column_name in (
        'base_price', 'price', 'items_subtotal', 'shipping_fee', 'total_amount',
        'midtrans_mdr_fee', 'platform_service_fee', 'net_tenant_amount',
        'dp_amount', 'rate_amount', 'amount'
      )
  `;
  checks.push({
    name: "Kolom uang = bigint (rupiah penuh)",
    ok: moneyCols.length === 0,
    detail: moneyCols.length
      ? moneyCols.map((c) => `${c.table_name}.${c.column_name}:${c.data_type}`).join(", ")
      : "semua bigint",
  });

  // 6. Isolasi tenant: RLS menolak akses silang antar tenant.
  //    Drizzle/CLI memakai user postgres (bypass RLS), jadi diuji lewat
  //    PostgREST memakai anon key — jalur yang benar-benar dipakai browser.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT;

  if (!supabaseUrl || !anonKey) {
    checks.push({
      name: "Uji isolasi tenant via anon key",
      ok: false,
      detail: "NEXT_PUBLIC_SUPABASE_URL / ANON key belum diset",
    });
  } else {
    const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const rows = (await res.json()) as unknown[];
    // Tanpa sesi login, anon tidak boleh melihat tenant manapun.
    checks.push({
      name: "Uji isolasi tenant via anon key",
      ok: res.ok && Array.isArray(rows) && rows.length === 0,
      detail: Array.isArray(rows)
        ? `${rows.length} baris terlihat oleh anon (harus 0)`
        : `status ${res.status}`,
    });
  }

  // Laporan
  console.log("\n=== FurniTech DB Verification ===\n");
  let failed = 0;
  for (const c of checks) {
    if (!c.ok) failed++;
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
  }
  console.log(
    `\n${checks.length - failed}/${checks.length} pemeriksaan lulus.\n`,
  );

  await client.end();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Verifikasi gagal:", err);
  process.exit(1);
});
