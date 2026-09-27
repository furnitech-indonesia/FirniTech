import Link from "next/link";

import { TrackingLookup } from "@/components/tracking-lookup";

export const metadata = { title: "Lacak pesanan — FurniTech" };

/**
 * Halaman lacak pesanan publik (ROADMAP Sprint 5 bagian 4).
 *
 * Di level platform, bukan di bawah `/t/<slug>`. Alasannya, pembeli sering
 * tidak ingat nama toko tempat ia memesan — ia ingat nama barangnya dan kode
 * pesanannya. Halaman per-toko berarti orang harus menebak tokonya dulu
 * sebelum bisa melihat status pesanannya.
 *
 * Halaman ini TIDAK punya `<main>` miliknya sendiri — `app/layout.tsx` yang
 * menyediakan satu. Dua `<main>` di satu halaman merusak landmark untuk pembaca
 * screen reader, dan `test:responsive` memverifikasi `id="konten-utama"` ada
 * tepat satu kali. Pembungkus `px-4` ada di sini, bukan di layout, supaya
 * halaman yang butuh full-bleed tetap bisa.
 */
export default function TrackOrderPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-headline-lg text-foreground text-balance">
          Lacak pesanan Anda
        </h1>
        <p className="mt-2 max-w-prose text-body-lg text-muted-foreground">
          Masukkan kode pesanan dan nomor WhatsApp yang Anda pakai saat memesan.
          Keduanya harus cocok — jadi halaman ini tidak bisa dipakai untuk melihat
          pesanan orang lain hanya dengan menebak kodenya.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <TrackingLookup />
      </div>

      <p className="mx-auto mt-12 w-full max-w-2xl text-body-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
        .
      </p>
    </div>
  );
}
