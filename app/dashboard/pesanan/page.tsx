import Link from "next/link";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, productionProgress, tenants, users } from "@/db/schema";
import { normalizePhone } from "@/lib/wa-link";
import { requireTenantWrite } from "@/lib/auth/guard";
import { CarpenterQueue, type CarpenterQueueItem } from "@/components/carpenter-queue";
import type { ProgressStage } from "@/lib/order-status";
import { formatDateID, formatRupiah } from "@/lib/format";
import { EmptyState } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_FLOW } from "@/lib/order-status";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/labels";
import { OrderCard } from "@/components/order-card";

/**
 * Daftar pesanan (ROADMAP Sprint 3).
 *
 * RESPONSIF (PRD §3.1): tabel penuh disembunyikan di bawah `md` dan diganti
 * daftar kartu. Memaksa pengguna HP menggeser tabel horizontal adalah cara
 * tercepat membuat halaman terasa sempit — dan ini justru layar yang paling
 * sering dipakai.
 */
export default async function OrdersPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

  /*
   * Tukang mendapat tampilan yang sama sekali berbeda — bukan tabel pesanan
   * yang disamarkan. Alasan lengkapnya di src/components/carpenter-queue.tsx;
   * intinya: tukang hanya butuh pesanannya sendiri, dimensinya, tahapnya, dan
   * satu tombol untuk mengunggah foto. Data keuangan tenant tidak ada
   * gunanya di bengkel.
   */
  if (actor.role === "tukang") {
    const queue = await loadCarpenterQueue(actor.tenantId, actor.userId);
    return (
      <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <h1 className="text-headline-md text-foreground">Antrean Produksi</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            {queue.length === 0
              ? "Tidak ada pekerjaan yang menunggu."
              : `${queue.length} pekerjaan menunggu Anda.`}
          </p>
        </header>
        <CarpenterQueue items={queue} />
      </main>
    );
  }

  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      source: orders.source,
      customerName: orders.customerName,
      destinationCity: orders.destinationCity,
      totalAmount: orders.totalAmount,
      netTenantAmount: orders.netTenantAmount,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      carpenterName: users.fullName,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.assignedCarpenterId))
    .where(eq(orders.tenantId, actor.tenantId))
    .orderBy(desc(orders.createdAt));

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.orderStatus, (counts.get(row.orderStatus) ?? 0) + 1);
  }

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pesanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} pesanan tercatat.
          </p>
        </div>
        {/*
         * Tidak perlu dicek `actor.role !== "tukang"` lagi. Cabang tukang
         * sudah `return` di atas, jadi sampai sini role pasti owner atau
         * admin_penjualan. Pemeriksaan yang tidak mungkin salah begini hanya
         * memberi kesan ada kondisi yang belum ditangani.
         */}
        <Link
          href="/dashboard/pesanan/baru"
          className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Catat pesanan kustom
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {ORDER_STATUS_FLOW.map((status) => (
          <span
            key={status}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-secondary"
          >
            {ORDER_STATUS_LABELS[status]}: {counts.get(status) ?? 0}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Belum ada pesanan. Catat pesanan kustom atau tunggu pembeli dari storefront." />
      ) : (
        <>
          {/* Mobile & tablet kecil: daftar kartu. */}
          <ul className="grid gap-3 md:hidden">
            {rows.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>

          {/* Desktop: tabel penuh. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Bayar</th>
                  <th className="px-4 py-3 font-medium">Tukang</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/pesanan/${order.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {order.orderCode}
                      </Link>
                      {order.source === "manual" ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          kustom
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {order.customerName}
                      <span className="block text-xs text-muted-foreground">
                        {order.destinationCity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {formatRupiah(order.totalAmount)}
                      <span className="block text-xs text-muted-foreground">
                        cair {formatRupiah(order.netTenantAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.orderStatus as OrderStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {order.carpenterName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateID(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_STATUS_TONES[status] ?? "neutral"}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Muat antrean tukang: pesanan yang ditugaskan ke dia dan belum selesai.
 *
 * Tiga hal yang menentukan query ini:
 *
 * - **Filter `assignedCarpenterId = userId`.** Tanpa itu, tukang melihat
 *   seluruh pekerjaan tenant. Itu bukan hanya Breach privasi antar rekan
 *   kerja; itu juga membuat antrean meaningless, karena isinya bukan
 *   pekerjaannya.
 * - **Status terminal dibuang.** Pesanan `completed` dan `cancelled` tidak
 *   bisa lagi onerous progres, jadi menahannya di antrean hanya menambah
 *   gesekan.
 * - **Urut dari yang paling lama.** Antrean bengkel itu FIFO; pesanan
 *   terbaru tidak boleh mendahului yang lebih dulu masuk.
 *
 * `order_items` diambil terpisah lalu dikelompokkan di memori, bukan
 * di-join-kan. Kalau di-join, satu pesanan dengan lima item akan muncul lima
 * kali di daftar — dan itu persis yang membuat halaman antrean tampak seperti
 * data rusak.
 */
async function loadCarpenterQueue(
  tenantId: string,
  carpenterId: string,
): Promise<CarpenterQueueItem[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      orderStatus: orders.orderStatus,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      workshopName: tenants.name,
      createdAt: orders.createdAt,
    })
    .from(orders)
    // Join ke tenant untuk nama workshop pada pesan WhatsApp. `innerJoin`
    // sekaligus menjamin baris yang lolos benar-benar milik tenant yang
    // sedang dibuka, bukan hanya yang cocok angka tenantId-nya.
    .innerJoin(tenants, eq(tenants.id, orders.tenantId))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.assignedCarpenterId, carpenterId),
        notInArray(orders.orderStatus, ["completed", "cancelled"]),
      ),
    )
    .orderBy(orders.createdAt);

  if (rows.length === 0) return [];

  const orderIds = rows.map((row) => row.id);

  const [items, progress] = await Promise.all([
    db
      .select({
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        customSpecs: orderItems.customSpecs,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds)),
    // Hanya tahap terakhir per pesanan yang dipakai. Ambil semua lalu ambil
    // yang paling baru per order: jumlahnya sedikit (satu baris per unggahan
    // per pesanan), dan subquery Window Function di sini jauh lebih sulit
    // dibaca daripada pengurangan singkat di memori.
    db
      .select({
        orderId: productionProgress.orderId,
        stage: productionProgress.stage,
        createdAt: productionProgress.createdAt,
      })
      .from(productionProgress)
      .where(inArray(productionProgress.orderId, orderIds)),
  ]);

  const itemsByOrder = new Map<string, CarpenterQueueItem["items"]>();
  for (const item of items) {
    const specs = item.customSpecs ?? {};
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      productName: item.productName,
      quantity: item.quantity,
      lengthCm: specs.lengthCm,
      widthCm: specs.widthCm,
      heightCm: specs.heightCm,
      woodType: specs.woodType,
      finishingType: specs.finishingType,
    });
    itemsByOrder.set(item.orderId, list);
  }

  const lastStageByOrder = new Map<string, { stage: ProgressStage; at: number }>();
  for (const entry of progress) {
    const at = entry.createdAt.getTime();
    const current = lastStageByOrder.get(entry.orderId);
    if (!current || at > current.at) {
      lastStageByOrder.set(entry.orderId, {
        stage: entry.stage as ProgressStage,
        at,
      });
    }
  }

  return rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    orderStatus: row.orderStatus as CarpenterQueueItem["orderStatus"],
    customerName: row.customerName,
    /*
     * Normalisasi dilakukan di sini, bukan di komponen. Komponen hanya
     * memutuskan tampil atau tidak; kalau komponen yang memanggil
     * `normalizePhone`, logikanya bercabang di tempat yang tidak punya
     * akses ke data pesanan.
     * Nomor yang gagal dinormalisasi jadi `null` supaya tombol WhatsApp-nya
     * tidak dirender — `wa.me` tanpa nomor membuka WhatsApp tanpa tujuan, dan
     * pengguna baru sadar setelah menekan kirim.
     */
    customerPhone: normalizePhone(row.customerPhone),
    workshopName: row.workshopName,
    items: itemsByOrder.get(row.id) ?? [],
    lastStage: lastStageByOrder.get(row.id)?.stage ?? null,
  }));
}
