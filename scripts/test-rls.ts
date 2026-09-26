/**
 * Uji RLS end-to-end lewat PostgREST dengan JWT pengguna sungguhan.
 *
 * db:verify hanya menguji bahwa policy ADA dan anon tidak melihat apa pun.
 * Skrip ini membuktikan isolasi tenant sungguhan: user yang login hanya bisa
 * membaca baris tenant-nya sendiri.
 *
 * Jalankan: npx tsx scripts/test-rls.ts
 */
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT!;

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`Login ${email} gagal: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body.access_token;
}

async function get(token: string, path: string) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* biarkan teks mentah */
  }
  return { status: res.status, data };
}

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

async function main() {
  const PASSWORD = "FurniTech-Sprint1-2026!";
  const ownerToken = await login("owner@mebeljaya.id", PASSWORD);
  check("Login owner Mebel Jaya", true, "JWT pengguna diperoleh");

  // 1. Tenant sendiri boleh dibaca
  const tenants = await get(ownerToken, "tenants?select=slug");
  const tenantSlugs = rows(tenants.data).map((r) => r.slug as string);
  check(
    "tenants: hanya tenant sendiri",
    tenantSlugs.length === 1 && tenantSlugs[0] === "mebeljaya",
    `terlihat: [${tenantSlugs.join(", ")}]`,
  );

  // 2. Produk tenant sendiri
  const products = await get(ownerToken, "products?select=name");
  check(
    "products: milik tenant sendiri",
    rows(products.data).length === 2,
    `${rows(products.data).length} produk`,
  );

  // 3. Tarif ongkir tenant sendiri
  const rates = await get(ownerToken, "shipping_rates?select=city_name");
  check(
    "shipping_rates: milik tenant sendiri",
    rows(rates.data).length === 3,
    `${rows(rates.data).length} kota`,
  );

  // 4. Profil: hanya user dalam tenant yang sama
  const users = await get(ownerToken, "users?select=email,role,tenant_id");
  const userRows = rows(users.data);
  const otherTenantLeak = userRows.some(
    (u) => u.role === "super_admin" || u.tenant_id === null,
  );
  check(
    "users: tidak bocor ke tenant lain / super admin",
    !otherTenantLeak && userRows.length === 1,
    `${userRows.length} profil, role=${userRows.map((u) => u.role).join(",")}`,
  );

  // 5. Audit log hanya untuk super_admin
  const audit = await get(ownerToken, "integration_audit_logs?select=id");
  check(
    "integration_audit_logs: DITOLAK untuk owner",
    audit.status === 200 && rows(audit.data).length === 0,
    `status ${audit.status}, ${rows(audit.data).length} baris`,
  );

  // 6. Data pembeli tidak boleh diakses staf lewat RLS
  const addresses = await get(ownerToken, "customer_addresses?select=id");
  check(
    "customer_addresses: DITOLAK untuk owner",
    addresses.status === 200 && rows(addresses.data).length === 0,
    `status ${addresses.status}, ${rows(addresses.data).length} baris`,
  );

  // 7. Anon tidak boleh menulis ke orders
  const anonWrite = await fetch(`${url}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      order_code: "HACK-001",
      tenant_id: "00000000-0000-0000-0000-000000000001",
      customer_name: "x",
      customer_phone: "x",
      customer_address: "x",
      destination_city: "x",
      items_subtotal: 1,
      shipping_fee: 0,
      total_amount: 1,
    }),
  });
  check(
    "orders: anon DITOLAK menulis (RLS blocks INSERT)",
    anonWrite.status >= 400,
    `status ${anonWrite.status}`,
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} pengujian RLS lulus.\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Uji RLS gagal:", err);
  process.exit(1);
});
