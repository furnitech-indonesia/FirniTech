/**
 * Uji halaman & aksi Sprint 3 lewat HTTP.
 *
 * Prasyarat: server berjalan (`npm run build && npm run start`).
 * Jalankan: npx tsx scripts/test-sprint3.ts
 *
 * Menguji dua hal: (1) setiap halaman terbuka untuk peran yang rightful, dan
 * (2) halaman yang bukan haknya ditolak. Ini melengkapi db:test-rls yang
 * sudah menguji lapis database.
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

async function login(email: string): Promise<string | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) return null;

  const payload = {
    access_token: body.access_token,
    refresh_token: (body as Record<string, unknown>).refresh_token,
    expires_in: (body as Record<string, unknown>).expires_in,
    expires_at: (body as Record<string, unknown>).expires_at,
    token_type: "bearer",
    user: (body as Record<string, unknown>).user,
  };
  return `${AUTH_COOKIE}=base64-${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

async function get(path: string, cookie?: string) {
  const res = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  console.log(`Menguji ${base}\n`);

  const ownerCookie = await login(ownerEmail);
  if (!ownerCookie) {
    check("Login owner", false, "tidak mendapat token");
    process.exit(1);
  }

  // ---- Halaman yang harus terbuka untuk owner ----
  const ownerPages: ReadonlyArray<[string, string]> = [
    ["/dashboard", "Omzet bulan ini"],
    ["/dashboard/produk", "Katalog Produk"],
    ["/dashboard/produk/baru", "Tambah Produk"],
    ["/dashboard/materials", "Inventaris Bahan Baku"],
    ["/dashboard/pesanan", "Pesanan"],
    ["/dashboard/pesanan/baru", "Catat Pesanan Kustom"],
    ["/dashboard/chat", "Inbox Customer Service"],
  ];

  for (const [path, marker] of ownerPages) {
    const res = await get(path, ownerCookie);
    check(
      `Owner → ${path}`,
      res.status === 200 && res.body.includes(marker),
      `status ${res.status}${res.status === 200 && !res.body.includes(marker) ? ` (penanda "${marker}" tidak ditemukan)` : ""}`,
    );
  }

  // ---- Konten Sprint 3 yang harus muncul ----
  const products = await get("/dashboard/produk", ownerCookie);
  check(
    "Katalog menampilkan produk seed",
    products.body.includes("Meja Makan Jati"),
    products.body.includes("Meja Makan Jati") ? "ada" : "tidak ditemukan",
  );

  const materials = await get("/dashboard/materials", ownerCookie);
  check(
    "Low Stock Alert tampil untuk cat (3 <= 5)",
    materials.body.includes("Stok menipis") &&
      materials.body.includes("Cat Waterbased Clear"),
    materials.body.includes("Stok menipis") ? "alert tampil" : "alert tidak muncul",
  );

  const orders = await get("/dashboard/pesanan", ownerCookie);
  check(
    "Daftar pesanan memuat pesanan kustom",
    orders.body.includes("ORD-DEMO01") && orders.body.includes("kustom"),
    orders.body.includes("ORD-DEMO01") ? "ada" : "tidak ditemukan",
  );

  const chat = await get("/dashboard/chat", ownerCookie);
  check(
    "Inbox memuat percakapan belum dibalas",
    chat.body.includes("Pak Andi") && chat.body.includes("belum dibalas"),
    chat.body.includes("Pak Andi") ? "ada" : "tidak ditemukan",
  );

  // ---- Halaman yang harus DITOLAK untuk owner ----
  const admin = await get("/admin", ownerCookie);
  check(
    "Owner → /admin ditolak",
    admin.status >= 300,
    `status ${admin.status}`,
  );

  // ---- Navigasi tukang tidak menampilkan modul yang bukan haknya ----
  // (butuh akun tukang; kalau belum ada, dilewati dengan catatan)
  const carpenterEmail = process.env.TEST_CARPENTER_EMAIL;
  if (carpenterEmail) {
    const carpenterCookie = await login(carpenterEmail);
    if (carpenterCookie) {
      const queue = await get("/dashboard/pesanan", carpenterCookie);
      check(
        "Tukang → antrean produksi terbuka",
        queue.status === 200 && queue.body.includes("Antrean Produksi"),
        `status ${queue.status}`,
      );
      check(
        "Tukang tidak melihat menu Produk di navigasi",
        !queue.body.includes('href="/dashboard/produk"'),
        queue.body.includes('href="/dashboard/produk"')
          ? "menu produk masih muncul"
          : "menu produk disembunyikan",
      );

      const newProduct = await get("/dashboard/produk/baru", carpenterCookie);
      check(
        "Tukang → /dashboard/produk/baru ditolak",
        newProduct.status >= 300,
        `status ${newProduct.status}`,
      );
    } else {
      check("Login tukang", false, "tidak mendapat token");
    }
  } else {
    console.log(
      "SKIP  uji tukang — set TEST_CARPENTER_EMAIL di .env untuk mengujinya",
    );
  }

  // ---- Super admin tetap bisa masuk panelnya ----
  const saCookie = await login(superAdminEmail);
  if (saCookie) {
    const res = await get("/admin", saCookie);
    check(
      "Super admin → /admin tetap 200",
      res.status === 200 && res.body.includes("Ringkasan Platform"),
      `status ${res.status}`,
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} pengujian Sprint 3 lulus.\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Uji Sprint 3 gagal:", err);
  process.exit(1);
});
