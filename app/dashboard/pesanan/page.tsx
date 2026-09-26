import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { formatDateID, formatRupiah } from "@/lib/format";
import { Badge, EmptyState } from "@/components/ui";
import { ORDER_STATUS_FLOW } from "@/lib/order-status";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/labels";

/** Daftar pesanan (ROADMAP Sprint 3). */
export default async function OrdersPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pesanan</h1>
          <p className="mt-1 text-sm text-slate-600">{rows.length} pesanan tercatat.</p>
        </div>
        {actor.role !== "tukang" ? (
          <Link
            href="/dashboard/pesanan/baru"
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Catat pesanan kustom
          </Link>
        ) : null}
      </header>

      {/* Ringkasan per status, memakai urutan resmi dari order-status.ts */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ORDER_STATUS_FLOW.map((status) => (
          <span
            key={status}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
          >
            {ORDER_STATUS_LABELS[status]}: {counts.get(status) ?? 0}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Belum ada pesanan. Catat pesanan kustom atau tunggu pembeli dari storefront." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
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
                <tr key={order.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/pesanan/${order.id}`}
                      className="font-medium text-slate-900 hover:text-amber-700"
                    >
                      {order.orderCode}
                    </Link>
                    {order.source === "manual" ? (
                      <span className="ml-2 text-xs text-slate-500">kustom</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {order.customerName}
                    <span className="block text-xs text-slate-500">
                      {order.destinationCity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRupiah(order.totalAmount)}
                    <span className="block text-xs text-slate-500">
                      cair {formatRupiah(order.netTenantAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.orderStatus as OrderStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {order.carpenterName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDateID(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={ORDER_STATUS_TONES[status] ?? "neutral"}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
