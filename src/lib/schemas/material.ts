import { z } from "zod";

import { decimalInput, optionalText, signedDecimal, text } from "./primitives";

/** Skema inventaris bahan baku (ROADMAP Sprint 3). */

export const MATERIAL_CATEGORIES = [
  "Kayu",
  "Finishing",
  "Hardware",
  "Busa",
] as const;

export const ADJUSTMENT_REASONS = [
  "pembelian",
  "pemakaian",
  "rusak",
  "koreksi",
  "retur",
] as const;

export const createMaterialSchema = z.object({
  name: text("Nama bahan", 120),
  category: text("Kategori", 60),
  unit: text("Satuan", 20),
  quantity: decimalInput,
  minStockAlert: decimalInput,
});

export const updateMaterialFormSchema = z.object({
  name: text("Nama bahan", 120),
  category: text("Kategori", 60),
  unit: text("Satuan", 20),
  minStockAlert: decimalInput,
});

export const updateMaterialSchema = updateMaterialFormSchema.extend({
  id: z.uuid("Bahan tidak valid."),
});

/**
 * Penyesuaian stok. Tanda `+`/`-` sengaja dibaca di server, bukan dibuang
 * oleh zod, karena menentukan stok masuk atau keluar.
 */
export const adjustStockFormSchema = z.object({
  delta: signedDecimal.refine(
    (v) => v !== 0,
    "Jumlah perubahan tidak boleh nol.",
  ),
  reason: z.enum(ADJUSTMENT_REASONS, {
    message: "Alasan penyesuaian tidak valid.",
  }),
  note: optionalText(300),
});

export const adjustStockSchema = adjustStockFormSchema
  .extend({ materialId: z.uuid("Bahan tidak valid.") })
  .transform((v) => ({
    ...v,
    // "+10" dan "10" sama-sama berarti stok masuk.
    delta: /^\s*\+/.test(String(v.delta)) ? Math.abs(v.delta) : v.delta,
  }));

export const materialIdSchema = z.object({
  id: z.uuid("Bahan tidak valid."),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
