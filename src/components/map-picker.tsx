"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

import "leaflet/dist/leaflet.css";

/**
 * Pemilih titik koordinat dengan Leaflet + OpenStreetMap.
 *
 * Kenapa Leaflet dan bukan MapLibre GL: MapLibre harus 20,7 MB belum dikompres
 * dan butuh WebGL, sedangkan kebutuhan di sini cuma satu — menandai satu titik
 * yang bisa diklik. Leaflet 1.9.4 jauh lebih kecil, jalan tanpa WebGL, dan
 * di HP kelas bawah tidak menjadi layar kosong karena GPU tidak tersedia.
 *
 * Kenapa `import()` dinamis di dalam efek: Leaflet menyentuh `window` saat
 * modul dimuat, jadi tidak bisa di-SSR dan tidak boleh masuk bundel utama.
 * Impor statis — bahkan di berkas "use client" — akan menariknya ke bundel
 * yang dimuat setiap pengunjung, termasuk yang tidak pernah menyentuh peta.
 * Peta hanya dimuat ketika benar-benar dibuka.
 *
 * TENTANG MARKER DEFAULT: `L.marker()` bawaan gagal di bundler modern karena
 * mencari gambar PNG lewat `L.Icon.Default.imageUrl`, dan asset-nya tidak ikut
 * terbawa. Solusinya di sini `L.circleMarker`, yang digambar sebagai SVG di
 * dalam CSS — tanpa file gambar sama sekali, dan tidak ada aset yang bisa 404.
 *
 * TILE OSM. `tile.openstreetmap.org` DILARANG untuk penggunaan komersial atau
 * berskala besar oleh kebijakan penggunaan OSM. URL tile karena itu lewat
 * `NEXT_PUBLIC_OSM_TILE_URL` supaya produksi bisa menunjuk penyedia berizin
 * tanpa menyentuh kode ini. Atribut © OpenStreetMap contributors wajib tampil.
 *
 * PETA TIDAK WAJIB. Komponen ini hanya offered sebagai CoordinatesField
 * — nilai lat/lng bisa diisi dengan geolokasi atau dikosongkan.
 */

/**
 * Tile bawaan = tile OSM publik, untuk pengembangan saja.
 *
 * `NEXT_PUBLIC_OSM_TILE_URL` menggantikannya untuk produksi. Kalau variabel itu
 * diisi, `??` di bawah tidak pernah memakai nilai ini.
 */
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type LatLng = { lat: number; lng: number };

/**
 * Titik tengah Indonesia — dipakai kalau tidak ada lokasi yang diketahui.
 *
 * Bertipe `LatLng` (bukan tuple `[number, number]`) supaya bisa langsung
 * disatukan dengan `value` dan `center` lewat `??`. Kalau dibiarkan sebagai
 * tuple, `value ?? center ?? INDONESIA_CENTER` jadi union dan akses `.lat`
 * gagal saat typecheck.
 */
const INDONESIA_CENTER: LatLng = { lat: -2.5486, lng: 118.0146 };

export function MapPicker({
  /** Titik awal & nilai saat ini. */
  value,
  onChange,
  /** Dipakai untuk menggeser peta ke titik terakhir yang dipilih. */
  center,
  heightClass = "h-64",
}: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  center?: LatLng | null;
  heightClass?: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  /*
   * Callback disimpan di ref supaya handler `map.on("click")` yang dibuat
   * SEKALI di efek mount tidak perlu dilepas-dibuat setiap render.
   *
   * Penulisannya di dalam `useEffect`, bukan di body komponen: menulis
   * `ref.current` saat render dilarang aturan `react-hooks/refs`, dan itu
   * memang berbahaya — pada render yang dibatalkan, ref sudah tertulis ke
   * nilai yang belum pernah dipakai sebagai commit.
   */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !holder.current) return;

        // Jangan buat peta dua kali: efek ini bisa berjalan ulang saat React
        // Strict Mode, dan `L.map()` pada elemen yang sudah punya peta melempar
        // "Map container is already initialized".
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const start = value ?? center ?? INDONESIA_CENTER;
        const map = L.map(holder.current, {
          center: [start.lat, start.lng],
          zoom: value || center ? 15 : 5,
          // Scroll roda untuk zoom sangat mengganggu saat halaman yang sama
          // bisa digeser. Zoom lewat tombol +/−, supaya orang tidak terjebak
          // melakukan zoom saat sedang menggulir daftar.
          scrollWheelZoom: false,
        });

        L.tileLayer(
          process.env.NEXT_PUBLIC_OSM_TILE_URL || DEFAULT_TILE_URL,
          { attribution: TILE_ATTRIBUTION, maxZoom: 19 },
        ).addTo(map);

        const place = (latLng: LatLng, withPopup = false) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([latLng.lat, latLng.lng]);
          } else {
            markerRef.current = L.circleMarker([latLng.lat, latLng.lng], {
              radius: 9,
              color: "#ffffff",
              weight: 3,
              fillColor: "#b45309",
              fillOpacity: 1,
            }).addTo(map);
          }
          if (withPopup) map.panTo([latLng.lat, latLng.lng]);
        };

        if (value) place(value);

        map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
          const next = { lat: event.latlng.lat, lng: event.latlng.lng };
          place(next, true);
          onChangeRef.current(next);
        });

        mapRef.current = map;
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Sengaja hanya dijalankan sekali. Titik yang berubah di-propagasi lewat
    // efek terpisah di bawah, bukan dengan membuat ulang peta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan nilai dari luar (mis. dari geolokasi) tanpa membuat ulang peta.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value || state !== "ready") return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]).addTo(map);
    } else {
      // Penanda belum ada (nilai datang dari luar, mis. geolokasi) — buat
      // sekalian. `L` sudah ada di bundel karena peta sudah siap, tapi
      // 'window.L' tidak pernah ada: Leaflet yang diimpor lewat `import()`
      // tidak memasang dirinya ke global.
      void import("leaflet").then((mod) => {
        if (!mapRef.current) return;
        const L = mod.default;
        markerRef.current = L.circleMarker([value.lat, value.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#b45309",
          fillOpacity: 1,
        }).addTo(mapRef.current);
      });
    }
  }, [value, state]);

  return (
    <div className="grid gap-2">
      <div
        ref={holder}
        className={`${heightClass} w-full overflow-hidden rounded-xl border border-border bg-muted`}
        aria-label="Peta untuk memilih titik lokasi"
      />

      <p aria-live="polite" className="text-body-sm text-muted-foreground">
        {state === "loading"
          ? "Memuat peta…"
          : state === "error"
            ? "Peta tidak bisa dimuat. Titik lokasi masih bisa diisi dengan tombol “Pakai lokasi saya”."
            : value
              ? `Titik dipilih. Ketuk peta untuk memindahkan penanda (${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}).`
              : "Ketuk peta untuk menandai lokasi."}
      </p>
    </div>
  );
}
