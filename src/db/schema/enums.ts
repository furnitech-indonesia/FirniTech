import { pgEnum } from "drizzle-orm/pg-core";

/* ==========================================
   1. ENUMS (Tipe Data Konstan)
   ========================================== */

/** Paket langganan SaaS FurniTech (PRD §2.A — tanpa free trial). */
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "pro",
  "max",
]);

/** Status langganan tenant. `past_due` = Midtrans gagal, `expired` = lewat periode. */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "expired",
]);

/**
 * Peran pengguna. `super_admin` milik FurniTech sebagai SaaS owner
 * (tenantId NULL), tiga lainnya milik pengrajin.
 * PENTING: tidak ada default — role harus selalu dipilih eksplisit.
 */
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "owner",
  "admin_penjualan",
  "tukang",
]);

/** Status siklus hidup pesanan (bukan status pembayaran). */
export const orderStatusEnum = pgEnum("order_status", [
  "pending_dp",
  "in_production",
  "quality_control",
  "ready_to_ship",
  "shipped",
  "completed",
  "cancelled",
]);

/** Status pembayaran; `dp_paid` = DP masuk, sisanya menunggu pelunasan. */
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "dp_paid",
  "fully_paid",
  "refunded",
]);

/**
 * Tahapan Visual Progress Tracker yang diunggah tukang.
 * Pemetaan stage -> order_status hidup di src/lib/order-status.ts
 * (bukan di sini) supaya jadi satu sumber kebenaran.
 */
export const progressStageEnum = pgEnum("progress_stage", [
  "bahan_dipotong",
  "perakitan",
  "finishing",
  "qc",
  "packing",
]);

/** Slot jadwal payout IRIS. UTC: 06:00 WIB = 23:00 UTC (hari sebelumnya), 18:00 WIB = 11:00 UTC. */
export const payoutSlotEnum = pgEnum("payout_slot", ["morning", "evening"]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "queued",
  "processing",
  "success",
  "failed",
]);

/** Siklus penagihan langganan SaaS (PRD §2.A ada opsi tahunan). */
export const billingPeriodEnum = pgEnum("billing_period", [
  "monthly",
  "yearly",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

/** Integrasi pihak ketiga yang diaudit di Super Admin Panel (ROADMAP Sprint 2). */
export const integrationServiceEnum = pgEnum("integration_service", [
  "midtrans",
  "iris",
  "cloudflare",
  "fonnte",
  "firebase",
  "supabase",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "success",
  "failed",
]);

/** Kanal notifikasi; kuota WA per paket dicatat di tabel notification_usage. */
export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "push",
]);
