import { z } from "zod";

import {
  intAtLeast,
  intOptional,
  optionalText,
  phone,
  rupiah,
  text,
} from "./primitives";

/** Skema pesanan, Custom Order Builder, dan progres produksi. */

export const ORDER_STATUSES = [
  "pending_dp",
  "in_production",
  "quality_control",
  "ready_to_ship",
  "shipped",
  "completed",
  "cancelled",
] as const;

export const PROGRESS_STAGES = [
  "bahan_dipotong",
  "perakitan",
  "finishing",
  "qc",
  "packing",
] as const;

export const ORDER_SOURCES = ["storefront", "manual"] as const;

/** Pesanan kustom yang dicatat staf (Custom Order Builder). */
export const customOrderSchema = z.object({
  customerName: text("Nama pelanggan", 120),
  customerPhone: phone,
  customerAddress: text("Alamat", 500),
  destinationCity: text("Kota tujuan", 120),

  itemName: text("Nama mebel", 160),
  price: rupiah,
  quantity: intAtLeast(1, "Jumlah"),
  shippingFee: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v || !/[0-9]/.test(v)) return 0;
      return Number(v.replace(/[^0-9]/g, ""));
    })
    .pipe(z.int().min(0)),

  lengthCm: intOptional,
  widthCm: intOptional,
  heightCm: intOptional,
  woodType: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  finishingType: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  specNotes: optionalText(500),

  dpAmount: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v || !/[0-9]/.test(v)) return 0;
      return Number(v.replace(/[^0-9]/g, ""));
    })
    .pipe(z.int().min(0)),

  notes: optionalText(500),
});

export const transitionStatusFormSchema = z.object({
  target: z.enum(ORDER_STATUSES, { message: "Status tidak valid." }),
});

export const transitionStatusSchema = transitionStatusFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

export const assignCarpenterFormSchema = z.object({
  carpenterId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "")),
});

export const assignCarpenterSchema = assignCarpenterFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

/**
 * Skema bentuk (tanpa `orderId`) untuk penugasan kurir, lalu skema penuh
 * dengan `orderId` milik server — pola yang sama seperti tukang di atas.
 *
 * `orderId` TIDAK boleh ada di skema bentuk: ia adalah milik server, dan
 * field yang dikirim klien tidak boleh dipercaya.
 */
export const assignCourierFormSchema = z.object({
  courierId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "")),
});

export const assignCourierSchema = assignCourierFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

export const recordPaymentFormSchema = z
  .object({
    mode: z.enum(["dp", "lunas"]),
    amount: z
      .string()
      .trim()
      .optional()
      .transform((v) => {
        if (!v || !/[0-9]/.test(v)) return 0;
        return Number(v.replace(/[^0-9]/g, ""));
      })
      .pipe(z.int().min(0)),
  })
  .refine((v) => v.mode !== "dp" || v.amount > 0, {
    message: "Nominal wajib lebih dari nol.",
    path: ["amount"],
  });

export const recordPaymentSchema = recordPaymentFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

export const setTrackingFormSchema = z.object({
  cargoName: optionalText(80),
  trackingNumber: optionalText(80),
});

export const setTrackingSchema = setTrackingFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

export const addProgressFormSchema = z.object({
  stage: z.enum(PROGRESS_STAGES, { message: "Tahap tidak valid." }),
  notes: optionalText(500),
});

export const addProgressSchema = addProgressFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
  // Foto divalidasi terpisah di src/lib/storage.ts (ukuran & MIME).
  photoUrl: z.string().trim().optional(),
});

export const orderIdSchema = z.object({
  id: z.uuid("Pesanan tidak valid."),
});

export type ProgressStageValue = (typeof PROGRESS_STAGES)[number];

export type CustomOrderInput = z.infer<typeof customOrderSchema>;
