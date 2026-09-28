import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { deliveryProofs, orders, productionProgress } from "@/db/schema";
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

/**
 * Status pesanan yang masuk daftar kurir.
 *
 * `completed` ikut, bukan karena masih perlu diantar, tapi karena inilah
 * status yang berubah begitu bukti terkirim — dan pesanan yang barunya
 * selesai masih punya tempat di layar kurir sebagai "sudah dikirim".
 */
const SHIPPABLE_STATUSES = ["ready_to_ship", "shipped", "completed"] as const;

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
  /** Tahap produksi terakhir, untuk konteks saja. */
  lastStage: ProgressStage | null;
  /**
   * Apakah bukti penerimaan sudah pernah dikirim.
   *
   * Ada karena daftar ini TIDAK boleh menyembunyikan kiriman yang selesai.
   * Begitu bukti terkirim, status pesanan menjadi `completed` — dan status itu
   * termasuk yang ditampilkan, jadi tanpa kolom ini kartunya tetap ada tanpa
   * penjelasan apakah tombolnya masih bisa dipakai. Yang tidak boleh terjadi:
   * bukti kedua ditolak unique index di database. Jadi tugas server hanya
   * menahan agar form yang pasti gagal tidak ikut tampil.
   */
  /**
   * Pesanan COD atau bukan, dan sisa tagihannya.
   *
   * `remaining` dikirim ke form kurir supaya nominal yang boleh diterima
   * terlihat di layar, bukan hanya aturan di server. Aturannya tetap
   * ditegakkan di `submitDeliveryProof` — angka dari klien tidak pernah
   * dipercaya — tapi menampilkan sisa tagihan membuat kurir tidak perlu
   * menghitung sendiri dari nota.
   */
  isCod: boolean;
  remaining: number;

  hasProof: boolean;
  createdAt: Date;
};

export async function loadCourierQueue(
  tenantId: string,
  courierId: string,
): Promise<CourierDelivery[]> {
  /*
   * LEFT JOIN ke `delivery_proofs`, bukan subquery terpisah.
   *
   * `delivery_proofs` punya UNIQUE pada `order_id`, jadi join ini tidak
   * menggandakan baris pesanan — dan itu syaratnya, bukan kebetulan: kalau
   * Unique-nya dihapus someday, daftar ini akan menampilkan "kiriman" yang
   * sama beberapa kali dan kurir akan mengunggah bukti berulang. Subquery
   * `exists` lebih aman terhadap itu, tapi biayanya satu query lagi per
   * render; join dipakai karena unique-nya sudah dipastikan di database.
   */
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
      totalAmount: orders.totalAmount,
      dpAmount: orders.dpAmount,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
      proofId: deliveryProofs.id,
    })
    .from(orders)
    .leftJoin(deliveryProofs, eq(deliveryProofs.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        // PARAMETER YANG MEMBATASI SELURUH DAFTAR. Tanpa baris ini, kurir
        // melihat seluruh pengiriman tenant-nya.
        eq(orders.assignedCourierId, courierId),
        inArray(orders.orderStatus, [...SHIPPABLE_STATUSES]),
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
    isCod: row.paymentMethod === "cod",
    remaining: Math.max(0, row.totalAmount - row.dpAmount),
    hasProof: row.proofId !== null,
    createdAt: row.createdAt,
  }));
}
