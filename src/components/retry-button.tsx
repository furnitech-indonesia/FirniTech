"use client";

/**
 * Tombol "Coba lagi" di halaman luring (ROADMAP Sprint 6).
 *
 * Kenapa bukan `<Link href="">`: `href` kosong menunjuk ke URL yang sedang
 * dibuka, jadi yang terjadi adalah navigasi ke dokumen yang sama — bukan
 * memuat ulang. Saat server masih mati, service worker akan menyajikan
 * halaman luring lagi, dan orang melihat tombol yang "tidak bekerja" tanpa
 * ada pesan apa pun. Link Next juga butuh JavaScript untuk diproses, sedangkan
 * `location.reload()` adalah perilaku bawaan peramban yang selalu ada.
 *
 * `window.location.reload()` memuat ulang URL yang sedang dibuka — persis yang
 * dibutuhkan: orang berada di halaman luring karena halaman ASLINYA gagal
 * dimuat, dan ketika jaringan sudah normal, memuat ulang akan mengambil
 * URL itu lagi, bukan `/offline`.
 */
export function RetryButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary/90"
      }
    >
      Coba lagi
    </button>
  );
}
