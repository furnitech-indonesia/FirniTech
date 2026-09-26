"use client";

import { useMemo } from "react";

/**
 * Pratinjau kalkulasi DP/pelunasan untuk Custom Order Builder.
 *
 * Perhitungan TIDAK dikosongkan di sini: server menghitung ulang saat
 * menyimpan (lihat createCustomOrder). Versi ini hanya agar staf bisa
 * melihat sisa tagihan sebelum menekan tombol simpan.
 */
export function PaymentBreakdown({
  itemPrice,
  quantity,
  shippingFee,
  dpAmount,
  platformFeeRate,
}: {
  itemPrice: number;
  quantity: number;
  shippingFee: number;
  dpAmount: number;
  platformFeeRate: number;
}) {
  const breakdown = useMemo(() => {
    const itemsSubtotal = itemPrice * quantity;
    const total = itemsSubtotal + shippingFee;
    const platformFee = Math.round(total * platformFeeRate);
    const net = total - platformFee;
    const remaining = Math.max(0, total - dpAmount);

    return { itemsSubtotal, shippingFee, total, platformFee, net, remaining };
  }, [itemPrice, quantity, shippingFee, dpAmount, platformFeeRate]);

  const rupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="grid gap-1 rounded-xl bg-slate-100 p-3 text-sm">
      <Row label="Subtotal item" value={rupiah(breakdown.itemsSubtotal)} />
      <Row label="Ongkir kargo" value={rupiah(breakdown.shippingFee)} />
      <Row label="Total all-in" value={rupiah(breakdown.total)} strong />
      <Row
        label={`Fee platform (${platformFeeRate * 100}%)`}
        value={`− ${rupiah(breakdown.platformFee)}`}
      />
      <Row label="Saldo cair pengrajin" value={rupiah(breakdown.net)} />
      <Row label="Sisa tagihan" value={rupiah(breakdown.remaining)} strong />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>
        {label}
      </span>
      <span
        className={
          strong ? "font-semibold text-slate-900" : "text-slate-700 tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
