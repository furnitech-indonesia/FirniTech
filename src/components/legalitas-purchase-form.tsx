"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatRupiah } from "@/lib/format";
import {
  purchaseLegalitasAddon,
  type PurchaseResult,
} from "@/lib/addons/actions";

/**
 * Form pembelian Paket Pendirian PT Perorangan.
 *
 * Tanpa input apa pun, jadi tidak memakai `ZodForm` — sama seperti form
 * domain. `test:responsive` menegakkan aturan "`ActionForm` tidak boleh
 * dipakai untuk form berisi input", dan bentuk kebalikannya juga benar:
 * `ZodForm` untuk form berisi input yang perlu divalidasi.
 *
 * Tombol DITAMPILKAN.disabled kalau langganannya belum lunas, dan
 * `purchaseLegalitasAddon` memeriksanya ulang di server. Pemeriksaan di
 * klien hanya untuk tampilan — pemeriksa yang benar-benar mencegah uang
 * masuk ke tempat yang salah ada di server.
 */
export function LegalitasPurchaseForm({
  price,
  langgananAktif,
  sudahDibeli,
}: {
  price: number;
  langgananAktif: boolean;
  sudahDibeli: boolean;
}) {
  const [state, action, pending] = useActionState<PurchaseResult | null, FormData>(
    purchaseLegalitasAddon,
    null,
  );

  // WAJIB di dalam `useEffect`: di body komponen dieksekusi setiap
  // render, termasuk yang tidak ada perubahan.
  const redirectTo = state?.ok ? state.redirectTo : null;
  useEffect(() => {
    if (redirectTo) window.location.href = redirectTo;
  }, [redirectTo]);

  return (
    <div className="flex flex-col gap-3">
      {!langgananAktif ? (
        <Alert>
          <AlertTitle>Selesaikan langganan dulu</AlertTitle>
          <AlertDescription>
            Paket pendirian hanya untuk toko yang langganannya sudah aktif.
          </AlertDescription>
        </Alert>
      ) : null}

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Gagal membuat tagihan</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={action}>
        <Button
          type="submit"
          disabled={pending || !langgananAktif || sudahDibeli}
          className="min-h-11 w-full"
        >
          {pending
            ? "Menyiapkan tagihan…"
            : sudahDibeli
              ? "Sudah dibeli"
              : `Beli paket seharga ${formatRupiah(price)}`}
        </Button>
      </form>

      <p className="text-body-sm text-muted-foreground">
        Pembayaran dilakukan sekali. Setelah dibayar, FurniTech menghubungi
        Anda untuk melengkapi data pendirian dan mengirim dokumen yang sudah
        terbit.
      </p>
    </div>
  );
}
