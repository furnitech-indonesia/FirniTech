import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, productionProgress } from "@/db/schema";
import { createSignedUrls } from "@/lib/storage";
import { PROGRESS_STAGE_ORDER, type ProgressStage } from "@/lib/order-status";
import { PROGRESS_STAGE_LABELS } from "@/lib/labels";
import { normalizePhone } from "@/lib/wa-link";

/**
 * Pelacakan pesanan untuk pembeli (Sprint 5 bagian 4).
 *
 * MODUL INI PUBLIK dan tanpa sesi. Itulah satu-satunya alasan file ini
 * terpisah: aturannya soal data yang boleh keluar berbeda dari semua query
 * lain di repo, jadi sebaiknya dibaca sebagai satu blok.
 *
 * TIGA ATURAN YANG MENGATUR SELURUH ISI KEMBALIAN:
 *
 * 1. **Kode pesanan saja tidak cukup.** Halaman ini menampilkan nama pembeli,
 *    alamat, dan foto progres. `generateOrderCode()` memberi ~10^14 kombinasi,
 *    jadi kodenya tidak bisa ditebak dengan enumerate — tapi kode bisa
 *    DIBAGIKAN: difoto dari struk, dikirim lewat chat, atau diberikan ke orang
 *    yang seharusnya tidak tahu. Karena itu diverifikasi juga dengan nomor HP.
 *
 * 2. **Kegagalan tidak boleh membeda-bedakan.** "Kode tidak ada" dan "nomor
 *    salah" mengembalikan pesan yang sama persis, dan keduanya `null`.
 *    Kalau pesannya berbeda, halaman ini berubah jadi alat untuk menebak
 *    keberadaan pesanan orang.
 *
 * 3. **Data yang tidak ditampilkan TIDAK perlu ditampilkan sama sekali.**
 *    Tidak ada `netTenantAmount`, `midtransMdrFee`, `platformServiceFee`,
 *    `dpAmount` internals, email, maupun koordinat GPS. Margin toko bukan
 *    urusan pembeli, dan koordinat adalah lokasiSomeone's house.
 */

export type TrackingStage = {
  stage: ProgressStage;
  label: string;
  notes: string | null;
  carpenterName: string;
  at: Date;
  /** Signed URL, sudah dibuat. Null kalau object path-nya sudah hilang. */
  photoUrl: string | null;
};

export type TrackingOrder = {
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: Date;
  /** Total yang dibayar pembeli. Tanpa rincian margin toko. */
  totalAmount: number;
  customerName: string;
  /** Alamat lengkap pembeli. Ini miliknya sendiri, jadi ditampilkan utuh. */
  address: string;
  cityName: string;
  cargoName: string | null;
  trackingNumber: string | null;
  items: { productName: string; quantity: number }[];
  stages: TrackingStage[];
  /** Tahap terakhir yang reached, atau 0 kalau belum ada. */
  reachedStage: number;
};

/**
 * Cari pesanan untuk dilacak.
 *
 * Mengembalikan `null` untuk KEDUA kondisi gagal, dengan sengaja — lihat
 * aturan 2 di atas.
 */
export async function findOrderForTracking(
  orderCode: string,
  customerPhone: string,
): Promise<TrackingOrder | null> {
  const code = orderCode.trim().toUpperCase();
  const phone = normalizePhone(customerPhone);
  if (!code || !phone) return null;

  const [order] = await db
    .select({
      orderCode: orders.orderCode,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerAddress: orders.customerAddress,
      // Kota tujuan ada di `orders` sebagai `destinationCity`. Kode pos TIDAK
      // diambil dari `customer_addresses`，虽然 purchaseryyaNfurohat নিজের
      // alamatnya sendiri — join ke tabel itu hanya membuka jalan untuk
      // menampilkan alamat record yang salah bila `customer_address_id`
      // menunjuk data lain. Alamat yang ditampilkan sudah berupa snapshot
      // lengkap dari `customerAddress`.
      cityName: orders.destinationCity,
      cargoName: orders.cargoName,
      trackingNumber: orders.trackingNumber,
      id: orders.id,
    })
    .from(orders)
    .where(eq(orders.orderCode, code))
    .limit(1);

  if (!order) return null;

  /*
   * Nomor HP dibandingkan setelah dinormalisasi. Data bisa tersimpan sebagai
   * "08xx" (form back-office) atau "628xx" (checkout), dan pembeli sering
   * mengetik dengan format berbeda dari yang dia pakai dulu. Membandingkan
   * teks apa adanya akan menolak pembeli dengan pesan yang salah.
   */
  if (normalizePhone(order.customerPhone) !== phone) return null;

  const [items, progress] = await Promise.all([
    db
      .select({
        productName: orderItems.productName,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(orderItems.createdAt)),
    db
      .select({
        stage: productionProgress.stage,
        notes: productionProgress.notes,
        carpenterName: productionProgress.carpenterName,
        createdAt: productionProgress.createdAt,
        photoUrl: productionProgress.photoUrl,
      })
      .from(productionProgress)
      .where(eq(productionProgress.orderId, order.id))
      .orderBy(asc(productionProgress.createdAt)),
  ]);

  /*
   * Foto progres disimpan sebagai OBJECT PATH di bucket privat, jadi harus
   * ditukar jadi signed URL dulu. Signed URL berumur satu jam — cukup untuk
   * satu kali dilihat di halaman ini.
   *
   * Kalau object path-nya sudah tidak ada di storage, `createSignedUrls`
   * diam-diam tidak mengembalikan apa pun untuk path itu dan foto dirender
   * sebagai "foto tidak tersedia" di komponen. Itu lebih baik daripada
   * gambar rusak.
   */
  const paths = progress.map((p) => p.photoUrl).filter(Boolean);
  const signed = await createSignedUrls([...new Set(paths)]);

  const stages: TrackingStage[] = progress.map((p) => ({
    stage: p.stage as ProgressStage,
    label: PROGRESS_STAGE_LABELS[p.stage as ProgressStage] ?? p.stage,
    notes: p.notes,
    carpenterName: p.carpenterName,
    at: p.createdAt,
    photoUrl: signed[p.photoUrl] ?? null,
  }));

  // Kalau ada tahap yang urutnya melompat, pakai posisi dalam urutan resmi
  // supaya "2 dari 5" selalu berarti hal yang sama.
  const lastStage = stages.at(-1)?.stage;
  const reachedStage = lastStage
    ? PROGRESS_STAGE_ORDER.indexOf(lastStage) + 1
    : 0;

  return {
    orderCode: order.orderCode,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    customerName: order.customerName,
    address: order.customerAddress,
    cityName: order.cityName,
    cargoName: order.cargoName,
    trackingNumber: order.trackingNumber,
    items,
    stages,
    reachedStage,
  };
}
