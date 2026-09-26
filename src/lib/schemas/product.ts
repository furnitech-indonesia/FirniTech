import { z } from "zod";

import {
  intAtLeast,
  intOptional,
  optionalText,
  rupiah,
  rupiahOptional,
  slug,
  text,
} from "./primitives";

/**
 * Skema katalog produk & variasi (ROADMAP Sprint 3).
 *
 * Pola: setiap form punya DUA skema.
 *   - `*FormSchema` — hanya field yang diketik pengguna. Ini yang dipakai di
 *     browser, jadi tidak memuat id milik server.
 *   - schema penuh — `*FormSchema` ditambah field id, dipakai Server Action.
 *
 * Field id TIDAK masuk ke skema form: nilainya disuntikkan server sebagai
 * input tersembunyi dan diverifikasi ulang (kepemilikan baris dicek ulang di
 * server, bukan sekadar uuid-nya).
 */

export const productFormSchema = z.object({
  name: text("Nama produk", 120),
  /** Slug boleh kosong di form (server membuat dari nama), tapi harus valid. */
  slug: slug.optional(),
  description: optionalText(2000),
  lengthCm: intAtLeast(1, "Panjang"),
  widthCm: intAtLeast(1, "Lebar"),
  heightCm: intAtLeast(1, "Tinggi"),
  woodType: text("Jenis kayu", 80),
  finishingType: text("Finishing", 80),
  basePrice: rupiah,
  isPublished: z.boolean().default(false),
});

export const productSchema = productFormSchema.extend({
  id: z.uuid("Produk tidak valid."),
});

export const productIdSchema = z.object({
  id: z.uuid("Produk tidak valid."),
});

const optionalShort = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const variantFormSchema = z.object({
  name: text("Nama variasi", 120),
  sku: optionalShort,
  lengthCm: intOptional,
  widthCm: intOptional,
  heightCm: intOptional,
  woodType: optionalShort,
  finishingType: optionalShort,
  /** Kosong = pakai harga dasar produk. */
  price: rupiahOptional,
});

export const variantSchema = variantFormSchema.extend({
  productId: z.uuid("Produk tidak valid."),
});

export const deleteVariantSchema = z.object({
  variantId: z.uuid("Variasi tidak valid."),
  productId: z.uuid("Produk tidak valid."),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type VariantFormInput = z.infer<typeof variantFormSchema>;
