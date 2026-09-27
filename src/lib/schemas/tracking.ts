import { z } from "zod";

import { phone } from "./primitives";

/**
 * Skema form lacak pesanan (Sprint 5 bagian 4).
 *
 * Dua isian, dan KEDUA-nya wajib. Kode pesanan saja tidak cukup: ruang
 * tebaknya memang besar, tapi kode bisa dibagikan — difoto dari struk, dikirim
 * lewat chat, atau diberikan kepada orang yang seharusnya tidak tahu. Halaman
 * ini menampilkan nama, alamat, dan foto progres.
 */
export const trackingLookupSchema = z.object({
  orderCode: z
    .string()
    .trim()
    .min(1, "Kode pesanan wajib diisi.")
    .max(40, "Kode pesanan tidak valid.")
    .transform((v) => v.toUpperCase()),
  phone,
});

export type TrackingLookupInput = z.infer<typeof trackingLookupSchema>;
