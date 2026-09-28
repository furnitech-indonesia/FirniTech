"use client";

import { useState } from "react";

import { CheckoutAddressStep } from "@/components/checkout-address-step";
import {
  CheckoutPaymentStep,
  type CheckoutAddressLite,
  type RateForDisplay,
} from "@/components/checkout-payment-step";

/**
 * Pembungkus langkah checkout yang butuh state bersama.
 *
 * Dipisah dari `checkout-view.tsx` karena view-nya Server Component (baca
 * cookie, query database) sedangkan langkah alamat dan pembayaran keduanya
 * Client Component, dan keduanya perlu HAL YANG SAMA: alamat yang sedang
 * dipilih. Melewatkan `selectedAddressId` sebagai prop dari server tidak
 * mungkin — di server belum ada yang dipilih, karena pembeli baru saja
 * membuka halaman.
 *
 * State yang dipegang di sini hanya satu: `selectedId`. Daftar alamat sendiri
 * milik langkah alamat (dia yang memanggil `listAddresses`), tapi
 * diteruskan ke sini lewat `onAddressesChange` supaya ongkir bisa
 * dihitung dari alamat terpilih.
 */
export function CheckoutClient({
  tenantSlug,
  itemsSubtotal,
  itemCount,
  rates,
  midtransReady,
  codReady,
}: {
  tenantSlug: string;
  itemsSubtotal: number;
  itemCount: number;
  rates: RateForDisplay[];
  midtransReady: boolean;
  codReady: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CheckoutAddressLite[]>([]);

  return (
    <div className="grid gap-6">
      <CheckoutAddressStep
        tenantSlug={tenantSlug}
        onSelectAddress={setSelectedId}
        onAddressesChange={(rows) =>
          setAddresses(
            rows.map((row) => ({
              id: row.id,
              recipientName: row.recipientName,
              addressLine: row.addressLine,
              cityName: row.cityName,
              regencyId: row.regencyId,
            })),
          )
        }
      />

      <CheckoutPaymentStep
        tenantSlug={tenantSlug}
        addresses={addresses}
        selectedAddressId={selectedId}
        itemsSubtotal={itemsSubtotal}
        itemCount={itemCount}
        rates={rates}
        midtransReady={midtransReady}
        codReady={codReady}
      />
    </div>
  );
}
