import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
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
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pesanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} pesanan tercatat.
          </p>
        </div>
        {actor.role !== "tukang" ? (
          <Link
            href="/dashboard/pesanan/baru"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Catat pesanan kustom
          </Link>
        ) : null}
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
