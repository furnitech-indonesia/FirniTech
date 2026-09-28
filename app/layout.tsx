import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { iconUrl } from "@/lib/icon-version";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Viewport eksplisit. Next sudah memberi nilai default, tetapi kita perlu
 * `viewport-fit=cover` agar notch dan home indicator iOS tidak menutupi
 * konten saat aplikasi dibungkus Capacitor (PRD §7.2).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Jangan batasi zoom: membatasi zoom merusak aksesibilitas.
  maximumScale: 5,
  viewportFit: "cover",
  /*
   * `themeColor` WAJIB sama dengan `theme_color` di `app/manifest.ts`. Dua
   * nilai ini dibaca oleh dua sistem berbeda — Android memakai yang dari
   * viewport untuk Address bar saat aplikasi terpasang, dan memakai yang dari
   * manifest untuk layar splash. Kalau hanya salah satu yang diisi, layar
   * pertama aplikasi terlihat seperti aplikasi lain.
   *
   * `media` dipakai agar tema gelap (yang memang ada, lihat
   * `prefers-color-scheme` di globals.css) memakai warna yang sama —
   * FurniTech memakai slate navy untuk terang dan gelap, jadi warnanya sama.
   */
  themeColor: "#0F172A",
};

export const metadata: Metadata = {
  title: "FurniTech",
  description:
    "SaaS multi-tenant untuk pengrajin dan UMKM mebel: storefront, back-office, dan progress tracker.",
  /*
   * `manifest` dan `icons` di sini, bukan hanya di `app/manifest.ts`. Tanpa
   * `<link rel="manifest">` yang ditambahkan Next, berkas manifest tidak akan
   * ditemukan browser sama sekali — `test:pwa` yang memeriksanya.
   */
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Menghilangkan bilah URL Safari saat aplikasi ditambahkan ke layar utama.
    capable: true,
    title: "FurniTech",
    statusBarStyle: "black-translucent",
  },
  /*
   * URL ikon diberi `?v=<hash isi berkas>`.
   *
   * Tanpa itu, ikon yang sudah ter-cache di browser TIDAK PERNAH diambil
   * ulang — nama file-nya tetap, jadi URL-nya tetap. Gejalanya sangat
   * membingungkan: `favicon.png` di server sudah benar (terbukti dari
   * hash-nya), tapi tab browser masih menampilkan yang lama, dan tidak ada
   * jejaknya bahwa ini cache. "Solusi" yang sering orang pilih adalah
   * menyuruh pengguna mengosongkan cache — itu memindahkan pekerjaan ke
   * orang lain, bukan memperbaiki masalahnya.
   */
  icons: {
    icon: [
      { url: iconUrl("/favicon.png"), sizes: "64x64", type: "image/png" },
      { url: iconUrl("/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: iconUrl("/apple-touch-icon.png"), sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      {/* Tidak ada <head> manual: Inter di-host sendiri oleh next/font,
          jadi tidak ada permintaan ke Google Fonts saat runtime. Penting untuk
          luring dan untuk pembungkus Capacitor (PRD §7.2). */}
      <body className="antialiased">
        {/*
         * Skip-to-content. Tanpa ini, pengguna keyboard harus menabrak semua
         * link navigasi (8+ di back-office) setiap kali mau ke isi halaman.
         * Link disembunyikan sampai menerima fokus — lihat .skip-link di
         * globals.css. Target-nya #konten-utama, ada di setiap <main>.
         */}
        <a href="#konten-utama" className="skip-link">
          Lompat ke konten utama
        </a>
        {children}
        {/* Notifikasi ringan untuk aksi sukses/gagal tanpa memuat ulang. */}
        <Toaster position="top-center" richColors closeButton />
        {/*
          Pendaftaran service worker. Client Component supaya tidak menambah
          JS ke server render; ia tidak merender apa pun.
        */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
