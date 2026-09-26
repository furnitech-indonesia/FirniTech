/**
 * Format angka untuk tampilan.
 *
 * Uang di database adalah bigint dalam satuan rupiah penuh (tanpa desimal),
 * jadi di sini cukup pakai `Intl.NumberFormat` — tidak perlu pembulatan.
 */

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const PLAIN = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatRupiah(value: number | bigint | null | undefined): string {
  return RUPIAH.format(Number(value ?? 0));
}

export function formatNumber(value: number | bigint | null | undefined): string {
  return PLAIN.format(Number(value ?? 0));
}

/** Tanggal untuk tampilan lokal Indonesia. */
const DATE_WIB = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

/**
 * Waktu disimpan sebagai timestamptz (UTC). Payout & notifikasi WA memakai
 * WIB, jadi konversi eksplisit ke Asia/Jakarta — jangan mengandalkan zona
 * waktu server.
 */
export function formatDateID(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_WIB.format(typeof value === "string" ? new Date(value) : value);
}
