import { z } from "zod";

import { rupiah } from "./primitives";

/**
 * Skema form tarif ongkir (Sprint 5 bagian 3).
 *
 * Beda dengan form produk: isinya bukan "produk" melainkan "wilayah + nominal",
 * dan punya aturan yang tidak bisa ditegakkan lewat pemeriksaan kolom satu per
 * satu.
 */

/**
 * `regencyId` OPSIONAL, dan itu bukan sekadar keterangan.
 *
 * Field kosong berarti tarif berlaku untuk wilayah mana pun yang tidak punya
 * tarif sendiri. Dua alasankwtabanullable:
 *
 * 1. Baris lama yang nama wilayahnya ambigu tidak bisa dipetakan ke satu
 *    kabupaten — "Bandung" bisa berarti Kabupaten Bandung (32.04) atau Kota
 *    Bandung (32.73), dan menebak salah berartimenarik tarif yang keliru tanpa
 *    ada yang sadar. Baris seperti itu tetap berguna sebagai tarif umum.
 * 2. Bukan semua pengrajin mau administering 514 kabupaten. Kalau tarif 0
 *    tidak mungkin, 514 baris juga tidak.
 *
 * Yang WAJIB ada di setiap tenant adalah satu tarif cadangan
 * (`isDefault`), supaya pembeli di luar daftar tidak pernah terkunci.
 */
export const shippingRateFormSchema = z
  .object({
    provinceId: z
      .string()
      .trim()
      .min(1, "Pilih provinsi.")
      .max(24, "Provinsi tidak valid."),
    regencyId: z
      .string()
      .trim()
      .max(24, "Kabupaten/kota tidak valid.")
      .optional()
      .or(z.literal("")),
    cityName: text2("Nama kota/kabupaten", 120),
    provinceName: text2("Nama provinsi", 120),
    rateAmount: rupiah,
    isDefault: z.boolean().default(false),
  })
  .refine(
    (v) => !v.isDefault || v.regencyId === "",
    {
      message:
        "Tarif cadangan berlaku untuk semua wilayah, jadi tidak bisa dikaitkan ke satu kabupaten/kota.",
      path: ["isDefault"],
    },
  )
  .refine((v) => v.isDefault || v.regencyId !== "", {
    message:
      'Tarif khusus harus punya kabupaten/kota. Centang "Berlaku untuk semua wilayah" kalau memang umum.',
    path: ["regencyId"],
  });

function text2(label: string, max: number) {
  return z.string().trim().min(1, `${label} wajib diisi.`).max(max);
}

export type ShippingRateInput = z.infer<typeof shippingRateFormSchema>;

/** Bentuk penuh, termasuk id server. Tidak dipakai di form. */
export const shippingRateSchema = shippingRateFormSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
});
