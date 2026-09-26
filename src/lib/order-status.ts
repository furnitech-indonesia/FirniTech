/**
 * Pemetaan status pesanan ↔ tahap progres produksi.
 *
 * `order_status` (siklus hidup order) dan `progress_stage` (tahapan yang
 * diunggah tukang) adalah dua hal berbeda yang tumpang tindih. Aturan
 * transisinya hidup di sini — satu sumber kebenaran, bukan di enum DB.
 *
 * Alur: bahan_dipotong → perakitan → finishing → qc → packing
 *       pending_dp  → in_production → quality_control → ready_to_ship
 *                                                           ↓
 *                                            shipped → completed
 */

export const PROGRESS_STAGE_ORDER = [
  "bahan_dipotong",
  "perakitan",
  "finishing",
  "qc",
  "packing",
] as const;

export type ProgressStage = (typeof PROGRESS_STAGE_ORDER)[number];

/** Tahap progres yang memindahkan order ke status tertentu. */
export const STAGE_TO_ORDER_STATUS: Record<
  ProgressStage,
  "in_production" | "quality_control" | "ready_to_ship"
> = {
  bahan_dipotong: "in_production",
  perakitan: "in_production",
  finishing: "quality_control",
  qc: "quality_control",
  packing: "ready_to_ship",
};

/** Urutan status order; dipakai untuk disable tombol transisi. */
export const ORDER_STATUS_FLOW = [
  "pending_dp",
  "in_production",
  "quality_control",
  "ready_to_ship",
  "shipped",
  "completed",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number] | "cancelled";

/** Status terminal: tidak ada transisi lanjutan yang valid. */
export const TERMINAL_ORDER_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "cancelled",
]);

/**
/**
 * Transisi yang diizinkan. `cancelled` boleh terjadi sebelum shipped;
 * setelah shipped barang sudah jalan, sehingga pembatalan jadi refund.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_dp: ["in_production", "cancelled"],
  in_production: ["quality_control", "cancelled"],
  quality_control: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isFinalStage(stage: ProgressStage): boolean {
  return stage === PROGRESS_STAGE_ORDER[PROGRESS_STAGE_ORDER.length - 1];
}
