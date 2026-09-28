import type { MetadataRoute } from "next";

import { iconUrl } from "@/lib/icon-version";

/**
 * Manifest PWA (ROADMAP Sprint 6).
 *
 * Sengaja TIDAK memakai `public/manifest.json` statis: file di `public/` tidak
 * bisa memakai helper, dan `theme_color`/`background_color` harus sama dengan
 * yang dipakai `<meta name="theme-color">` di `viewport` — kalau keduanya
 * ditulis di dua tempat berbeda, yang satu akan tertinggal saat warnanya
 * diubah. Di sini keduanya dibaca dari token yang sama.
 *
 * Syarat installability yang diperiksa Chrome/Edge:
 *   - ada ikon 192px dan 512px         → `icons`
 *   - ada `start_url` dan `display`     → keduanya di bawah
 *   - ada halaman 200 untuk `start_url` → `/` (dicek `test:pwa`)
 *   - ada service worker dengan fetch handler → `public/sw.js`
 *
 * `display: standalone` dipakai, bukan `fullscreen`: aplikasi ini dipakai
 * sambil membuka WhatsApp untuk kirim foto progres, dan `fullscreen`
 * menyembunyikan bilah status sehingga tidak ada cara melihat jam atau sinyal.
 *
 * `start_url` TIDAK membawa query parameter: keranjang ada di cookie, jadi
 * tidak ada state yang perlu dibawa lewat URL.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FurniTech — Toko & Produksi Mebel",
    short_name: "FurniTech",
    description:
      "Katalog mebel, lacak pesanan, dan ruang kerja pengrajin dalam satu aplikasi.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    categories: ["business", "shopping", "productivity"],
    /*
     * `?v=<hash>` di sini juga. Chrome meng-cache manifest-nya sendiri,
     * jadi tanpa versi, aplikasi yang sudah terpasang akan terus memakai
     * ikon lama meskipun manifest yang tersimpan sudah yang baru.
     */
    icons: [
      {
        src: iconUrl("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconUrl("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconUrl("/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Lacak pesanan",
        short_name: "Lacak",
        description: "Cek status pesanan dengan kode dan nomor WhatsApp.",
        url: "/lacak",
      },
      {
        name: "Daftar toko",
        short_name: "Daftar",
        description: "Cari pengrajin mebel di sekitarmu.",
        url: "/daftar",
      },
    ],
  };
}
