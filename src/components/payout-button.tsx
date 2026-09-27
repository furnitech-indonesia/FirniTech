"use client";

import { useActionState } from "react";
import { BankIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { runTenantPayout, type PayoutState } from "@/lib/actions/payout";
import { formatRupiah } from "@/lib/format";

/**
 * Tombol pencairan untuk owner.
 *
 * ANGGARANNYA SELALU DITAMPILKAN DI SEBELUM TOMBOL, dan itu bukan hiasan.
 * Tombol "Cairkan" tanpa angka yang terlihat adalah tombol yang tidak bisa
 * diperiksa — dan ini satu-satunya tempat di aplikasi di mana uang BENAR-BENAR
 * keluar dari platform ke rekening orang.
 *
 * Label tombolnya menyebut jumlahnya, jadi tidak ada keadaan di mana orang
 * menekan tombol yangRp-nya tidak tertulis: "Cairkan Rp 2.780.560".
 *
 * Tombol dalam keadaan kosong ("tidak ada yang bisa dicairkan") TIDAKdisable
 * saja, tapi explicação yang muncul di bawahnya menjelaskan kenapa — supaya
 * yang berikutnya tidak。， mengira aplikasinya rusak.
 */
export function PayoutButton({
  net,
  fee,
  orderCount,
}: {
  net: number;
  fee: number;
  orderCount: number;
}) {
  const [state, formAction, pending] = useActionState<PayoutState, FormData>(
    runTenantPayout,
    {},
  );

  const nothing = orderCount === 0;

  return (
    <div className="grid gap-3">
      {nothing ? (
        <p className="text-body-md text-muted-foreground">
          Tidak ada pesanan lunas yang sudah diterima barangnya dan belum
          dicairkan.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-surface-sunken p-4">
          <dl className="grid gap-1 text-body-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">
                {orderCount} pesanan siap dicairkan
              </dt>
              <dd className="text-code-tabular text-foreground">
                {formatRupiah(net + fee)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Fee pencairan</dt>
              <dd className="text-code-tabular text-foreground">
                −{formatRupiah(fee)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <dt className="font-medium text-foreground">Ditransfer</dt>
              <dd className="text-code-tabular text-title-md text-foreground">
                {formatRupiah(net)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <form action={formAction}>
        <Button
          type="submit"
          size="touch"
          disabled={pending || nothing || net <= 0}
          className="w-full"
        >
          <BankIcon size={18} weight="bold" aria-hidden />
          {pending
            ? "Mengirim…"
            : nothing
              ? "Tidak ada yang bisa dicairkan"
              : `Cairkan ${formatRupiah(net)}`}
        </Button>
      </form>

      {state.error ? (
        <p className="text-body-sm text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="flex items-start gap-2 text-body-sm text-status-settled">
          <PaperPlaneTiltIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </p>
      ) : null}

      {net <= 0 && !nothing ? (
        <p className="text-body-sm text-muted-foreground">
          Saldo belum cukup untuk menutup fee pencairan, jadi tidak ada yang
          bisa dikirim.
        </p>
      ) : null}
    </div>
  );
}
