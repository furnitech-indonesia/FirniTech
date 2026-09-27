"use client";

import { useEffect } from "react";

/**
 * Pendaftaran service worker (ROADMAP Sprint 6).
 *
 * Sengaja tidak ada UI "Pasang aplikasi" di sini. Aplikasi PWA bisa
 * dipasang tanpa satu pun kode kita — Chrome dan iOS sudah menampilkan
 "Tambahkan ke layar utama" sendiri. Tombol buatan sendiri yang hanya muncul
 * di sebagian peramban lebih membingungkan daripada membantu, dan yang paling
 * sering terjadi adalah tombolnya muncul justru di browser yang tidak punya
 * fitur tersebut.
 *
 * Yang dilakukan di sini hanya empat hal:
 *   1. Mendaftarkan `/sw.js`.
 *   2. Menunggu `navigator.serviceWorker.ready` supaya bisa memberi tahu
 *      pemanggil (dipakai `test:pwa`) bahwa pendaftaran benar-benar selesai —
 *      bukan sekadar "tidak melempar error".
 *   3. Meminta pembaruan saat ada service worker baru, lalu memuat ulang
 *      halaman SEKALI. Tanpa ini, pengguna bisa terjebak di versi lama
 *      sampai tab-nya ditutup.
 *   4. Menerima pesan `SKIP_WAITING` dari service worker.
 *
 * TIDAK didaftarkan saat `next dev`. Service worker yang cache chunk
 * berhash akan membuat HMR menampilkan versi lama tanpa ada yang salah secara
 * terlihat — debugging-nya melelahkan. Build produksi tetap punya SW, jadi
 * pengujian `test:pwa` tidak kehilangan apa pun.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloading = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        // Tandai DOM-nya supaya `test:pwa` bisa menunggu dan bukan menebak
        // dengan `waitForTimeout` yang lamanya tidak jelas.
        document.documentElement.dataset.swReady = "1";

        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            // `controller` ada artinya ada SW lama yang masih aktif, jadi ini
            // PEMBARUAN, bukan pemasangan pertama. Tanpa pengecekan ini,
            // kunjungan pertama pun akan memuat ulang halaman sendiri.
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              incoming.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        // Kegagalan pendaftaran tidak boleh menggagalkan halaman. PWA tanpa
        // service worker tetap bisa dibuka; yang hilang hanya luring.
        console.error("Pendaftaran service worker gagal:", error);
      }
    };

    void register();

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Muat ulang tepat SEKALI. Tanpa pengaman ini, `controllerchange`
      // dipanggil lagi oleh `skipWaiting` dan masuk ke reload loop.
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
