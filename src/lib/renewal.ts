import { addMonths } from "@/lib/addons";

/**
 * Aturan perpanjangan langganan dan tagihan domain (PRD §2.C).
 *
 * Sengaja TIDAK memakai `server-only`, sama seperti `addons.ts` dan
 * `fees.ts`. Alasannya sama persis: angka dan aturan ini dibaca oleh cron
 * (server) dan oleh teks yang ditampilkan ke pengrajin (halaman tagihan).
 * Kalau keduanya menghitung mundur sendiri, angka yang muncul di halaman
 * bisa berbeda dari yang dipakai cron -- dan yang salah adalah yang
 * ditampilkan ke orang yang harus bayar.
 *
 * TIGA aturan yang di sini, masing-masing karena satu kegagalan nyata:
 *
 * 1. **Periode baru LANJUT dari periode lama, bukan dari hari invoice
 *    terbit.** Kalau langganan bulanan dibayar tanggal 5 dan invoice
 *    renewal terbit tanggal 28, periode barunya harus 5 tanggal 5 bulan
 *    berikutnya. Kalau dihitung dari tanggal 28, orang kehilangan 23 hari
 *    yang sudah dibayar. Aturan yang sama sudah dipakai
 *    `nextDomainPeriod`, dan ini alasannya disalin.
 *
 * 2. **Periode yang sudah lewat TIDAK diperpanjang dari tanggal lamanya.**
 *    Hari yang sudah lewat tidak bisa "dibayar di muka" -- itu memberi
 *    sesuatu yang tidak pernah dibayar. Mulai dari hari invoice terbit.
 *
 * 3. **Invoice renewal terbit 30 hari sebelum periode habis.** Cukup untuk
 *    dibaca dan dibayar tanpa layanan terputus, dan cukup pendek supaya periode
 *    yang sudah lewat tidak menumpuk jadi utang yang tidak pernah ditagih.
 *    Nilai 7 hari (yang pernah dipakai) hanya menyisakan halaman pembayaran
 *    yang tidak sempat dibaca orang yang sedang melayani pesanan.
 */

/** Seberapa awal invoice perpanjangan diterbitkan. */
export const RENEWAL_LEAD_DAYS = 30;

/** Tanggal dalam hitungan hari, sebagai objek `Date` mulai tengah malam UTC. */
export function hariPada(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * Periode perpanjangan berikutnya.
 *
 * `periodMonths` DIBACAI dari invoice langganan terakhir yang lunas, bukan
 * dari `tenants`. Tenant menyimpan paketnya (`tenants.plan`) tapi TIDAK
 * menyimpan apakah dia bayar bulanan atau tahunan, dan itu yang menentukan
 * periode perpanjangan. Menebak "selalu bulanan" memotong orang yang
 * membayar tahunan: satu periode bulanan dihargai seperti setahun. Menebak
 * "selalu tahunan" menagih Rp 5.700.000 kepada orang yang biasanya membayar
 * Rp 500.000, dan tagihan itu ditolak atau, lebih buruk, dibayar.
 */
export function nextSubscriptionPeriod(
  now: Date,
  currentExpiry: Date | null,
  periodMonths: number,
): { start: Date; end: Date } {
  const base =
    currentExpiry && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now;
  return { start: base, end: addMonths(base, periodMonths) };
}

/** Berapa bulan satu periode, dari nilai `saas_invoices.period`. */
export function monthsForPeriod(period: "monthly" | "yearly"): number {
  return period === "yearly" ? 12 : 1;
}

/**
 * Hari jatuh tempo periode berikutnya, untuk ditampilkan ke pengrajin.
 *
 * Berbeda dari `nextSubscriptionPeriod` yang mengembalikan objek `Date`,
 * ini mengembalikan `YYYY-MM-DD` supaya bisa dipakai langsung di `date`
 * dan bisa dibandingkan sebagai teks.
 */
export function nextExpiryDate(
  now: Date,
  currentExpiry: Date | null,
  periodMonths: number,
): string {
  return nextSubscriptionPeriod(now, currentExpiry, periodMonths)
    .end.toISOString()
    .slice(0, 10);
}

/**
 * Saatnya menerbitkan invoice perpanjangan?
 *
 * Hanya di dalam jendela, dan hanya kalau periode belum lewat. Periode
 * yang sudah lewat disuspend lebih dulu (untuk domain), jadi ingredient
 * yang lewat tidak boleh dibuat invoice renewal untuk periode yang dimulai
 * di masa lalu.
 */
export function shouldIssueRenewal(
  now: Date,
  expiresAt: Date | null,
  leadDays: number = RENEWAL_LEAD_DAYS,
): boolean {
  if (!expiresAt) return false;
  if (expiresAt.getTime() <= now.getTime()) return false;
  const batas = new Date(now);
  batas.setUTCDate(batas.getUTCDate() + leadDays);
  return expiresAt.getTime() <= batas.getTime();
}

/**
 * Berapa hari lagi periode habis.
 *
 * Dipakai untuk kalimat di halaman tagihan ("jatuh tempo dalam 12 hari").
 * Nilai negatif berarti sudah lewat, dan itu harus tetap tampil sebagai
 * angka — bukan diubah jadi 0, karena "0 hari lagi" dan "12 hari lalu"
 * maknanya berbeda, dan pengrajin yang salah baca keduanya akan melakukan
 * hal yang salah.
 */
export function daysUntil(now: Date, expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const selisih = hariPada(expiresAt).getTime() - hariPada(now).getTime();
  return Math.round(selisih / 86_400_000);
}

/**
 * Postgres unique violation?
 *
 * `err.code` sering `undefined` karena Drizzle membungkus error postgres.js
 * di `cause` -- jadi pembacaan yang hanya melihat `err.code` menyimpulkan
 * "tidak ada pelanggaran" untuk pelanggaran yang benar-benar ada. Di sini
 * itu berarti meledak di tengah loop cron: satu tenant meledak, 999
 * tenant berikutnya tidak pernah ditagih, dan yang terlihat cuma 500.
 *
 * Diekspor karena harus diuji sendiri. Ia tidak pernah terpakai pada
 * pengujian lain: pre-check "sudah ada invoice" di setiap pemanggil
 * menutup jalur ini sebelum insert terjadi, jadi mengujinya lewat fungsi
 * publik berarti selalu lulus tanpa pernah menyentuh kodenya.
 */
export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  if (cause?.code === "23505") return true;
  return (error as { code?: string } | null)?.code === "23505";
}
