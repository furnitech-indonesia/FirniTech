import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
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
};

export const metadata: Metadata = {
  title: "FurniTech",
  description:
    "SaaS multi-tenant untuk pengrajin dan UMKM mebel: storefront, back-office, dan progress tracker.",
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
      </body>
    </html>
  );
}
