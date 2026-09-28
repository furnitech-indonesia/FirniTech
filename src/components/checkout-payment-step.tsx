"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CreditCardIcon, LockIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createCheckoutOrder } from "@/lib/actions/checkout";
import { emptyCart } from "@/lib/actions/cart-actions";
import { formatRupiah } from "@/lib/format";
import {
  buildShippingIndex,
  shippingFeeFor,
  type ShippingIndex,
} from "@/lib/shipping-lookup";

/**
 * Langkah pembayaran di checkout (Sprint 5 bagian 4).
 *
 * Yang ditampilkan di sini BUKAN angka yang akan ditagih. Yang ditagih
 * dihitung ulang di `createCheckoutOrder` dari `products`, `shipping_rates`,
 * dan cookie keranjang. Perbedaannya tidak bisa dihindari — harga bisa saja
 * berubah antara render dan klik — jadi angka di layar ini bisa basi, dan
 * fungsinya hanya memberi gambaran, bukan mengikat.
 *
 * Yang dijaga ketat: tombol bayar tidak pernah aktif tanpa alamat yang
 * sudah dipilih. Bayar tanpa alamat berarti ongkir tidak bisa dihitung, dan
 * `createCheckoutOrder` akan menolaknya juga — jadi membiarkan tombol aktif
 * hanya memindahkan penolakan itu ke detik terakhir, setelah pembeli sudah
 * menekan tombol bayar.
 */

export type CheckoutAddressLite = {
  id: string;
  recipientName: string;
  addressLine: string;
  cityName: string;
  regencyId: string | null;
};

/** Tarif milik tenant, dikirim ke klien HANYA untuk tampilan. */
export type RateForDisplay = {
  regencyId: string | null;
  isDefault: boolean;
  rateAmount: number;
};

export function CheckoutPaymentStep({
  tenantSlug,
  addresses,
  selectedAddressId,
  itemsSubtotal,
  itemCount,
  rates,
  midtransReady,
  codReady,
}: {
  tenantSlug: string;
  addresses: CheckoutAddressLite[];
  selectedAddressId: string | null;
  itemsSubtotal: number;
  itemCount: number;
  rates: RateForDisplay[];
  /** Server key Midtrans sudah terisi? Kalau tidak, jangan janji bisa bayar. */
  midtransReady: boolean;
  /** Rekening pengrajin sudah terverifikasi, jadi COD boleh ditawarkan. */
  codReady: boolean;
}) {
  const [email, setEmail] = useState("");
  // Default `va`: pembeli yang tidak memilih apa-apa mendapat metode yang
  // tidak butuh rekening pengrajin terverifikasi.
  const [method, setMethod] = useState<"va" | "cod">("va");
  const [state, formAction, pending] = useActionState(createCheckoutOrder, {});
  const redirected = useRef(false);

  const index: ShippingIndex = buildShippingIndex(rates);
  const selected = addresses.find((a) => a.id === selectedAddressId) ?? null;
  const shippingFee = selected ? shippingFeeFor(index, selected.regencyId) : null;
  const total = shippingFee === null ? itemsSubtotal : itemsSubtotal + shippingFee;

  /*
   * Server Action dipanggil dari Client Component tidak bisa memanggil
   * `redirect()` — pemanggilnya fetch ke Route Handler, bukan navigasi
   * server, jadi `redirect()` akan dilempar dan tidak pernah sampai ke
   * browser. Karena itu `createCheckoutOrder` mengembalikan URL Midtrans,
   * dan navigasinya dilakukan di sini lewat `window.location.assign`.
   *
   * Keranjang dikosongkan DI SINI, bukan di dalam action — lihat catatan
   * panjangnya di `createCheckoutOrder`: mengosongkan cookie di server
   * membuat Router me-render ulang halaman tanpa `CheckoutClient`, sehingga
   * komponen yang harus mengarahkan justru ter-unmount sebelum sempat
   * bekerja. Pembeli akan melihat halaman keranjang kosong padahal
   * tagihannya sudah dibuat.
   */
  useEffect(() => {
    if (!state.redirectTo || redirected.current) return;
    redirected.current = true;
    const target = state.redirectTo;

    void (async () => {
      try {
        await emptyCart();
      } catch {
        // Sengaja ditelan. Kalau pengosongan keranjang gagal, pembeli tetap
        // HARUS sampai ke halaman pembayaran — uangnya akan ditagih, dan
        // pembeli yang tidak bisa membayar karena keranjang tidak
        // terkosongkan jauh lebih merusak daripada keranjang yang masih ada.
      }
      window.location.assign(target);
    })();
  }, [state.redirectTo]);

  /*
   * Ketersediaan metode.
   *
   * `codReady` datang dari server (halaman checkout sudah tahu apakah
   * rekening pengrajin terverifikasi), BUKAN dari penentuan di klien. Kalau
   * ditentukan di sini, pembeli akan melihat pilihan COD yang menolaknya
   * padahal tidak ada masalah — dan "tidak bisa bayar di tempat" dari toko
   * yang Systemic menawarkannya adalah kebohongan.
   */
  const methodReady = method === "cod" ? codReady : midtransReady;
  const blocked =
    !methodReady || !selectedAddressId || shippingFee === null || itemCount === 0;

  return (
    <Card>
      <CardContent className="grid gap-4">
        <h2 className="text-title-md text-foreground">4. Pembayaran</h2>

        {/*
          Metode pembayaran — dua pilihan, satu harga.

          "Satu harga" itu penting dan bukan kebetulan: total di atas tidak
          berubah saat metode diganti, karena kedua metode menagih nominal
          yang sama. Yang berbeda adalah KAPAN dan BAGAIMANA uangnya sampai,
          dan itu yang dijelaskan di setiap pilihan.
        */}
        <fieldset className="grid gap-2">
          <legend className="text-label-lg text-foreground">
            Cara pembayaran
          </legend>

          <MethodOption
            name="paymentMethod"
            value="va"
            checked={method === "va"}
            onChange={setMethod}
            disabled={!midtransReady}
            title="Virtual account"
            description="Bayar lewat BCA, BNI, BRI, BSI, Danamon, atau Permata sekarang. Bukti pembayaran otomatis masuk ke halaman lacak."
          />
          <MethodOption
            name="paymentMethod"
            value="cod"
            checked={method === "cod"}
            onChange={setMethod}
            disabled={!codReady}
            title="Bayar di tempat (COD)"
            description={
              codReady
                ? "Serahkan uang tunai ke kurir saat barang diterima, atau transfer ke rekening pengrajin. Nomor rekeningnya muncul di halaman lacak."
                : "Toko ini belum menerima pembayaran di tempat."
            }
          />
        </fieldset>

        {!midtransReady && !codReady ? (
          <Alert variant="destructive">
            <AlertDescription>
              Pembayaran belum dikonfigurasi di server ini. Hubungi toko untuk
              memesan lewat WhatsApp.
            </AlertDescription>
          </Alert>
        ) : null}

        {selected && shippingFee === null ? (
          <Alert variant="destructive">
            <AlertDescription>
              Toko ini belum punya tarif ongkir untuk kabupaten tujuan Anda.
              Hubungi toko untuk membicarakannya.
            </AlertDescription>
          </Alert>
        ) : null}

        <dl className="grid gap-2 text-body-md">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              Subtotal {itemCount > 0 ? `(${itemCount} barang)` : ""}
            </dt>
            <dd className="text-code-tabular text-foreground">
              {formatRupiah(itemsSubtotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Ongkir kargo</dt>
            <dd className="text-code-tabular text-foreground">
              {shippingFee === null ? "—" : formatRupiah(shippingFee)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
            <dt className="text-foreground">Total</dt>
            <dd className="text-code-tabular text-headline-md text-foreground">
              {formatRupiah(total)}
            </dd>
          </div>
        </dl>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input
            type="hidden"
            name="addressId"
            value={selectedAddressId ?? ""}
          />

          <label className="grid gap-1.5 text-label-lg text-foreground">
            Email untuk bukti pembayaran
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-body-md text-foreground"
            />
            <span className="text-body-sm text-muted-foreground">
              {method === "va"
                ? "Midtrans mengirim pengingat dan bukti ke alamat ini. Satu email per pesanan, tidak dipakai untuk hal lain."
                : "Bukti COD diunggah kurir, jadi email ini dipakai untuk pengingat status pesanan saja. Satu email per pesanan, tidak dipakai untuk hal lain."}
            </span>
          </label>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state?.fieldErrors?.email ? (
            <p className="text-body-sm text-destructive">
              {state.fieldErrors.email}
            </p>
          ) : null}

          <Button
            type="submit"
            size="touch"
            disabled={blocked || pending || email.trim() === ""}
          >
            {pending
              ? "Memproses…"
              : method === "cod"
                ? `Pesan & bayar di tempat · ${formatRupiah(total)}`
                : `Bayar ${formatRupiah(total)}`}
          </Button>

          {/*
            Dua catatan di bawah ini BERUBAH sesuai metode yang dipilih.
            Menampilkan "Pembayaran ditangani Midtrans" sementara yang
            dipilih COD, atau sebaliknya, berarti FurniTech menyatakan
            sesuatu yang tidak benar di halaman pembayaran — dan itu tempat
            orang paling serius saat menyerahkan uang.
          */}

          {method === "va" ? (
            <>
              <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
                <LockIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
                Pembayaran ditangani Midtrans. FurniTech tidak pernah meminta
                nomor kartu, PIN, atau OTP Anda.
              </p>
              <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
                <CreditCardIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
                Bayar lewat virtual account yang Anda pilih di halaman
                pembayaran.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
              <LockIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
              Pembayaran di tempat tidak lewat layanan pembayaran mana pun.
              FurniTech tidak pernah meminta nomor kartu, PIN, atau OTP Anda,
              dan tidak memotong biaya apa pun dari COD.
            </p>
          )}

          {/*
            Jalur cadangan kalau pengalihan otomatis tidak terjadi — peramban
            memblokir navigasi yang bukan hasil klik, atau JavaScript belum
            selesai. Tampil HANYA kalau tagihan sudah dibuat, karena sebelum
            itu tidak ada apa pun untuk dibayar.
          */}
          {state.redirectTo ? (
            <a
              href={state.redirectTo}
              className="inline-flex min-h-11 items-center gap-2 text-body-sm text-primary underline"
            >
              Tidak ter arah otomatis? Buka halaman pembayaran
            </a>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Satu pilihan metode pembayaran.
 *
 * Radioinput asli, bukan tombol dengan `onClick` — jadi bisa dipakai dengan
 * keyboard, dibaca screen reader sebagai bagian dari `fieldset`, dan
 * `--min-h-11`-nya otomatis karena style-nya di sini.
 */
function MethodOption({
  name,
  value,
  checked,
  onChange,
  disabled,
  title,
  description,
}: {
  name: string;
  value: "va" | "cod";
  checked: boolean;
  onChange: (next: "va" | "cod") => void;
  disabled: boolean;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`flex min-h-11 items-start gap-3 rounded-xl border p-3 ${
        checked
          ? "border-primary bg-accent"
          : "border-border bg-card"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 h-5 w-5 shrink-0 accent-primary"
      />
      <span className="grid gap-0.5">
        <span className="text-body-md font-medium text-foreground">
          {title}
        </span>
        <span className="text-body-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
