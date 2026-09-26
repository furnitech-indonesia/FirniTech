/**
 * Uji alur autentikasi & RBAC lewat HTTP.
 *
 * Prasyarat: server sudah berjalan (`npm run build && npm run start`).
 * Jalankan: npx tsx scripts/test-auth.ts
 *
 * Cara kerja: login via REST Supabase, lalu cookie session disusun dengan
 * format yang sama dengan @supabase/ssr — `sb-<project-ref>-auth-token`
 * bernilai `base64-` + base64(JSON session). Cookie itu dikirim pada
 * request berikutnya supaya proxy dan supabase.auth.getUser() menerimanya.
 */
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT!;
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const password = process.env.TEST_ACCOUNT_PASSWORD!;
const ownerEmail = process.env.TEST_OWNER_EMAIL!;
const superAdminEmail = process.env.TEST_SUPERADMIN_EMAIL!;

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const AUTH_COOKIE = `sb-${projectRef}-auth-token`;

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

type Session = { access_token: string; [k: string]: unknown };

async function login(email: string): Promise<Session | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as Partial<Session> & { msg?: string };
  if (!body.access_token) {
    console.error(`  login ${email}: ${JSON.stringify(body).slice(0, 160)}`);
    return null;
  }
  return body as Session;
}

function authCookie(session: Session): string {
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type ?? "bearer",
    user: session.user,
  };
  return `${AUTH_COOKIE}=base64-${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

async function get(path: string, cookie?: string) {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return {
    status: res.status,
    location: res.headers.get("location"),
    body: await res.text(),
  };
}

async function main() {
  console.log(`Menguji ${base}\n`);

  // ---- 1. Tanpa session: area dalam harus dialihkan ke /login ----
  for (const path of ["/dashboard", "/admin", "/dashboard/produk"]) {
    const res = await get(path);
    check(
      `Anon ${path} → redirect /login`,
      res.status >= 300 &&
        res.status < 400 &&
        (res.location ?? "").includes("/login"),
      `status ${res.status}${res.location ? ` → ${res.location}` : ""}`,
    );
  }

  // ---- 2. Halaman login terbuka untuk anon ----
  const loginPage = await get("/login");
  // Cek form-nya, bukan string judul. Mengunci judul membuat test gagal
  // setiap kali copy-nya diperbaiki, dan copy itu memang boleh berubah.
  const hasLoginForm =
    loginPage.body.includes('name="email"') &&
    loginPage.body.includes('name="password"');
  check(
    "Anon /login terbuka dengan form masuk",
    loginPage.status === 200 && hasLoginForm,
    loginPage.status === 200 && hasLoginForm
      ? "status 200, form ada"
      : `status ${loginPage.status}, form ${hasLoginForm ? "ada" : "hilang"}`,
  );

  // ---- 3. Peran owner ----
  const ownerSession = await login(ownerEmail);
  if (!ownerSession) {
    check("Login owner", false, "tidak mendapat access token");
  } else {
    const cookie = authCookie(ownerSession);
    check("Login owner", true, "access token diperoleh");

    const dash = await get("/dashboard", cookie);
    check(
      "Owner → /dashboard 200",
      dash.status === 200 && dash.body.includes("Mebel Jaya"),
      `status ${dash.status}`,
    );

    const admin = await get("/admin", cookie);
    check(
      "Owner → /admin DITOLAK",
      admin.status >= 300 || !admin.body.includes("Ringkasan Platform"),
      `status ${admin.status}${admin.location ? ` → ${admin.location}` : ""}`,
    );
  }

  // ---- 4. Peran super_admin ----
  const saSession = await login(superAdminEmail);
  if (!saSession) {
    check("Login super admin", false, "tidak mendapat access token");
  } else {
    const cookie = authCookie(saSession);
    check("Login super admin", true, "access token diperoleh");

    const admin = await get("/admin", cookie);
    check(
      "Super admin → /admin 200",
      admin.status === 200 && admin.body.includes("Ringkasan Platform"),
      `status ${admin.status}`,
    );

    const dir = await get("/admin/tenant", cookie);
    check(
      "Super admin → /admin/tenant 200",
      dir.status === 200 && dir.body.includes("Direktori Tenant"),
      `status ${dir.status}`,
    );

    // Back-office bukan tempatnya: harus dialihkan ke panel admin, bukan
    // menampilkan ringkasan toko (atau apa pun milik tenant).
    const dash = await get("/dashboard", cookie);
    check(
      "Super admin → /dashboard dialihkan ke /admin",
      (dash.status >= 300 && dash.status < 400 && (dash.location ?? "") === "/admin") ||
        !dash.body.includes("Omzet bulan ini"),
      `status ${dash.status}${dash.location ? ` → ${dash.location}` : ""}`,
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} pengujian auth lulus.\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Uji auth gagal:", err);
  process.exit(1);
});
