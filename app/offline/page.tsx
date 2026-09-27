import type { Metadata } from "next";
import Link from "next/link";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr";

import { RetryButton } from "@/components/retry-button";

/**
 * Halaman luring (ROADMAP Sprint 6).
 *
 * Ditampilkan service worker ketika navigasi gagal. Yang menentukan di sini
 * adalah kejujuran, bukan animasi luring yang lucu:
 *   - Tidak ada yang mengarang isi pesanan, katalog, atau saldo.
 *     Halaman ini tidak tahu apa pun tanpa jaringan, dan berpura-pura
 *     sebaliknya hanya membuat orang menunggu.
 *   - Ada tombol "Coba lagi" yang benar-benar memuat ulang halaman, bukan
 *     hanya tautan ke beranda — pembeli yang sedang mengetik alamat tidak
 *     boleh kehilangan isiannya.
 *   - Ada penanda jelas "luring" supaya pengguna tahu ini bukan aplikasi yang
 *     rusak. PRD §3.1 mensyaratkan penanda yang jelas untuk keadaan kosong/
 *     gagal; keadaan luring termasuk kategorinya.
 *
 * `noindex` supaya halaman ini tidak masuk hasil pencarian — tidak ada yang
 * perlu mencari "FurniTech sedang luring".
 */
export const metadata: Metadata = {
  title: "Luring — FurniTech",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      id="konten-utama"
      className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 px-4 py-10"
    >
      <div className="grid gap-3">
        <WifiSlashIcon
          size={32}
          weight="light"
          className="text-muted-foreground"
          aria-hidden
        />
        <h1 className="text-headline-md text-foreground">Tidak ada koneksi</h1>
        <p className="text-body-md text-muted-foreground text-pretty">
          Halaman ini butuh internet. Katalog, daftar pesanan, dan status
          pembaruan semuanya diambil langsung dari server, jadi tidak ada
          versi lamanya yang bisa ditampilkan di sini.
        </p>
      </div>

      {/* Alasannya ada di `RetryButton`; singkatnya `href=""` itu navigasi
          ke URL yang sama, bukan memuat ulang. */}
      <RetryButton />

      <p className="text-body-sm text-muted-foreground">
        Halaman yang sudah pernah dibuka tetap bisa dibuka lagi saat jaringan
        sudah normal.{" "}
        <Link
          href="/"
          className="text-primary underline underline-offset-2"
        >
          Kembali ke beranda
        </Link>
      </p>
    </main>
  );
}
