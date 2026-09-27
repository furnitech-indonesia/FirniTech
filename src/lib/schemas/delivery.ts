import { z } from "zod";

/**
 * Skema bukti penerimaan barang (Sprint 6).
 *
 * `orderId` TIDAK ada di skema bentuk: ia milik server, dan field yang
 * dikirim klien tidak boleh dipercaya. Pola yang sama seperti seluruh form
 * lain di repo ini.
 *
 * Yang dikembalikan skema ini BLANK-only. Foto, tanda tangan, dan uang COD
 * tidak ikut divalidasi di sini, dan itu disengaja: ketiganya tidak pernah
 * masuk lewat FormData sebagai string biasa. Foto adalah `File` (divalidasi
 * MIME + ukuran di `src/lib/storage.ts`), tanda tangan adalah data URL dari
 * canvas, dan uang COD adalah angka rupiah penuh yang harus dibandingkan
 * dengan sisa tagihan di server — bukan sekadar "formatnya benar".
 */
export const deliveryProofFormSchema = z.object({
  /** Nama yang benar-benar menerima. Tidak diasumsikan sama dengan pembeli. */
  signerName: z
    .string()
    .trim()
    .min(2, "Isi nama yang menerima barang.")
    .max(120, "Nama terlalu panjang."),
  notes: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter.")
    .optional()
    .or(z.literal("")),
});

/** Skema penuh: menambahkan `orderId` milik server. */
export const deliveryProofSchema = deliveryProofFormSchema.extend({
  orderId: z.uuid("Pesanan tidak valid."),
});

/**
 * Uang COD yang diterima, dari input kurir.
 *
 * Diterima sebagai TEKS, bukan angka, dan itu bukan selera: `Number("")` = 0
 * dan `Number("abc")` = NaN, jadi input kosong atau salah ketik akan diam-diam
 * berubah jadi "nol rupiah diterima" — dan itu berarti uang hilang dari
 * catatan tanpa ada yang gagal. Pola yang sama dipakai `parseRupiah` untuk
 * form back-office.
 *
 * Dikembalikan sebagai `number | null` supaya `null` (bukan COD) bisa
 * dibedakan dari `0` (diterima tanpa uang masuk).
 */
export const codAmountInputSchema = z
  // `null` WAJIB diterima, bukan hanya `undefined`.
  //
  // `formData.get("codAmount")` mengembalikan `null` — bukan `undefined` —
  // kalau field-nya tidak ada di form. Dan `z.string().optional()` menolak
  // `null` dengan pesan "expected string, received null", yang tidak
  // menjelaskan apa pun ke orang yang membaca. Field COD memang belum
  // selalu ada di form kurir, jadi `null` adalah kasus normal, bukan
  // masukan buruk.
  .union([z.string(), z.null(), z.undefined()])
  .transform((raw, ctx) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const text = raw.trim();

    const normalized = text.replace(/[^\d-]/g, "");
    if (normalized === "" || normalized === "-") {
      ctx.addIssue({
        code: "custom",
        message: "Nominal COD tidak terbaca.",
      });
      return z.NEVER;
    }
    const value = Number(normalized);
    if (!Number.isSafeInteger(value) || value < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Nominal COD harus angka rupiah penuh, tanpa titik atau koma.",
      });
      return z.NEVER;
    }
    return value;
  });
