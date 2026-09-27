import { mkdirSync } from "fs";
import { chromium } from "playwright";

/**
 * Buat ikon PWA (PNG) dari SVG.
 *
 * Kenapa tidak langsung menulis PNG: tidak ada pustaka gambar di repo ini, dan
 * menambahkan `sharp` hanya untuk menghasilkan empat file sekali seumur
 * proyek adalah dependensi yang tidak sepadan. Chromium yang sudah terpasang
 * untuk pengujian visual bisa merender SVG dan menyimpannya sebagai PNG —
 * hasilnya sama persis dengan yang diinstal di layar utama ponsel.
 *
 * Ikon dibuat dari bentuk yang sederhana dan bisa dibaca pada 48px: bangku
 * mebel bergaya furnitur klasik, di atas latar amber FurniTech. Logo yang
 * detail justru jadi berantakan saat diperkecil, dan Android hanya
 * menampilkan 48px di layar utama.
 *
 * Jalankan: npx tsx scripts/make-icons.ts
 */
const OUT = "public";

type Spec = {
  file: string;
  size: number;
  /** Ikon "maskable" diberi ruang kosong supaya aman di lingkaran/putar. */
  maskable: boolean;
};

/** Isi ikon sebagai SVG. Parameter `pad` rasio ruang kosong. */
function svg(size: number, pad: number): string {
  const s = size;
  const inner = s * (1 - pad * 2);
  const o = s * pad;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${maskableRadius(s, pad)}" fill="#0F172A"/>
  <rect x="${o}" y="${o}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="#D97706"/>
  <g fill="#0F172A" transform="translate(${o}, ${o}) scale(${inner / 100})">
    <!-- Sandaran -->
    <rect x="22" y="30" width="56" height="9" rx="4.5"/>
    <!-- Dudukan -->
    <rect x="20" y="50" width="60" height="10" rx="5"/>
    <!-- Kaki -->
    <rect x="24" y="60" width="9" height="22" rx="4"/>
    <rect x="67" y="60" width="9" height="22" rx="4"/>
  </g>
</svg>`;
}

/**
 * Sudut membulat hanya untuk ikon biasa.
 *
 * Ikon maskable memakai persegi penuh: sistem akan memotongnya sendiri
 * (lingkaran, pill, atau bahkan lingkaran kecil saat di-badge), dan rounded
 * corner yang kita gambar sendiri akan tergigit dua kali — hasilnya ada
 * sudut kosong di tepi ikon tempat sistem memotong.
 */
function maskableRadius(size: number, pad: number): number {
  return pad === 0 ? 0 : size * 0.22;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const specs: Spec[] = [
    { file: "icon-192.png", size: 192, maskable: false },
    { file: "icon-512.png", size: 512, maskable: false },
    // Android memakai maskable untuk layar utama adaptive icon.
    { file: "icon-maskable-512.png", size: 512, maskable: true },
    { file: "apple-touch-icon.png", size: 180, maskable: false },
    // Favicon kecil: dipakai tab browser, dan disambungkan dari layout.
    { file: "favicon.png", size: 64, maskable: false },
  ];

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const spec of specs) {
    // Ikon maskable diberi 10% ruang kosong di setiap sisi.
    const pad = spec.maskable ? 0.1 : 0;
    await page.setViewportSize({ width: spec.size, height: spec.size });
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;padding:0;background:transparent}</style>
       ${svg(spec.size, pad)}`,
      { waitUntil: "load" },
    );
    await page.screenshot({
      path: `${OUT}/${spec.file}`,
      omitBackground: true,
    });
    console.log(`+ ${spec.file} (${spec.size}px${spec.maskable ? ", maskable" : ""})`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error("Gagal membuat ikon:", error);
  process.exit(1);
});
