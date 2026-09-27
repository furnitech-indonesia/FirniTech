"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { PaymentBreakdown } from "@/components/payment-breakdown";
import { PLATFORM_FEE_RATE } from "@/lib/fees";

/**
 * Ringkasan biaya yang reacting pada nilai form (Custom Order Builder).
 *
 * Nilai diambil dengan `useWatch`, BUKAN `watch()`. Alasannya nyata: `watch`
 * adalah fungsi biasa yang dipanggil saat render, sehingga React Compiler
 * melewati memoisasi komponen dan nilai bisa stale di subtree yang sudah
 * dimemoisasi. `useWatch` adalah hook sungguhan, jadi aman dan ikut
 * subscribing hanya ke field yang dibutuhkan.
 *
 * Komponen ini harus berada DI DALAM <ZodForm> karena membaca form context.
 */
export function PaymentBreakdownLive() {
  const { control } = useFormContext();

  // Hanya field yang dibutuhkan; useWatch tidak membuat render ulang karena
  // field lain berubah.
  const [price, quantity, shippingFee, dpAmount] = useWatch({
    control,
    name: ["price", "quantity", "shippingFee", "dpAmount"],
  });

  return (
    <PaymentBreakdown
      itemPrice={toNumber(price, 0)}
      quantity={toNumber(quantity, 1)}
      shippingFee={toNumber(shippingFee, 0)}
      dpAmount={toNumber(dpAmount, 0)}
      platformFeeRate={PLATFORM_FEE_RATE}
    />
  );
}

/** Ambil digit dari input (mem-tolerant "Rp 1.500.000"), default bila kosong. */
function toNumber(value: unknown, fallback: number): number {
  if (typeof value !== "string" || !/[0-9]/.test(value)) return fallback;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}
