import { z } from "zod";

import { phone, text } from "./primitives";

/**
 * Skema form alamat pengiriman (Sprint 5 bagian 2).
 *
 * Dua bentuk, sama seperti form lain di repo ini:
 *   - `addressFormSchema` untuk apa yang orang ketik/t pilih.
 *   - Skema penuh nanti untuk yang dibaca server dari database.
 *
 * `addressFormSchema` TIDAK memuat id milik server. `tenantId` disuntik
 * server dari tenant yang sedang halamannya, tidak pernah dari klien — kalau
 * tidak, satu tenant bisa menyimpan alamat di tenant lain.
 */

/**
 * Id wilayah bertingkat.
 *
 * Semuanya opsional karena form harus tetap bisa diselesaikan saat API
 * wilayah mati. Nama wilayah yang tidak ada di dataset — misalnya desa baru
 * yang belum masuk — tetap bisa diketik manual lewat field
 * "Nama desa/kelurahan" di bawah.
 */
const regionId = z.string().trim().max(24).optional().or(z.literal(""));

/** RT/RW: boleh kosong, tapi kalau diisi harus angka. */
const rwField = z
  .string()
  .trim()
  .max(4)
  .regex(/^\d{1,4}$/, "RT/RW hanya boleh angka, maksimal 4 digit.")
  .optional()
  .or(z.literal(""));

/** Kode pos Indonesia = 5 digit. */
const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "Kode pos harus 5 digit.")
  .optional()
  .or(z.literal(""));

export const addressFormSchema = z
  .object({
    // Jalan & nomor
    streetName: text("Nama jalan", 200),
    houseNumber: text("Nomor rumah", 50),
    rt: rwField,
    rw: rwField,

    // Wilayah bertingkat
    provinceId: regionId,
    regencyId: regionId,
    districtId: regionId,
    villageId: regionId,
    villageName: text("Desa/kelurahan", 120),
    districtName: text("Kecamatan", 120),
    regencyName: text("Kabupaten/kota", 120),
    provinceName: text("Provinsi", 120),
    cityName: text("Kabupaten/kota", 120),

    postalCode,

    // Titik peta — OPSIONAL. Peta bukan syarat; lihat catatan di
    // src/db/schema/shipping.ts soal kenapa nullable.
    latitude: z
      .string()
      .trim()
      .regex(/^-?\d{1,3}(\.\d{1,7})?$/, "Koordinat tidak valid.")
      .optional()
      .or(z.literal("")),
    longitude: z
      .string()
      .trim()
      .regex(/^-?\d{1,3}(\.\d{1,7})?$/, "Koordinat tidak valid.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (v) => Boolean(v.latitude) === Boolean(v.longitude),
    {
      message: "Latitude dan longitude harus diisi dua-duanya.",
      path: ["latitude"],
    },
  );

export type AddressInput = z.infer<typeof addressFormSchema>;

/** Pembeli tidak punya akun, jadi alamat di-key per nomor HP. */
export const checkoutPhoneSchema = z.object({
  phone,
});

/**
 * Susun satu baris `address_line` dari bagian-bagiannya.
 *
 * Dipakai untuk tampilan, BUKAN untuk pencocokan. Pencocokan tarif ongkir
 * memakai `regencyId`; lihat catatan "jebakan integrasi ongkir" di
 * ROADMAP.md Sprint 5 bagian 3.
 */
export function composeAddressLine(v: AddressInput): string {
  const rtRw = [v.rt && `RT ${v.rt}`, v.rw && `RW ${v.rw}`]
    .filter(Boolean)
    .join(", ");

  return [
    `Jl. ${v.streetName} No. ${v.houseNumber}`,
    v.villageName,
    `Kec. ${v.districtName}`,
    `${v.regencyName} ${v.postalCode ?? ""}`.trim(),
    rtRw,
  ]
    .filter(Boolean)
    .join(", ");
}
