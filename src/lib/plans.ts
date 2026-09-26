/**
 * Batas & harga paket langganan (PRD §2).
 *
 * Prices dalam rupiah penuh (tanpa desimal) — sama seperti kolom uang di DB.
 * Free trial TIDAK ada: tenant wajib membayar saat pendaftaran.
 */
export const PLANS = {
  basic: {
    id: "basic",
    label: "Basic",
    priceMonthly: 300_000,
    priceYearly: 3_240_000,
    /** null = unlimited */
    maxProducts: 20,
    maxStaff: 1, // Owner + 1 staf = 2 akun
    /** null = unlimited; kuota WA per bulan */
    monthlyWaQuota: 100,
    features: {
      financialReport: "basic",
      customDomain: true,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthly: 500_000,
    priceYearly: 5_400_000,
    maxProducts: 100,
    maxStaff: 5,
    monthlyWaQuota: 500,
    features: {
      financialReport: "profit_loss",
      customDomain: true,
    },
  },
  max: {
    id: "max",
    label: "Max",
    priceMonthly: 1_000_000,
    priceYearly: 10_800_000,
    maxProducts: null,
    maxStaff: null,
    monthlyWaQuota: null,
    features: {
      financialReport: "executive",
      customDomain: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Persentase Platform Service Fee FurniTech, dipotong sebelum saldo cair ke pengrajin. */
export const PLATFORM_FEE_RATE = 0.015;

/** Slot payout IRIS dalam WIB (ROADMAP Sprint 6) dan ekuivalen UTC-nya. */
export const PAYOUT_SLOTS = {
  morning: { label: "06:00 WIB", hourWib: 6, hourUtc: 23, dayShift: -1 },
  evening: { label: "18:00 WIB", hourWib: 18, hourUtc: 11, dayShift: 0 },
} as const;
