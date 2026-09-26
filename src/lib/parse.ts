/**
 * Parse & validasi input form.
 *
 * Uang masuk lewat form sebagai string ("Rp 12.500.000" atau "12500000") dan
 * disimpan sebagai bigint rupiah penuh. Fungsi-fungsi di sini adalah SATU-SATU
 * tempat konversi itu, supaya tidak ada Arithmetic yang tidak terkontrol.
 */

/** Buang semua karakter non-digit. "Rp 1.250.000" -> 1250000 */
export function parseRupiah(input: FormDataEntryValue | null): number {
  if (typeof input !== "string") return 0;
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) {
    throw new Error("Nominal uang terlalu besar atau tidak valid.");
  }
  return value;
}

export function parseInt10(
  input: FormDataEntryValue | null,
  { min = 0, fallback = 0 }: { min?: number; fallback?: number } = {},
): number {
  if (typeof input !== "string" || input.trim() === "") return fallback;
  const value = Number.parseInt(input, 10);
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, value);
}

export function parseDecimal(
  input: FormDataEntryValue | null,
  fallback = 0,
): number {
  if (typeof input !== "string" || input.trim() === "") return fallback;
  const normalized = input.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

export function parseOptionalInt(
  input: FormDataEntryValue | null,
): number | null {
  if (typeof input !== "string" || input.trim() === "") return null;
  const value = Number.parseInt(input, 10);
  return Number.isNaN(value) ? null : value;
}

export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function requiredStr(formData: FormData, key: string): string {
  const value = str(formData, key);
  if (!value) throw new Error(`Kolom "${key}" wajib diisi.`);
  return value;
}

/**
 * Slug aman untuk URL: huruf kecil, hanya a-z0-9 dan tanda hubung.
 * Penting karena slug dipakai sebagai subdomain tenant.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
