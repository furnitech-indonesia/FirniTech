/**
 * Aturan lookup tarif ongkir — versi yang bisa dipakai di server DAN di klien.
 *
 * Kenapa berkas sendiri: urutan lookup (khusus → cadangan → `null`) adalah
 * aturan yang paling mudah salah di repo ini, dan sebelumnya ia hanya hidup
 * di `src/lib/shipping.ts` yang `import "server-only"`. Begitu checkout perlu
 * menampilkan ongkir SEBELUM pembeli menekan tombol bayar, ada dorongan untuk
 * menyalin aturannya ke komponen klien — dan dua salinan aturan yang sama
 * pasti akan menyimpang pada salah satu revisi.
 *
 * Jadi aturan ini dipisah ke modul murni tanpa akses server, dan
 * `findShippingRate()` di `shipping.ts` memakainya juga. Satu tempat, dua
 * pemakai. Modul ini tidak menyentuh database maupun `next/*`, jadi aman
 * masuk bundel klien.
 *
 * Yang TIDAK boleh ada di sini: nilai marched apa pun. Tidak ada `?? 0`, tidak
 * ada tarif terkecil sebagai jaring pengaman. Tidak ada tarif berarti `null`,
 * dan pemanggil WAJIB memblokir — pembeli yang melihat total murah lalu
 * membayar sementara ongkir sebenarnya tidak ditagih adalah kegagalan
 * diam-diam yang paling merusak di checkout.
 */

/** Satu tarif, hanya kolom yang dibutuhkan untuk memutuskan. */
export type ShippingRateInput = {
  regencyId: string | null;
  isDefault: boolean;
  rateAmount: number;
};

export type ShippingIndex = {
  /** Tarif per `regencyId`. Kabupaten tanpa entri berarti tidak punya tarif sendiri. */
  byRegency: Record<string, number>;
  /** Tarif cadangan untuk seluruh wilayah, atau `null` kalau tenant tidak punya. */
  fallback: number | null;
};

export type ShippingLookup = {
  rateAmount: number;
  /** Dari mana tarifnya — ditampilkan ke pembeli sebagai kejelasan, bukan hiasan. */
  source: "specific" | "default";
};

/**
 * Rakit indeks tarif dari daftar tarif milik satu tenant.
 *
 * `isDefault` + `regencyId` tidak boleh dipakai bersamaan (ditegakkan skema),
 * tapi kalau baris aneh itu tetap muncul di sini, `isDefault` menang —
 * karena tarif cadangan berlaku untuk semua wilayah, sedangkan tarif dengan
 * `regencyId` hanya untuk satu kabupaten. Menanganinya di sini membuat
 * `findShippingRate()` di server tidak perlu tahu soal anomali data.
 */
export function buildShippingIndex(rates: readonly ShippingRateInput[]): ShippingIndex {
  const byRegency: Record<string, number> = {};
  let fallback: number | null = null;

  for (const rate of rates) {
    if (rate.isDefault) {
      if (fallback === null) fallback = rate.rateAmount;
      continue;
    }
    if (rate.regencyId && byRegency[rate.regencyId] === undefined) {
      byRegency[rate.regencyId] = rate.rateAmount;
    }
  }

  return { byRegency, fallback };
}

/**
 * Cari tarif untuk satu `regencyId`.
 *
 * Urutannya tidak boleh diubah:
 *   1. tarif dengan `regencyId` yang persis sama
 *   2. tarif cadangan (`isDefault`) untuk semua wilayah
 *   3. `null` — pemanggil harus memblokir, bukan memakai angka apa pun
 */
export function lookupShippingRate(
  index: ShippingIndex,
  regencyId: string | null | undefined,
): ShippingLookup | null {
  if (regencyId) {
    const exact = index.byRegency[regencyId];
    if (exact !== undefined) return { rateAmount: exact, source: "specific" };
  }
  if (index.fallback !== null) {
    return { rateAmount: index.fallback, source: "default" };
  }
  return null;
}

/** Convenience: langsung jadi angka, atau `null` kalau tidak ada tarif. */
export function shippingFeeFor(
  index: ShippingIndex,
  regencyId: string | null | undefined,
): number | null {
  return lookupShippingRate(index, regencyId)?.rateAmount ?? null;
}
