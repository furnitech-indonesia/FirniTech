import { spawn, type ChildProcess } from "child_process";

import { chromium, type Browser } from "playwright";

/**
 * Pemeriksaan PWA & luring (ROADMAP Sprint 6).
 *
 * Yang diperiksa di sini TIDAK bisa dibuktikan dari source code:
 *   - apakah service worker benar-benar terdaftar dan sempat aktif
 *   - apakah halaman luring benar-benar muncul saat server mati
 *   - apakah aset yang dicache masih utuh setelah jaringan putus
 *
 * MENGAPA TES INI MENYALAKAN SERVERNYA SENDIRI
 *
 * `context.setOffline()` milik Playwright TIDAK berlaku untuk permintaan yang
 * lewat service worker — permintaan itu datang dari target service worker,
 * bukan dari page, dan emulasi jaringan di level context tidak menjangkaunya.
 * Akibatnya, percobaan pertama "luring" justru berhasil memuat halaman NYATA
 * dari cache peramban, dan tes melaporkan lulus padahal tidak ada yang diuji.
 *
 * Jadi tes ini menjalankan `next start` sendiri di port tersendiri, lalu
 * benar-benar MEMATIKAN prosesnya untuk menguji keadaan luring. Server yang
 * sedang dipakai orang (port 3000) tidak boleh disentuh — mematikan server
 * dev di tengah sesi orang lain adalah kesalahan yang mahal.
 *
 * Jalankan: npm run test:pwa
 */
const PORT = Number(process.env.PWA_PORT ?? 3199);
const EXTERNAL = process.env.PWA_BASE_URL;
const BASE = EXTERNAL ?? `http://127.0.0.1:${PORT}`;

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

/* ---------------- Server milik tes ---------------- */

let child: ChildProcess | null = null;

async function startServer(): Promise<ChildProcess> {
  const proc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
  });
  // Paksa mati bersama skrip ini kalau skrip-nya dibunuh.
  void proc;

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return proc;
    } catch {
      // belum siap
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server tes tidak siap di ${BASE} setelah 30 detik`);
}

async function stopServer(): Promise<void> {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    // Sudah mati lebih dulu — itu hasil yang kita mau juga.
  }
  child = null;
  // Tunggu port benar-benar bebas, kalau tidak `start` berikutnya akan
  // gagal diam-diam dengan EADDRINUSE dan tesnya yang salah.
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await fetch(BASE, { signal: AbortSignal.timeout(1000) });
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/* ---------------- Pemeriksaan ---------------- */

async function checkManifest(): Promise<void> {
  const response = await fetch(`${BASE}/manifest.webmanifest`);
  const manifest = (await response.json()) as {
    name?: string;
    start_url?: string;
    display?: string;
    icons?: { src: string; sizes: string; purpose?: string }[];
    shortcuts?: { name: string; url: string }[];
  };

  check(
    "manifest.webmanifest dilayani dengan 200",
    response.ok,
    `HTTP ${response.status} (harus 200)`,
  );
  check(
    "manifest punya start_url, display, dan nama",
    Boolean(manifest.start_url && manifest.display && manifest.name),
    `start_url=${manifest.start_url} display=${manifest.display}`,
  );
  check(
    "display bukan fullscreen (pengguna harus masih bisa melihat sinyal & jam)",
    manifest.display === "standalone",
    `display=${manifest.display}`,
  );

  const sizes = (manifest.icons ?? []).map((icon) => icon.sizes);
  check(
    "manifest punya ikon 192px dan 512px (syarat installability Chrome)",
    sizes.includes("192x192") && sizes.includes("512x512"),
    sizes.join(", ") || "(tidak ada ikon)",
  );
  check(
    "ada ikon maskable untuk adaptive icon Android",
    (manifest.icons ?? []).some((icon) => icon.purpose === "maskable"),
    "purpose=maskable ada",
  );

  for (const icon of manifest.icons ?? []) {
    const res = await fetch(`${BASE}${icon.src}`);
    check(
      `ikon ${icon.src} bisa diunduh sebagai gambar`,
      res.ok && (res.headers.get("content-type") ?? "").includes("image/png"),
      `HTTP ${res.status} ${res.headers.get("content-type") ?? ""}`,
    );

    /*
     * UKURAN SEBENARNYA HARUS SAMA DENGAN YANG DI NYATAIN.
     *
     * Pemeriksaan "ada ikon 192px dan 512px" di atas hanya membaca string
     * `sizes` di manifest. Ia tidak tahu bahwa file-nya ternyata 200px —
     * dan regenerate ikon dengan ukuran yang salah akan tetap membuat
     * manifest terlihat benar, sementara Chrome memakai ukuran yang salah
     * untuk menentukan allowable sizes.
     *
     * Header PNG menyimpan lebar dan tinggi di byte 16..24, jadi ukurannya
     * bisa dibaca tanpa pustaka gambar. Tinggi 8 byte dan magic number
     * `\x89PNG` diperiksa lebih dulu supaya file yang bukan PNG tidak dibaca
     * sebagai ukuran yang benar.
     */
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      const isPng =
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (!isPng) {
        check(`ikon ${icon.src} benar-benar PNG`, false, "magic number tidak cocok");
        continue;
      }
      const view = new DataView(bytes.buffer);
      const actual = `${view.getUint32(16)}x${view.getUint32(20)}`;
      check(
        `ikon ${icon.src} berukuran sesuai yang dideklarasikan`,
        actual === icon.sizes,
        `manifest ${icon.sizes} vs file ${actual}`,
      );
    }
  }

  check(
    "start_url benar-benar bisa dibuka",
    (await fetch(`${BASE}${manifest.start_url ?? "/"}`)).ok,
    `${manifest.start_url} → HTTP 200`,
  );

  const shortcutsOk = await (async () => {
    for (const shortcut of manifest.shortcuts ?? []) {
      if (!(await fetch(`${BASE}${shortcut.url}`)).ok) return false;
    }
    return true;
  })();
  check(
    "shortcut di manifest semuanya bisa dibuka",
    shortcutsOk,
    (manifest.shortcuts ?? []).map((s) => s.url).join(", "),
  );
}

async function checkRegistration(page: import("playwright").Page): Promise<void> {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  /*
   * Menunggu penanda yang dipasang `ServiceWorkerRegistrar`, bukan
   * `waitForTimeout` dengan durasi tebakan. Penandanya hanya muncul kalau
   * `navigator.serviceWorker.register()` benar-benar selesai, jadi ini
   * membuktikan pendaftaran, bukan hope.
   */
  const swReady = await page
    .waitForFunction(() => document.documentElement.dataset.swReady === "1", {
      timeout: 20_000,
    })
    .then(() => true)
    .catch(() => false);
  check(
    "service worker terdaftar (penanda swReady muncul)",
    swReady,
    swReady ? "swReady=1" : "penanda tidak muncul dalam 20 detik",
  );

  // Muat ulang supaya halaman benar-benar dikendalikan service worker.
  await page.reload({ waitUntil: "networkidle" });

  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return {
      hasRegistration: Boolean(registration),
      active: Boolean(registration?.active),
      controller: Boolean(navigator.serviceWorker.controller),
    };
  });
  check(
    "service worker aktif dan mengendalikan halaman (bukan cuma terdaftar)",
    state.hasRegistration && state.active && state.controller,
    `active=${state.active} controller=${state.controller}`,
  );

  const cached = await page.evaluate(async () => {
    const names = await window.caches.keys();
    const out: Record<string, number> = {};
    for (const name of names) {
      const cache = await window.caches.open(name);
      out[name] = (await cache.keys()).length;
    }
    return out;
  });
  check(
    "precache terisi (halaman luring + ikon)",
    Object.values(cached).some((count) => count > 0),
    JSON.stringify(cached),
  );

  const chunks = await page.evaluate(async () => {
    const names = await window.caches.keys();
    let found = 0;
    for (const name of names) {
      const cache = await window.caches.open(name);
      for (const request of await cache.keys()) {
        if (request.url.includes("/_next/static/")) found += 1;
      }
    }
    return found;
  });
  check(
    "chunk JS/CSS ter-cache ada (halaman tetap bisa dirender luring)",
    chunks > 0,
    `${chunks} chunk di cache`,
  );
}

/** Keadaan luring dengan server benar-benar dimatikan. */
async function checkOffline(
  browser: Browser,
  page: import("playwright").Page,
  offlineConsole: string[],
): Promise<void> {
  await stopServer();

  const reachable = await fetch(BASE, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  );
  check("server benar-benar mati saat luring diuji", !reachable, "tidak ada yang menjawab");

  await page.goto(BASE + "/t/mebeljaya/produk", { waitUntil: "domcontentloaded" });

  /*
   * Menunggu KEPALAANNYA terlihat, bukan `waitForTimeout(500)`. Dokumen luring
   * datang dari cache dan berisi flight data RSC di dalam `<script>`, jadi
   * sesaat setelah `domcontentloaded` `body.textContent` masih hanya berisi
   * payload itu — dan pemeriksaan "penanda jelas" yang membacanya akan
   * memeriksa teks yang salah. Ini sumber ketidakstabilan yang nyata: dua
   * jalannya menghasilkan HASIL BERBEDA untuk kode yang sama.
   */
  const heading = page.getByRole("heading", { name: "Tidak ada koneksi" });
  const visible = await heading
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    console.log("DEBUG konsol luring:", offlineConsole.join(" | ").slice(0, 400));
  }

  const text = ((await page.textContent("body")) ?? "").replace(/\s+/g, " ");
  check(
    "navigasi luring menampilkan penanda yang jelas, bukan halaman basi",
    text.includes("Tidak ada koneksi") && text.includes("Coba lagi"),
    text.slice(0, 90),
  );
  /*
   * Yang dicari di sini adalah konten TOKO yang bocor, bukan kata "katalog"
   * secara harfiah — teks halaman luring sendiri memang menyebut "Katalog"
   * dalam kalimat "Katalog, daftar pesanan, dan status pembaruan semuanya
   * diambil langsung dari server". Memeriksa kata itu hanya menguji
   * kekeliruan dalam tesnya sendiri.
   *
   * Penanda kebocoran yang benar: nama tenant, nama produk, dan data RSC
   * milik halaman toko. Kalau salah satu muncul, berarti service worker
   * menyajikan halaman orang lain.
   */
  const leaked = ["Mebel Jaya", "Meja Makan", "Rp ", "produk"].filter((needle) =>
    text.includes(needle),
  );
  check(
    "halaman luring BUKAN halaman toko yang tersimpan (tidak ada kebocoran)",
    leaked.length === 0,
    leaked.length === 0
      ? "tidak ada nama tenant, produk, atau nominal yang bocor"
      : `bocor: ${leaked.join(", ")}`,
  );
  check(
    "halaman luring punya <main id=konten-utama> (skip-link tetap berfungsi)",
    (await page.locator("main#konten-utama").count()) === 1,
    "main#konten-utama ada",
  );

  /*
   * Shell aplikasi (DoD Sprint 6): halaman depan harus benar-benar termuat
   * dari cache saat luring, bukan hanya "/offline" yang bisa ditampilkan.
   * Itu yang membuat precache `/` beserta chunk-nya berarti — kalau HTML-nya
   * ada tapi JavaScript-nya tidak, yang tampil cuma teks tanpa fungsi.
   */
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const shellHeading = await page
    .getByRole("heading", { level: 1 })
    .first()
    .textContent({ timeout: 20_000 })
    .catch(() => null);
  /*
   * Headline-nya harus milik landing page, BUKAN "Tidak ada koneksi".
   * Memeriksa `<h1>` yang ada saja akan lulus bahkan kalau service worker
   * selalu menyajikan `/offline` — dan itulah yang terjadi di versi pertama
   * pemeriksaan ini: dokumen beranda sudah di-precache tapi tidak pernah
   * dipakai, karena fallback-nya langsung melompat ke `/offline`.
   */
  check(
    "shell aplikasi termuat saat luring (halaman depan dari cache)",
    Boolean(shellHeading && shellHeading.trim().length > 0) &&
      !shellHeading!.includes("Tidak ada koneksi"),
    shellHeading ? `"${shellHeading.trim().slice(0, 60)}"` : "tidak ada <h1>",
  );
  check(
    "shell luring tetap punya <main id=konten-utama>",
    (await page.locator("main#konten-utama").count()) === 1,
    "main#konten-utama ada",
  );

  // Jalankan server lagi, lalu tombol "Coba lagi" harus memulihkan halaman.
  await page.goto(BASE + "/t/mebeljaya/produk", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Tidak ada koneksi" })
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => undefined);

  child = await startServer();

  /*
   * Tombol "Coba lagi" adalah Client Component, jadi `onClick`-nya baru ada
   * setelah React selesai hydrasi. Tombolnya sendiri sudah ada di HTML hasil
   * server, jadi `waitFor` pada tombol tidak menjamin apa pun — klik pada
   * tombol yang belum ter-hidrasi diam-diam tidak terjadi apa-apa, dan
   * pemeriksaan berikutnya melaporkan "halaman tidak pulih" padahal tombolnya
   * memang benar.
   *
   * Penanda hidrasi yang dipakai: `data-sw-ready` di `<html>`, yang dipasang
   * `ServiceWorkerRegistrar` — komponen itu juga Client Component di layout
   * yang sama, jadi kalau penandanya muncul, React sudah jalan.
   */
  await page.waitForFunction(
    () => document.documentElement.dataset.swReady === "1",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await page.waitForLoadState("domcontentloaded");
  const recovered = ((await page.textContent("body")) ?? "").replace(/\s+/g, " ");
  check(
    "tombol 'Coba lagi' memulihkan halaman begitu server hidup kembali",
    !recovered.includes("Tidak ada koneksi") && recovered.includes("Mebel Jaya"),
    recovered.slice(0, 80),
  );
}

async function main() {
  // Error konsol yang terjadi SEBELUM server dimatikan; lihat penentuannya
  // di dalam main di bawah.
  const errorsBeforeOffline: string[] = [];

  if (!EXTERNAL) {
    child = await startServer();
  } else {
    const ok = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).then(
      (res) => res.ok,
      () => false,
    );
    if (!ok) {
      console.error(`Tidak ada server di ${BASE}.`);
      process.exit(2);
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });

  try {
    await checkManifest();
    await checkRegistration(page);

    /*
     * Batas penilaian error konsol. Setelah titik ini server dimatikan, jadi
     * `net::ERR_CONNECTION_REFUSED` itu AKAN muncul — dan itu memang bukti
     * luring bekerja, bukan bug. Tanpa batas ini, pemeriksaannya selalu gagal
     * justru karena pengujiannya berhasil.
     */
    errorsBeforeOffline.push(...consoleErrors);

    await checkOffline(browser, page, consoleErrors);
  } finally {
    await context.close();
    await browser.close();
    await stopServer();
  }

  check(
    "tidak ada error konsol saat aplikasi online",
    errorsBeforeOffline.length === 0,
    errorsBeforeOffline.slice(0, 3).join(" | ") || "0 error",
  );

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan PWA lulus."
      : `\n${failures} pemeriksaan GAGAL.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("Pengujian PWA gagal:", error);
  await stopServer();
  process.exit(1);
});
