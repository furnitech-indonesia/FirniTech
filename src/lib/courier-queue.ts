import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { orders, productionProgress } from "@/db/schema";
import type { ProgressStage } from "@/lib/labels";

/**
 * Antrean pengiriman untuk satu kurir (Sprint 6, keputusan pemilik produk).
 *
 * PRINSIP AKSES: loader ini memfilter `assignedCourierId = userId` pada
 * query-nya, bukan hanya menyembunyikan lewat UI. Alasannya: klien Drizzle
 * memakai user postgres yang **bypass** RLS, jadi filter di sini adalah
 * lapisan aplikasi yang sebenarnya. Policy RLS `orders_courier_read`
 * (drizzle/0010) melakukan hal yang sama untuk jalur anon — dua lapis,
 * karena policy yang tidak sengaja terpasang adalah cara data pengrajin bocor
 * ke akun kurir.
 *
 * YANG SENGAJA TIDAK DIAMBIL:
 *   - `totalAmount`, `netTenantAmount`, dan fee apa pun. Kurir tidak
 *     memindahkan uang, jadi angka itu tidak ada gunanya dan hanya
 *     jadi kebocoran keuangan tenant.
 *   - Baris pesanan milik kurir lain. Kalau satu tenant punya dua kurir,
 *     keduanya melihat daftar yang benar-benar berbeda.
 *   - Email. Nomor HP hanya empat digit terakhir, karena itu yang dibutuhkan
 *     untuk mengenali kiriman, sementara nomor penuh adalah data pribadi orang.
 */

/** Status pesanan yang berarti barangnya siap untuk ditarik. */
const READY_STATUSES = ["ready_to_ship", "shipped", "completed"] as const;

export type CourierDelivery = {
  id: string;
  orderCode: string;
  customerName: string;
  /** Alamat tujuan, dipotong supaya tidak sepanjang alamat lengkap. */
  destinationLine: string;
  customerPhoneLast4: string;
  cargoName: string | null;
  trackingNumber: string | null;
  /**
   * Tahap produksi terakhir, untuk konteks saja — bukan wajib, dan yang
   * penting bukan angkanya melainkan kenapa barang itu belum bisa dikirim.
   * Di-cast karena diambil dari query yang mengembalikan `text`: enum-nya
   * dijaga di `production_progress`, dan memaksa setiap pemanggil
   * memvalidasi ulang di tempat yang salah adalah pekerjaan yang lebih besar
   * daripada satu cast di loader.
   */
  lastStage: ProgressStage | null;
  createdAt: Date;
};

export async function loadCourierQueue(
  tenantId: string,
  courierId: string,
): Promise<CourierDelivery[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerAddress: orders.customerAddress,
      destinationCity: orders.destinationCity,
      cargoName: orders.cargoName,
      trackingNumber: orders.trackingNumber,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        // PARAMETER YANG MEMBATASI SELURUH DAFTAR. Tanpa baris ini, kurir
        // melihat seluruh pengiriman tenant-nya.
        eq(orders.assignedCourierId, courierId),
        inArray(orders.orderStatus, [...READY_STATUSES]),
      ),
    )
    .orderBy(asc(orders.createdAt));

  if (rows.length === 0) return [];

  /*
   * Tahap produksi diambil terpisah, bukan lewat join, supaya satu pesanan
   * dengan lima tahap tidak muncul lima kali di daftar kurir. Join di sini
   * terlihat innocuous tapi menghasilkan daftar yang isinya berulang — dan
   * kurir bisa mengunggah bukti untuk "kiriman" yang sama lima kali.
   */
  const stages = await db
    .select({
      orderId: productionProgress.orderId,
      stage: productionProgress.stage,
    })
    .from(productionProgress)
    .where(
      inArray(
        productionProgress.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(productionProgress.createdAt));

  const lastStage = new Map<string, ProgressStage>();
  for (const row of stages) {
    if (row.orderId) lastStage.set(row.orderId, row.stage as ProgressStage);
  }

  return rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    customerName: row.customerName,
    destinationLine: `${row.destinationCity} — ${row.customerAddress}`.slice(0, 120),
    customerPhoneLast4: row.customerPhone.slice(-4),
    cargoName: row.cargoName,
    trackingNumber: row.trackingNumber,
    lastStage: lastStage.get(row.id) ?? null,
    createdAt: row.createdAt,
  }));
}
