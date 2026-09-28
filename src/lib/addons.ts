/**
 * Harga & aturan add-on FurniTech (PRD §2.D dan §2.E).
 *
 * SENGAJA TIDAK memakai `server-only`, sama seperti `fees.ts`. Alasannya
 * sama: modal kalkulator di browser dan server harus membaca angka yang
 * PERSIS sama. Kalau halaman harga menampilkan Rp 250.000 sementara
 * tagihannya Rp 275.000, itu bukan pembulatan -- itu pengrajin yang melihat
 * angka berbeda dari yang akan ditagih.
 *
 * Satu file untuk KEDUA add-on karena keduanya menjawab pertanyaan yang
 * sama: berapa yang ditagih, berapa biayanya, dan kapan tagihannya berhenti.
 * Yang membedakan hanya bentuk periodenya -- tahunan berulang, atau sekali
 * bayar.
 */

/** Beban per pelanggan untuk paket pendirian PT Perorangan (PRD §2.E). */
export const LEGALITAS_PNBP = 50_000;

/**
 * Ongkos pengurusan: transport, bolak-balik, loket.
 *
 * Angka ini harus bisa dijelaskan ke pelanggan kalau ditanya. Kalau tidak,
 * FurniTech terlihat menjual sesuatu yang tidak jelas isinya -- dan
 * "legalitas" tanpa penjelasan sama dengan janji kosong, yang persis yang
 * harus dihindari (lihat `docs/proyeksi-revenue.md` Bagian 11).
 */
export const LEGALITAS_OPS = 100_000;

export const DOMAIN_ADDON = {
  /** Harga jual per tahun. Flat, tidak pernah naik. */
  price: 250_000,
  /** Satu periode = 12 bulan, dibayar di muka. */
  periodMonths: 12,
  /**
   * Toleransi sebelum domain di-suspend.
   *
   * TIGA bulan, dipilih karena tiga hal sekaligus: cukup untuk invoice
   * tahunan yang terbit di bulan Januari dibayar dua bulan sebelumnya;
   * cukup untuk pemilik toko yang sedang sibuk; dan cukup pendek supaya
   * biaya domain tidak menumpuk.
   *
   * Kenapa suspend WAJIB ada: tanpa itu, 1.000 domain aktif yang tidak
   * ditagih memakan Rp 188 juta per tahun -- lebih besar dari seluruh laba
   * add-on. Inilah yang membuat model tagih berulang lebih aman, bukan cuma
   * lebih untung.
   */
  suspendAfterMonths: 3,
} as const;

export const LEGALITAS_ADDON = {
  price: 500_000,
  pnbp: LEGALITAS_PNBP,
  ops: LEGALITAS_OPS,
} as const;

/** Total beban per pelanggan untuk paket pendirian. */
export const LEGALITAS_TOTAL_COST = LEGALITAS_ADDON.pnbp + LEGALITAS_ADDON.ops;

/** Margin kotor per pelanggan, sebelum fee Midtrans dan PPh. */
export const LEGALITAS_MARGIN = LEGALITAS_ADDON.price - LEGALITAS_TOTAL_COST;

/**
 * Awalan `order_id` per jenis tagihan.
 *
 * Webhook Midtrans TIDAK membawa informasi tentang invoice itu milik siapa.
 * Notifikasinya hanya berisi `order_id`, `transaction_status`, dan
 * `gross_amount`. Jadi satu-satunya cara membedakan tagihan langganan,
 * domain, dan legalitas adalah bentuk `order_id` itu sendiri.
 */
export const ORDER_ID_PREFIX = {
  subscription: "saas-",
  order: "ord-",
  domain: "dom-",
  legalitas: "leg-",
} as const;

export type AddonKind = "domain" | "legalitas";

/** `order_id` -> jenis add-on, atau null kalau bukan milik kita. */
export function addonKindFromOrderId(orderId: string): AddonKind | null {
  if (orderId.startsWith(ORDER_ID_PREFIX.domain)) return "domain";
  if (orderId.startsWith(ORDER_ID_PREFIX.legalitas)) return "legalitas";
  return null;
}

export function addMonths(from: Date, months: number): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * Periode tagihan domain berikutnya.
 *
 * Kalau periode lama masih berjalan, periode baru LANJUT dari sana. Kalau
 * sudah lewat -- termasuk yang sudah suspended -- mulai dari hari ini, bukan
 * dari periode lama: hari-hari yang sudah lewat tidak bisa "diperpanjang"
 * tanpa memberi sesuatu yang tidak pernah dibayar.
 */
export function nextDomainPeriod(
  now: Date,
  currentExpiry: Date | null,
): { start: Date; end: Date } {
  const base =
    currentExpiry && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now;
  return { start: base, end: addMonths(base, DOMAIN_ADDON.periodMonths) };
}

/**
 * Domain harus di-suspend?
 *
 * Berada di sini, bukan di route cron, supaya aturannya bisa diuji tanpa
 * menjalankan cron dan tanpa database.
 */
export function shouldSuspendDomain(
  now: Date,
  expiresAt: Date | null,
): boolean {
  if (!expiresAt) return false;
  return (
    addMonths(expiresAt, DOMAIN_ADDON.suspendAfterMonths).getTime() <=
    now.getTime()
  );
}

/** Domain masih boleh melayani trafik? */
export function isDomainActive(
  status: "unpaid" | "active" | "suspended",
  expiresAt: Date | null,
  now: Date,
): boolean {
  if (status !== "active") return false;
  if (!expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}

/**
 * Rincian biaya legalitas untuk ditampilkan.
 *
 * Angkanya diambil dari konstanta yang sama dengan yang dipakai saat
 * menghitung tagihan, bukan diketik ulang di markup. Kalau markup mengetik
 * 50.000 sendiri sementara kodenya memakai konstanta, keduanya akan berbeda
 * begitu ada yang mengubah konstantanya -- dan yang salah adalah yang
 * ditampilkan.
 */
export function legalitasBreakdown(): Array<{
  label: string;
  amount: number;
  note: string;
}> {
  return [
    {
      label: "PNBP pendaftaran AHU",
      amount: LEGALITAS_ADDON.pnbp,
      note: "Dibayar ke negara. PP 30/2026 pasal 33.",
    },
    {
      label: "Ongkos pengurusan",
      amount: LEGALITAS_ADDON.ops,
      note: "Transport, bolak-balik, loket.",
    },
    {
      label: "Jasa pembuatan logo",
      amount: 0,
      note: "Dikerjakan sendiri, tidak ada biaya terpisah.",
    },
  ];
}
