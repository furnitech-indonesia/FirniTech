/**
 * Batas & harga paket langganan (PRD §2).
 *
 * Harga dalam rupiah penuh (tanpa desimal) — sama seperti kolom uang di DB.
 * Free trial TIDAK ada: tenant wajib membayar saat pendaftaran.
 *
 * HARGA BELUM TERMASUK PPN 11%. Perusahaan berstatus **belum PKP**, jadi PPN
 * tidak diodeser ke pengrajin maupun ke pembeli. Fee Midtrans tetap menjadi
 * biaya riil — PPN di dalamnya tidak bisa dikreditkan karena tidak ada
 * kredit pajak — dan itu sudah termasuk di angka `src/lib/fees.ts`.
 *
 * Diskon tahunan 5% (sebelumnya 10%), ditulis sebagai `priceYearly` yang
 * dihitung dari `priceMonthly` × 12 × 0,95. Angka tahunannya DIHITUNG, bukan
 * diketik: `pricing-table.ts` menghitung diskon dari selisih kedua angka, dan
 * kalau harga bulanan berubah sementara harga tahunan tidak, diskon yang
 * tampil ikut berubah tanpa ada yang menyadarinya.
 */
export const PLANS = {
  basic: {
    id: "basic",
    label: "Basic",
    priceMonthly: 300_000,
    priceYearly: 3_420_000, // 300.000 × 12 × 0,95
    /** null = unlimited */
    maxProducts: 20,
    maxStaff: 1, // Owner + 1 staf = 2 akun
    features: {
      financialReport: "basic",
      customDomain: true,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthly: 500_000,
    priceYearly: 5_700_000, // 500.000 × 12 × 0,95
    maxProducts: 100,
    maxStaff: 5,
    features: {
      financialReport: "profit_loss",
      customDomain: true,
    },
  },
  max: {
    id: "max",
    label: "Max",
    priceMonthly: 1_000_000,
    priceYearly: 11_400_000, // 1.000.000 × 12 × 0,95
    maxProducts: null,
    maxStaff: null,
    features: {
      financialReport: "executive",
      customDomain: true,
    },
  },
} as const;

/**
 * Harga tahunan dari harga bulanan, dengan diskon 5%.
 *
 * DIHITUNG, tidak pernah ditulis manual — dan ini berlaku untuk harga dari
 * override di database juga. Kalau harga tahunan boleh diisi bebas, diskon 5%
 * yang berlaku untuk semua paket berhenti berlaku tanpa ada yang menyadarinya,
 * dan yang mengetahuinya adalah pengrajin yang membayar terlalu banyak selama
 * setahun.
 *
 * `Math.round`, bukan `Math.floor`: pembulatan ke bawah pada harga yang sudah
 * diskon terlihat seperti kesalahan hitung, dan selisihnya paling banyak
 * beberapa ribu rupiah per tahun.
 */
export function priceYearly(priceMonthly: number): number {
  return Math.round(priceMonthly * 12 * 0.95);
}

export type PlanId = keyof typeof PLANS;

/**
 * Id paket sebagai TUPLE KONSTAN, bukan `Object.keys(PLANS)`.
 *
 * Alasannya `z.enum()` untuk pilihan paket di wizard pendaftaran hanya bisa
 * menerima tuple literal. Kalau ini `Object.keys()`, tipenya jadi `string[]`,
 * skema zod-nya tidak bisa disusun, dan `plan` pada data hasil validasi
 * bertipe `string` — sehingga `PLANS[data.plan]` gagal dikompilasi.
 *
 * `satisfies` menjaga daftar ini tetap subset dari kunci `PLANS`: menambah
 * paket di `PLANS` tanpa menambah barisnya di sini = error typecheck, bukan
 * paket yang diam-diam tidak bisa dipilih.
 */
export const PLAN_IDS = [
  "basic",
  "pro",
  "max",
] as const satisfies readonly PlanId[];

/*
 * `PLATFORM_FEE_RATE` dan `PAYOUT_SLOTS` sengaja TIDAK ada di berkas ini.
 *
 * Fee platform tinggal di `@/lib/fees` — menyalinnya ke dua berkas pernah
 * membuat angka_fee berbeda di dua tempat, dan tidak ada yang menangkapnya.
 * Slot payout 06.00/18.00 WIB juga dihapus: jadwal itu digantikan pemicu
 * bukti pengiriman yang diunggah kurir, jadi tidak ada lagi slot yang perlu
 * disimpan.
 */
