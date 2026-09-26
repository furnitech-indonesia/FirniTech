import { z } from "zod";

/**
 * Skema primitif untuk parsing input form.
 *
 * Satu skema dipakai DUA kali: memvalidasi di browser (react-hook-form) dan
 * lagi di server action. Kalau parsing hanya dilakukan di server, aturan
 * validasi bisa berbeda antara yang dilihat pengguna dan yang dijalankan —
 * sumber bug yang mahal dicari.
 *

 */

/** Harga tidak boleh diawali tanda minus. */
const noLeadingMinus = (v: string) => !/^\s*-/.test(v);

/**
 * Uang rupiah: "Rp 12.500.000" atau "12500000" → 12500000 (integer).
 *
 * Sengaja bigint penuh, bukan desimal — Rupiah tidak memakai satuan pecahan.
 * String non-angka DITOLAK, bukan diam-diam jadi 0, dan tanda minus di depan
 * juga ditolak supaya "-5" tidak berubah jadi "5".
 */
export const rupiah = z
  .string()
  .trim()
  .min(1, "Wajib diisi.")
  .refine((v) => /[0-9]/.test(v), "Harus berupa angka rupiah.")
  .refine(noLeadingMinus, "Tidak boleh diawali tanda minus.")
  .transform((v) => Number(v.replace(/[^0-9]/g, "")))
  .pipe(z.int().min(0, "Tidak boleh negatif."));

/** Uang opsional: kosong berarti null (dipakai harga variasi). */
export const rupiahOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v || !/[0-9]/.test(v)) return null;
    return Number(v.replace(/[^0-9]/g, ""));
  })
  .refine((v) => v === null || !Number.isNaN(v), "Nominal tidak valid.")
  .pipe(z.int().min(0, "Tidak boleh negatif.").nullable());

/** Bilangan desimal untuk satuan bahan: "1,5" maupun "1.5" → 1.5 */
export const decimalInput = z
  .string()
  .trim()
  .min(1, "Wajib diisi.")
  .refine(
    // Tanda plus diterima karena form penyesuaian stok menyuruh pengguna
    // mengetik "+10" untuk stok masuk. Number("+10") bernilai 10.
    (v) => /^[+-]?\d+(?:[.,]\d+)?$/.test(v),
    "Gunakan format angka, contoh 1,5 atau 1.5.",
  )
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(z.number().finite("Angka tidak valid."));

/** Desimal bertanda untuk penyesuaian stok: "+10" atau "-2,5". */
export const signedDecimal = decimalInput;

/** Bilangan bulat opsional (dimensi yang boleh dikosongkan). */
export const intOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v || v === "") return null;
    const parsed = Number.parseInt(v, 10);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  })
  .refine((v) => v === null || Number.isInteger(v), "Harus bilangan bulat.")
  .pipe(z.int().nullable());

/** Bilangan bulat dengan batas minimum. */
export function intAtLeast(min: number, label = "Nilai") {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .refine((v) => /^\d+$/.test(v), `${label} harus berupa angka bulat.`)
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.int().min(min, `${label} minimal ${min}.`));
}

/** Teks wajib diisi. */
export const text = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} maksimal ${max} karakter.`);

/** Teks opsional; string kosong menjadi null agar tidak disimpan sebagai "". */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

/**
 * Slug untuk URL dan subdomain tenant.
 * Hanya huruf kecil, angka, dan tanda hubung — dipakai sebagai host, jadi
 * karakter yang bisa diselundupkan ke URL harus dibuang di sini.
 */
export const slug = z
  .string()
  .trim()
  .transform((v) =>
    v
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60),
  )
  .pipe(
    z
      .string()
      .min(1, "Slug tidak valid.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug hanya boleh huruf kecil, angka, dan tanda hubung.",
      ),
  );

/** Nomor telepon Indonesia, longgar agar tidak menolak format luar negeri. */
export const phone = z
  .string()
  .trim()
  .min(8, "Nomor telepon terlalu pendek.")
  .max(20, "Nomor telepon terlalu panjang.")
  .regex(/^[0-9+\-\s()]+$/, "Nomor telepon tidak valid.");

export const email = z.email("Format email tidak valid.");

export type FieldErrors = Record<string, string>;

/**
 * Ubah FormData menjadi objek biasa untuk diberikan ke zod.
 *
 * File TIDAK ikut — file ditangani terpisah (validasi di src/lib/storage.ts).
 * Checkbox hanya muncul di FormData saat tercentang, jadi nilainya dibaca dari
 * `.has()` dan checkbox "on" dinormalkan menjadi boolean.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (value === "on") {
      out[key] = true;
      continue;
    }
    if (value === "true") {
      out[key] = true;
      continue;
    }
    if (value === "false") {
      out[key] = false;
      continue;
    }
    out[key] = value;
  }

  return out;
}

/**
 * Terjemahkan pesan bawaan zod (bahasa Inggris) ke bahasa Indonesia.
 *
 * zod memvalidasi tipe SEBELUM aturan `.min()`, jadi field yang hilang
 * sepenuhnya menghasilkan "Invalid input: expected string, received
 * undefined" — bukan pesan "Wajib diisi" yang kita tulis sendiri. Tanpa
 * terjemahan ini, aplikasi berbahasa Indonesia menampilkan error Inggris.
 *
 * Pesan asli zod selalu diawali "Invalid input", "Too small", atau "Too big".
 * Pesan yang kita tulis sendiri tidak pernah diawali itu, jadi aman dideteksi
 * dari teksnya.
 */
const ZOD_DEFAULT_PREFIX = /^(invalid input|too small|too big)/i;

function localizeIssue(issue: z.core.$ZodIssue): string {
  const raw = issue.message ?? "";

  if (!ZOD_DEFAULT_PREFIX.test(raw)) {
    return raw; // pesan kita sendiri
  }

  if (issue.input === undefined) {
    return "Wajib diisi.";
  }
  if (issue.code === "invalid_type") {
    return "Format isian tidak sesuai.";
  }
  if (issue.code === "too_small") {
    return "Nilai terlalu kecil.";
  }
  if (issue.code === "too_big") {
    return "Nilai terlalu besar.";
  }
  return "Isian tidak valid.";
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: FieldErrors; message: string };

/**
 * Validasi FormData dengan skema zod, dan kembalikan error PER FIELD.
 *
 * Error tidak pernah digabung jadi satu pesan: pengguna harus tahu field mana
 * yang salah tanpa menebak.
 */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(formDataToObject(formData));

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    // Simpan pesan pertama per field; yang berikutnya tidak menambah informasi.
    if (!fieldErrors[key]) fieldErrors[key] = localizeIssue(issue);
  }

  return {
    success: false,
    fieldErrors,
    message: "Periksa kembali data yang Anda isi.",
  };
}
