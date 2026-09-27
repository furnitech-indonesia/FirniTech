/**
 * Label tampilan untuk enum database.
 *
 * Tipe diturunkan LANGSUNG dari skema, jadi kalau ada nilai enum baru atau
 * perubahan nama, TypeScript akan gagal sampai labelnya ditambahkan. Nilai
 * enum tetap kunci teknis untuk logika; file ini hanya untuk manusia.
 */

import type { conversations, orders } from "@/db/schema";
import { PROGRESS_STAGE_ORDER } from "./order-status";
import type { UserRole } from "./auth/permissions";

export type OrderStatus = (typeof orders.$inferSelect)["orderStatus"];
export type PaymentStatus = (typeof orders.$inferSelect)["paymentStatus"];
export type ConversationStatus =
  (typeof conversations.$inferSelect)["status"];
export type ProgressStage = (typeof PROGRESS_STAGE_ORDER)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_dp: "Menunggu DP",
  in_production: "Produksi",
  quality_control: "Quality Control",
  ready_to_ship: "Siap Dikirim",
  shipped: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Belum bayar",
  dp_paid: "DP terbayar",
  fully_paid: "Lunas",
  refunded: "Refund",
};

export const PROGRESS_STAGE_LABELS: Record<ProgressStage, string> = {
  bahan_dipotong: "Bahan Dipotong",
  perakitan: "Perakitan",
  finishing: "Finishing",
  qc: "Quality Control",
  packing: "Packing",
};

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Baru",
  pending: "Menunggu pembeli",
  resolved: "Selesai",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin_penjualan: "Admin Penjualan",
  tukang: "Tukang",
  kurir: "Kurir",
};

export const ADJUSTMENT_REASON_LABELS: Record<string, string> = {
  pembelian: "Pembelian",
  pemakaian: "Pemakaian",
  rusak: "Rusak",
  koreksi: "Koreksi hitung fisik",
  retur: "Retur",
};

export const ORDER_STATUS_TONES: Record<
  OrderStatus,
  "pending" | "production" | "quality" | "settled" | "failed" | "neutral"
> = {
  pending_dp: "pending",
  in_production: "production",
  quality_control: "quality",
  ready_to_ship: "quality",
  shipped: "settled",
  completed: "settled",
  cancelled: "failed",
};
