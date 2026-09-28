"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateID, formatRupiah } from "@/lib/format";
import { purchaseDomainAddon, type PurchaseResult } from "@/lib/addons/actions";
import { DOMAIN_ADDON } from "@/lib/addons";

/**
 * Form pembelian add-on custom domain.
 *
 * Sengaja TIDAK memakai `ZodForm`, dan alasannya bukan karena tidak ada
 * field. Domain ini sudah DITERIMA dan DIVERIFIKASI lebih dulu oleh panel
 * admin; yang di sini hanya tombol bayar. `ZodForm` ada untuk form berisi
 * input yang perlu divalidasi di browser, dan `test:responsive` menegakkan
 * aturan itu — jadi memakainya di sini akan melanggar aturan yang
 * berlaku untuk tempat lain.
 *
 * Kalau domain belum terverifikasi, halaman tidak merender form ini sama
 * sekali. `purchaseDomainAddon` tetap memeriksanya ulang di server, karena
 * pemeriksaan di halaman bisa dilewati dengan mengedit form.
 */
export function DomainPurchaseForm({
  domain,
  price,
  status,
  suspendedAt,
}: {
  domain: string;
  price: number;
  status: "unpaid" | "active" | "suspended";
  suspendedAt: Date | null;
}) {
  const [state, action, pending] = useActionState<PurchaseResult | null, FormData>(
    purchaseDomainAddon,
    null,
  );

  // Server Action dari Client Component tidak bisa `redirect()`. Yang
  // dikembalikan adalah `redirectTo`, dan navigasinya dilakukan di sini.
  //
  // WAJIB di dalam `useEffect`, bukan langsung di body komponen: kalau di
  // body,`window.location.href` dieksekusi setiap render, termasuk
  // render yang tidak ada perubahan.`)
  const redirectTo = state?.ok ? state.redirectTo : null;
  useEffect(() => {
    if (redirectTo) window.location.href = redirectTo;
  }, [redirectTo]);

  return (
    <div className="flex flex-col gap-4">
      {status === "suspended" ? (
        <Alert variant="default">
          <AlertTitle>Domain ditangguhkan</AlertTitle>
          <AlertDescription>
            Periode sebelumnya berakhir
            {suspendedAt ? ` pada ${formatDateID(suspendedAt)}` : ""} dan
            tidak diperpanjang. Bayar lagi untuk mengaktifkannya. Toko tetap
            bisa dibuka lewat subdomain gratis.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1">
        <p className="text-body-md text-foreground">
          {formatRupiah(price)} per {DOMAIN_ADDON.periodMonths} bulan
        </p>
        <p className="text-body-sm text-muted-foreground">
          Dibayar sekali di muka untuk {DOMAIN_ADDON.periodMonths} bulan
          penuh, lalu diperpanjang otomatis setiap {DOMAIN_ADDON.periodMonths}{" "}
          bulan. Tidak ada prorata: kalau berhenti di bulan ke-5, sisa bulan
          tidak dikembalikan — dan biaya Cloudflare-nya juga sudah lunas.
        </p>
      </div>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Gagal membuat tagihan</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={action}>
        <input type="hidden" name="domain" value={domain} />
        <Button type="submit" disabled={pending} className="min-h-11 w-full">
          {pending ? "Menyiapkan tagihan…" : `Bayar ${formatRupiah(price)}`}
        </Button>
      </form>

      <p className="text-body-sm text-muted-foreground">
        Tagihan dibuat otomatis 30 hari sebelum periode berakhir. Kalau tidak
        dibayar sampai {DOMAIN_ADDON.suspendAfterMonths} bulan setelah periode
        habis, domain ditangguhkan — sementara subdomain gratis tetap jalan.
      </p>
    </div>
  );
}
