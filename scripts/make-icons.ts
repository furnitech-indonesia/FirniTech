import { existsSync, mkdirSync, readFileSync } from "fs";
import { chromium } from "playwright";

/**
 * Buat ikon PWA dari `public/icon.svg`.
 *
 * SUMBER KEBENARAN: `public/icon.svg` — file itu milik tim desain dan skrip
 * ini tidak pernah mengubahnya. Skrip hanya memotong, lalu merender.
 *
 * Kenapa PNG tetap dihasilkan, dan kenapa SVG tidak bisa menggantikannya:
 *   - iOS TIDAK membaca `icons` di web app manifest sama sekali. Yang dipakai
 *     hanya `<link rel="apple-touch-icon">`, dan itu PNG.
 *   - `purpose: "maskable"` harus raster: Android memotong ikon ke lingkaran,
 *     pill, atau belah, lalu memakai bitmap hasil rasterisasi. SVG maskable
 *     tidak didukung.
 *   - Chrome/Lighthouse masih memeriksa ada ikon >= 192 dan >= 512 untuk
 *     menyatakan aplikasi "installable".
 *
 * Jadi lima raster dari satu sumber. Bukan lima file yang harus dijaga sinkron
 * manual.
 *
 * PEMOTONGAN. Logo sumber berisi mark (rumah + kursi) DI ATAS wordmark
 * "FurniTech" dan tagline. Di layar utama Android ukurannya 48px, dan
 * wordmark + tagline pada 48px berubah jadi noda abu-abu — bukan teks. Jadi
 * untuk ikon layar utama hanya mark yang dipakai. Wordmark tetap dipakai di
 * header aplikasi dan halaman login, di mana ukurannya jauh lebih besar.
 *
 * Kotak potong diukur dari `public/icon.svg` (lihat CROP). Kalau logo
 * diekspor ulang dengan proporsi berbeda, angka itu harus diukur ulang dengan
 * `npm run make:icons:measure`.
 *
 * `brand-mark.png` sengaja punya `fill` lebih besar dari ikon PWA: di header
 * logo tampil sebagai lempeng 32px, dan ruang kosong yang terlalu banyak
 * membuatnya terlihat kecil dan tidak seimbang dengan teks di sebelahnya.
 *
 * Jalankan: npm run make:icons
 */

const OUT = "public";
const SOURCE = "public/icon.svg";

/**
 * Isi mark di dalam kanvas sumber, diukur.
 *
 * ANGKA INI DIUKUR DARI FILE, BUKA DIAMBIL DARI DESAIN. Kalau logo diekspor
 * ulang dan posisinya bergeser, potongannya salah dan ikon yang dihasilkan
 * akan berisi potongan wordmark — yang baru terlihat setelah dirender.
 */
const CANVAS = 5016;
const CROP = { x: 1463, y: 847, width: 2078, height: 1991 } as const;

/** Latar ikon, mengikuti file sumber. */
const BACKGROUND = "#ffffff";

type Spec = {
  file: string;
  size: number;
  /**
   * Sudut membulat (persen). `0` = persegi penuh.
   *
   * `apple-touch-icon` dan ikon maskable HARUS persegi penuh: platform itu
   * membulatkan sendiri, dan kalau kita ikut membulatkan, sudutnya tergigit
   * dua kali.
   */
  radius: number;
  /** Rasio sisi yang terisi. */
  fill: number;
};

const SPECS: readonly Spec[] = [
  { file: "favicon.png", size: 64, radius: 0.18, fill: 0.7 },
  /*
   * Untuk dipakai DI DALAM APLIKASI (header, halaman masuk, back-office), bukan
   * untuk dipasang ke layar utama.
   *
   * 128px dipilih karena mark ditampilkan pada 32px di header: itu 4x, jadi
   * tetap tajam di layar Retina tanpa membesarkan berkas. 32px sendiri
   * terlihat pecah saat zoom browser, dan zoom diizinkan sampai 5x.
   */
  { file: "brand-mark.png", size: 128, radius: 0.18, fill: 0.8 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, fill: 0.82 },
  { file: "icon-192.png", size: 192, radius: 0.18, fill: 0.7 },
  { file: "icon-512.png", size: 512, radius: 0.18, fill: 0.7 },
  /*
   * `fill` maskable TIDAK boleh 0,78 hanya karena "Android memotong 20%".
   *
   * Safe zone Android adalah LINGKARAN diameter 80%, bukan persegi 80%.
   * Isi yang memenuhi 78% LELEBAR masih keluar dari lingkaran di bagian atas
   * dan bawah, dan yang terpotong adalah ujung kaki kursi serta dasar
   * dinding rumah — persis bagian yang paling kelihatan.
   *
   * Batasnya: untuk kotak berisi w x h yang terpusat, jarak sudutnya ke
   * pusat adalah (f/2)·√(1 + (w/h)²). Dengan w/h ≈ 1,04, kesamaan dengan
   * radius aman 0,40 memberi f ≈ 0,59. Dipakai 0,58 supaya ada sisa.
   *
   * Nilai 0,78 sudah dicoba dan digagalkan: dinding kanan terpotong di mask
   * lingkaran. Bukti visualnya ada di `screenshots/safe-zone-maskable.png`.
   */
  { file: "icon-maskable-512.png", size: 512, radius: 0, fill: 0.58 },
];

/**
 * Isi file sumber, disiapkan untuk disisipkan.
 *
 * Dua kasus, keduanya harus ditangani:
 *   - `<image xlink:href="data:image/png;base64,…">` — logo FurniTech
 *     sebenarnya begini: bitmap yang dibungkus SVG. Bitmap-nya dipakai
 *     langsung, karena tidak ada bentuk vektor yang bisa diambil dari file
 *     itu.
 *   - `<path>` / kelompok bentuk — SVG vektor asli.
 *
 * Mengabaikan kasus kedua akan menghasilkan ikon kosong, dan itu persis jenis
 * kegagalan yang lolos dari pemeriksaan source code.
 */
type Artwork = { kind: "raster"; imageTag: string } | { kind: "vector"; markup: string };

function readArtwork(): Artwork {
  if (!existsSync(SOURCE)) {
    throw new Error(
      `${SOURCE} tidak ditemukan. Letakkan file SVG logo FurniTech di sana —\n` +
        "nama file dan isinya tidak boleh diubah, karena make-icons.ts memotong\n" +
        "mark dari posisi yang sudah diukur di dalam file itu.",
    );
  }

  const raw = readFileSync(SOURCE, "utf8");
  const image = raw.match(/<image[^>]*\/?>/);
  if (image) return { kind: "raster", imageTag: image[0] };
  return { kind: "vector", markup: raw };
}

function svgFor(art: Artwork, spec: Spec): string {
  const box = 1000;
  const inner = box * spec.fill;
  const scale = Math.min(inner / CROP.width, inner / CROP.height);
  const w = CROP.width * scale;
  const h = CROP.height * scale;

  /*
   * `clipPath` memotong gambar ke kotak mark, lalu `<g>` memindah dan
   * memperkecil hasil potongannya ke tengah kotak.
   *
   * URUTAN PENTING: clip memakai koordinat kanvas ASLI (1463, 847, …), jadi
   * `clipPath` harus berada di ruang koordinat yang sama dengan gambar —
   * yaitu DI LUAR transform `<g>`. Kalau clip ikut berada di dalam `<g>`, ia
   * ikut tergeser dan memotong bagian yang salah, dan yang terbawa ke ikon
   * adalah potongan wordmark.
   */
  const clipped =
    art.kind === "raster"
      ? art.imageTag.replace(/\/?>$/, ' clip-path="url(#mark)"/>')
      : `<g clip-path="url(#mark)">${art.markup}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${box} ${box}" width="${spec.size}" height="${spec.size}">
  <defs>
    <clipPath id="mark" clipPathUnits="userSpaceOnUse">
      <rect x="${CROP.x}" y="${CROP.y}" width="${CROP.width}" height="${CROP.height}"/>
    </clipPath>
  </defs>
  <rect width="${box}" height="${box}" rx="${spec.radius * box}" fill="${BACKGROUND}"/>
  <g transform="translate(${(box - w) / 2} ${(box - h) / 2}) scale(${scale}) translate(${-CROP.x} ${-CROP.y})">
    ${clipped}
  </g>
</svg>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const art = readArtwork();

  console.log(
    art.kind === "raster"
      ? "Sumber: bitmap yang dibungkus di dalam SVG (bukan vektor murni)."
      : "Sumber: SVG vektor.",
  );
  console.log(
    `Mark dipotong dari x${CROP.x} y${CROP.y} ${CROP.width}x${CROP.height} ` +
      `dari kanvas ${CANVAS}x${CANVAS}.\n`,
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const spec of SPECS) {
    await page.setViewportSize({ width: spec.size, height: spec.size });
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${spec.size}px;height:${spec.size}px}</style>
       ${svgFor(art, spec)}`,
      { waitUntil: "load" },
    );
    // Latar sudah digambar sebagai `<rect>` di dalam SVG, jadi
    // `omitBackground` tidak akan membuat berlapis transparan yang tidak
    // berguna.
    await page.screenshot({ path: `${OUT}/${spec.file}`, omitBackground: true });
    const note = spec.radius === 0 ? ", persegi penuh" : "";
    console.log(`+ ${spec.file} (${spec.size}px${note})`);
  }

  await browser.close();
  console.log(
    "\nSemua ikon diperbarui. `manifest.ts`, `layout.tsx`, dan `sw.js`\n" +
      "sudah menunjuk ke nama file ini — tidak ada yang perlu diubah.",
  );
}

main().catch((error) => {
  console.error("Gagal membuat ikon:", error);
  process.exit(1);
});
