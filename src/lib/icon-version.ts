import "server-only";

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";

/**
 * Versi untuk cache-busting URL ikon.
 *
 * MASALAH YANG INI MEMPERBAIKI — dan ini nyata, bukan teori:
 *
 * Ikon PWA dilayani dari `public/` dengan nama file yang TIDAK PERNAH BERUBAH
 * (`favicon.png`, `icon-192.png`, …). Browser meng-cache favicon jauh lebih
 * lebih lama dari aset biasa, dan kuncinya adalah URL. Karena nama file tetap,
 * URL-nya tetap, dan ikon yang sudah ter-cache TIDAK PERNAH diambil ulang —
 * bahkan setelah deploy yang benar-benar berisi ikon baru.
 *
 * Gejalanya persis seperti yang terjadi: `favicon.png` di server sudah berisi
 * yang benar (terverifikasi lewat perbandingan hash dengan berkas lokal), tapi
 * tab browser masih menampilkan ikon yang lama. Kalau tidak dicek lewat hash,
 * penyebabnya tidak akan pernah ketahuan — yang terlihat hanya "kenapa sudah
 * ku-push tapi tidak berubah".
 *
 * SOLUSINYA: tambahkan `?v=<hash isi berkas>` ke URL ikon. Begitu isinya
 * berubah, hash-nya berubah, URL-nya baru, dan browser otomatis mengambilnya
 * ulang. Tanpa deploy, tanpa urutan cache yang harus dikosongkan pengguna.
 *
 * Hash diambil dari ISI KELIMA berkas ikon, bukan dari satu. Kalau hanya
 * `favicon.png` yang di-hash, mengubah `icon-192.png` tidak mengubah URL
 * favicon — dan itu perubahan yang mustahil dilacak nanti.
 *
 * Dibaca saat BUILD, bukan saat request: `layout.tsx` dan `manifest.ts`
 * berjalan di server, dan `next build` sudah membacanya. Untuk PWA statis
 * hasilnya build-time, yang memang yang diinginkan — semua pengguna mendapat
 * versi yang sama, tanpa query database per request.
 */
const ICON_FILES = [
  "public/favicon.png",
  "public/apple-touch-icon.png",
  "public/icon-192.png",
  "public/icon-512.png",
  "public/icon-maskable-512.png",
] as const;

let cached: string | null = null;

export function iconVersion(): string {
  if (cached !== null) return cached;

  const hash = createHash("sha256");
  for (const file of ICON_FILES) {
    if (existsSync(file)) {
      // Nama file ikut di-hash juga, supaya daftar yang berubah ikut
      // menghasilkan versi baru.
      hash.update(file);
      hash.update(readFileSync(file));
    } else {
      /*
       * Berkas hilang TIDAK diam-diam diabaikan dengan hasil hash parsial.
       * Kalau `favicon.png` terhapus, hasil parsial tetap menghasilkan URL
       * yang valid — dan 404-nya baru muncul di tab browser, tanpa jejak
       * bahwa generatornya yang salah.
       */
      throw new Error(
        `Ikon tidak ditemukan: ${file}. Jalankan \`npm run make:icons\` ` +
          "untuk membuatnya dari public/icon.svg.",
      );
    }
  }
  cached = hash.digest("hex").slice(0, 8);
  return cached;
}

/** URL ikon dengan versi cache-busting, mis. `/favicon.png?v=1a2b3c4d`. */
export function iconUrl(path: string): string {
  return `${path}?v=${iconVersion()}`;
}
