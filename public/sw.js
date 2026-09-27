/* eslint-disable */
/**
 * Service worker FurniTech (ROADMAP Sprint 6).
 *
 * Dua prinsip menentukan seluruh isi berkas ini:
 *
 * 1. TIDAK ADA HTML YANG DI-CACHE. Halaman dirender di server dan isinya
 *    berbeda per orang: keranjang ada di cookie, menu back-office bergantung
 *    role, dan `/lacak` tidak boleh pernah menampilkan pesanan orang lain.
 *    HTML yang tersimpan lalu disajikan ke orang berikutnya adalah kebocoran
 *    data, bukan fitur luring. Jadi navigasi selalu network-first, dan kalau
 *    jaringan gagal kita menampilkan `/offline` — bukan halaman basi.
 *
 * 2. ASET STATIS SAJA YANG DI-CACHE, DAN HANYA YANG HASHED. Chunk JS/CSS Next
 *    memakai nama berhash isi, jadi nama yang sama dijamin isi yang sama —
 *    aman di-cache dan tidak akan pernah basi. Ikon di `public/` juga aman
 *    karena tidak berubah tanpa deploy baru.
 *
 * Yang SENGAJA tidak disentuh:
 *   - `/api/**` (webhook Midtrans, CSR FCM). Kalau notifikasi dilayani dari
 *     cache, Midtrans akan menerima 200 palsu dan berhenti mengirim.
 *   - Permintaan non-GET. `POST` ke Server Action tidak boleh dilayani dari
 *     cache; dari cache berarti "berhasil" tanpa efek.
 *
 * `CACHE_VERSION` dinaikkan setiap kali strateginya berubah. Nama cache yang
 * sama dengan isi berbeda membuat aset lawas ikut tersimpan dan tidak pernah
 * dibersihkan. Cache yang tidak pernah kosong adalah penyebab klasik "kenapa
 * perubahan saya tidak muncul".
 */

const CACHE_VERSION = "v4";
const STATIC_CACHE = "furni-static-" + CACHE_VERSION;
const RUNTIME_CACHE = "furni-runtime-" + CACHE_VERSION;

/**
 * Halaman yang di-precache utuh (HTML + semua chunk yang dirujuknya).
 *
 * `/` dan `/offline` saja. Keduanya aman: `/` adalah landing page platform
 * yang dirender sama untuk semua orang dan tidak memuat apa pun dari cookie,
 * sedangkan `/offline` memang halaman cadangan. Halaman storefront, lacak, dan
 * back-office TIDAK pernah masuk daftar ini — isinya berbeda per orang.
 */
const PRECACHE_PAGES = ["/", "/offline"];

/** Aset tetap yang kecil dan selalu dibutuhkan. */
const PRECACHE_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.png",
  "/apple-touch-icon.png",
];

/**
 * Ambil semua URL `/_next/static/…` yang dirujuk sebuah dokumen.
 *
 * Regex, bukan parser HTML: yang dibutuhkan hanya daftar atribut `src`/`href`
 * yang persis menunjuk folder build, dan dokumennya sendiri dihasilkan
 * oleh kami — tidak ada input pihak ketiga yang bisa menyisipkan tag.
 *
 * Ini yang membuat precache berarti. Tanpa langkah ini, hanya HTML `/offline`
 * yang tersimpan; chunk JS-nya baru masuk cache kalau kebetulan pernah
 * dikunjungi saat online. Gejalanya: halaman luring tampil, tapi tombolnya
 * mati karena React tidak pernah hydrasi — dan tidak ada satu pun error yang
 * menyentuhnya.
 */
function referencedChunks(html) {
  const found = new Set();
  const pattern = /\/_next\/static\/[A-Za-z0-9._/-]+/g;
  let match = pattern.exec(html);
  while (match !== null) {
    found.add(match[0]);
    match = pattern.exec(html);
  }
  return found;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      for (const url of PRECACHE_ASSETS) {
        // Di-add satu per satu, bukan `addAll`. `addAll` gagal seluruhnya
        // kalau satu URL 404, dan `install` yang gagal berarti tidak ada
        // service worker sama sekali — satu ikon yang terhapus cukup membuat
        // seluruh PWA tidak bisa dipasang.
        await cache.add(new Request(url, { cache: "reload" })).catch(function () {});
      }

      for (const page of PRECACHE_PAGES) {
        try {
          const response = await fetch(new Request(page, { cache: "reload" }));
          if (!response.ok) continue;
          const clone = response.clone();
          await cache.put(new Request(page), clone);

          const html = await response.text();
          const chunks = Array.from(referencedChunks(html));
          await Promise.all(
            chunks.map(function (chunk) {
              return cache.add(new Request(chunk, { cache: "reload" })).catch(function () {});
            }),
          );
        } catch (error) {
          // Halaman precache yang gagal tidak menghalangi pendaftaran.
          // Yang hilang hanya luring untuk halaman itu.
        }
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, RUNTIME_CACHE];
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(function (name) {
            return name.indexOf("furni-") === 0 && keep.indexOf(name) === -1;
          })
          .map(function (name) {
            return caches.delete(name);
          }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Dipakai halaman untuk memaksa pembaruan setelah deploy baru.
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** Aset statis: hashed Next atau file gambar/font. */
function isStaticAsset(url) {
  return (
    url.pathname.indexOf("/_next/static/") === 0 ||
    /\.(png|svg|webp|woff2?|ico)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  /*
   * Hanya 200 basic. Respons error (404 dari aset yang dihapus) tidak boleh
   * masuk cache — cache-first membuat 404 itu bertahan selamanya, dan aset
   * dengan nama yang sama akan terus dikembalikan meski sudah dibuat ulang.
   */
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    /*
     * `cache: "no-store"` itu WAJIB, bukan optimasi.
     *
     * Tanpa itu, Chromium tetap melayani navigasi dari HTTP cache ketika
     * perangkat luring — dan halaman yang muncul adalah HTML lama milik
     * orang yang pernah membuka URL itu: keranjang berisi barang, menu
     * back-office milik role lain, atau halaman lacak dengan pesanan orang
     * lain. Ini persis kebocoran yang prinsip 1 di kepala berkas ini mau
     * cegah, dan gejalanya tidak muncul saat online sama sekali — memang
     * tidak akan terlihat sampai ada orang yang benar-benar luring.
     *
     * Halaman Next sudah `Cache-Control: no-store` untuk route dinamis, jadi
     * `no-store` di sini tidak menghilangkan cache yang memang berguna.
     */
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error("status " + response.status);
    return response;
  } catch (error) {
    /*
     * Dua tingkat fallback, dan urutannya penting.
     *
     * 1. Kalau URL yang diminta termasuk halaman yang di-precache (`/` atau
     *    `/offline`), sajikan dokumen itu. Versi pertama selalu melompat
     *    langsung ke `/offline`, sehingga dokumen beranda yang sudah
     *    di-precache tidak pernah dipakai — precache-nya jadi mubazir dan
     *    "shell aplikasi termuat saat luring" hanya berupa halaman permintaan
     *    maaf.
     * 2. Selain itu, sajikan `/offline`. Tidak ada satu pun HTML lain yang
     *    boleh disajikan: isinya berbeda per orang (keranjang, role, pesanan
     *    yang dilacak).
     *
     * `caches.match`, bukan `cache.match`: halaman ini ada di cache STATIC,
     * sedangkan versi pertama membuka cache RUNTIME dan tidak pernah
     * menemukannya, sehingga selalu jatuh ke HTML minimalist.
     */
    const pathname = new URL(request.url).pathname;
    const isPrecached = PRECACHE_PAGES.indexOf(pathname) !== -1;
    const fallback = isPrecached ? await caches.match(new Request(pathname)) : null;
    if (fallback) return fallback;

    const offline = await caches.match("/offline");
    if (offline) return offline;

    /*
     * Bahkan halaman offline pun tidak ada di cache (mis. `/offline` gagal
     * di-precache). Balas dengan HTML minimal yang jujur — layar putih dengan
     * penjelasan jauh lebih baik daripada pesan error browser yang tidak bisa
     * dibaca orang awam.
     */
    return new Response(
      '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        "<title>Luring — FurniTech</title></head>" +
        '<body style="font-family:system-ui,sans-serif;margin:0;padding:24px;line-height:1.6">' +
        '<h1 style="font-size:20px;margin:0 0 8px">Tidak ada koneksi</h1>' +
        "<p style=\"margin:0\">Halaman ini butuh internet. Coba lagi saat jaringan tersedia.</p>" +
        "</body></html>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Hanya domain sendiri. Aset dari origin lain (tile peta, dll) tidak boleh
  // masuk cache kita tanpa sengaja: respons `no-cors` bersifat opaque, body-nya
  // tidak bisa dibaca, dan menyajikan ulang respons itu ke domain yang berbeda
  // berisiko melanggar aturan CORS yang mengizinkan server pengirimannya.

  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
