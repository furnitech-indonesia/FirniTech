/**
 * Data wilayah Indonesia untuk form alamat (Sprint 5, bagian 2).
 *
 * Modul ini AMAN dipakai di Client Component — tidak ada `server-only`, tidak
 * ada secret, hanya `fetch` ke API statis publik.
 *
 * Bentuk hybrid, disengaja:
 *
 * | Level            | Sumber                | Ukuran  | Luring? |
 * |------------------|-----------------------|---------|---------|
 * | Provinsi         | snapshot di bundel    | 23,7 KB | Ya      |
 * | Kabupaten/Kota   | snapshot di bundel    | (dalam) | Ya      |
 * | Kecamatan        | fetch on-demand       | 3,2 KB  | Tidak*  |
 * | Desa/Kelurahan   | fetch on-demand       | 0,7-8 KB| Tidak*  |
 *
 * *) Dua level terakhir diambil dari jaringan dan di-cache di `localStorage`,
 * jadi membutuhkan jaringan SAMPIL PERTAMA kali saja.
 *
 * Kenapa tidak semuanya di snapshot: ada ~83.000 desa. Semuanya di bundel
 * akan menambah beberapa MB ke main bundle yang dimuat setiap pengunjung.
 * Kenapa tidak semuanya live: dropdown pertama akan selalu bergantung
 * jaringan, dan tidak ada gunanyadropdown yang tidak bisa dibuka di tempat
 * dengan sinyal jelek.
 *
 * SUMBER DATA: https://www.emsifa.com/api-wilayah-indonesia/v2
 * Gratis, tanpa API key. Dibangun dari Kepmendagri/BIG (wilayah) dan
 * cahyadsn/wilayah_kodepos (kode pos).
 *
 * JEBAKAN FORMAT ID: v2 memakai id BERTITIK — "32.73" (kabupaten),
 * "32.73.01" (kecamatan), "32.73.01.1001" (desa). Versi lama v1 memakai id
 * rapat ("3273"). Mengirim id v1 ke endpoint v2 membalas 404. Karena itu
 * setiap fungsi di sini memakai id apa adanya dari level sebelumnya; tidak
 * ada penyusunan ulang format di mana pun.
 */

import snapshot from "./wilayah-snapshot.json";

const BASE = "https://www.emsifa.com/api-wilayah-indonesia/v2";

export type Region = { id: string; name: string };

export type Village = {
  id: string;
  name: string;
  /** Bisa null: ada desa yang belum punya kode pos di dataset. */
  postal_code?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export const provinces = snapshot.provinces as Region[];

export function regenciesOf(provinceId: string): Region[] {
  return (snapshot.regencies as Record<string, Region[]>)[provinceId] ?? [];
}

/** Nama provinsi dari id, untuk ditampilkan di ringkasan. */
export function provinceName(id: string): string {
  return provinces.find((p) => p.id === id)?.name ?? id;
}

export function regencyName(id: string): string {
  for (const list of Object.values(snapshot.regencies as Record<string, Region[]>)) {
    const found = list.find((r) => r.id === id);
    if (found) return found.name;
  }
  return id;
}

const CACHE_PREFIX = "furni:wilayah:";
const CACHE_MAX_AGE_MS = 30 * 86_400_000; // 30 hari

type CacheEntry<T> = { at: number; data: T };

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.at > CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    // localStorage bisa diblokir (mode privat Safari, atau kebijakan iframe).
    // Itu bukan alasan untuk menggagalkan form — cache hanya pengoptimalan.
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    // Kuota penuh atau storage diblokir. Diabaikan.
  }
}

/**
 * Ambil daftar anak dari API wilayah, dengan cache browser.
 *
 * `signal` diteruskan supaya form yang ditutup membatalkan request-nya.
 * Mengembalikan `null` kalau gagal — pemanggil WAJIB punya jalur yang tetap
 * memungkinkan orang menyelesaikan form (mis. mengetik nama desa sendiri).
 * Gagal di tengah checkout tidak boleh berarti orang tidak bisa memesan.
 */
async function fetchChildren<T>(path: string, signal?: AbortSignal): Promise<T[] | null> {
  const cached = readCache<T[]>(path);
  if (cached) return cached;

  try {
    const response = await fetch(`${BASE}${path}`, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: T[] };
    if (!Array.isArray(body.data)) return null;
    writeCache(path, body.data);
    return body.data;
  } catch {
    return null;
  }
}

export async function districtsOf(
  regencyId: string,
  signal?: AbortSignal,
): Promise<Region[] | null> {
  return fetchChildren<Region>(`/districts/${regencyId}.json`, signal);
}

export async function villagesOf(
  districtId: string,
  signal?: AbortSignal,
): Promise<Village[] | null> {
  return fetchChildren<Village>(`/villages/${districtId}.json`, signal);
}

/**
 * Buang awalan "Kabupaten"/"Kota" dari nama wilayah.
 *
 * Ini hanya untuk TAMPILAN ringkasan. Pencocokan tarif ongkir memakai id,
 * bukan nama — lihat catatan "jebakan integrasi ongkir" di ROADMAP.md
 * Sprint 5 bagian 3. Fungsi ini tidak boleh dipakai untuk pencocokan.
 */
export function shortRegionName(name: string): string {
  return name.replace(/^(Kabupaten|Kota)\s+/i, "").trim();
}
