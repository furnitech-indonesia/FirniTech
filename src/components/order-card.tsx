import Link from "next/link";

import { Badge } from "@/components/ui";
import { formatDateID, formatRupiah } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/labels";

/**
 * Kartu pesanan untuk layar sempit.
 *
 * Dipakai di bawah breakpoint `md`, menggantikan tabel (PRD §3.1). Kartu
 * dipilih karena setiap field bisa dibungkus label, sehingga tidak ada teks
 * yang harus ditebak artinya saat kolom hilang.
 */
export function OrderCard({
  order,
}: {
  order: {
    id: string;
    orderCode: string;
    source: string;
    customerName: string;
    destinationCity: string;
    totalAmount: number | bigint;
    netTenantAmount: number | bigint;
    orderStatus: string;
    paymentStatus: string;
    createdAt: Date;
    carpenterName: string | null;
  };
}) {
  return (
    <Link
      href={`/dashboard/pesanan/${order.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {order.orderCode}
          </p>
          <p className="truncate text-sm text-secondary">
            {order.customerName} · {order.destinationCity}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={ORDER_STATUS_TONES[order.orderStatus as OrderStatus] ?? "neutral"}>
            {ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]}
          </Badge>
          {order.source === "manual" ? (
            <span className="text-xs text-muted-foreground">kustom</span>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right font-medium text-foreground">
          {formatRupiah(order.totalAmount)}
        </dd>

        <dt className="text-muted-foreground">Saldo cair</dt>
        <dd className="text-right text-secondary">
          {formatRupiah(order.netTenantAmount)}
        </dd>

        <dt className="text-muted-foreground">Bayar</dt>
        <dd className="text-right text-secondary">
          {PAYMENT_STATUS_LABELS[
            order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS
          ]}
        </dd>

        <dt className="text-muted-foreground">Tukang</dt>
        <dd className="truncate text-right text-secondary">
          {order.carpenterName ?? "—"}
        </dd>
      </dl>

      <p className="mt-2 text-xs text-muted-foreground">
        {formatDateID(order.createdAt)}
      </p>
    </Link>
  );
}
