import { z } from "zod";

import { phone, text } from "./primitives";

/**
 * Skema alamat pengiriman pembeli.
 *
 * Dipakai bersama oleh form checkout klien dan Server Action — syarat agar
 * validasi Sprint 5 tidak berbeda antara yang dilihat pembeli dan yang
 * disimpan server.
 */
export const customerAddressSchema = z.object({
  recipientName: text("Nama penerima", 120),
  customerPhone: phone,
  addressLine: text("Alamat", 500),
  cityName: text("Kota/Kabupaten", 120),
  provinceName: text("Provinsi", 120),
  postalCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
