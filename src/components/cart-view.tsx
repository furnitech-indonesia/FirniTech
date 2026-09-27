"use client";

import Link from "next/link";
import { ShoppingCartIcon, TrashIcon } from "@phosphor-icons/react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panels";
import { addToCart, updateCartQty } from "@/lib/actions/cart-actions";
import { formatRupiah, formatNumber } from "@/lib/format";

/**
 * Keranjang & ringkasan checkout (Sprint 5).
 *
 * WAJIB `"use client"`. Komponen ini mengimpor `ActionForm` (Client
 * Component) dan ikon dari entry utama Phosphor, dan tanpa direktif ini ia
 * dianggap Server Component — lalu `createContext` dari entry utama itu
 * dievaluasi di lingkungan RSC dan build gagal dengan
 * `createContext is not a function`. Gejalanya muncul jauh dari penyebabnya:
 * bukan di berkas ini, tapi di `page.tsx` yang mengimpornya.
 * SEMUA nominal di sini berasal dari server. `pricePerUnit` di bawah
 * menerima harga yang SUDAH diambil dari `products` saat render, bukan dari
 * browser — dan `createCheckoutOrder` menghitungnya lagi sendiri sebelum
 * menulis pesanan.
 *
 * Kalau harga di layar ini berbeda dari yang ditagih, itu bug tampilan. Kalau
 * yang ditagih berbeda dari yang di layar, itu bug uang. Karena itu yang
 * ditagih dihitung ulang, bukan yang ditampilkan.
 */

export type CartViewLine = {
  slug: string;
  name: string;
  qty: number;
  pricePerUnit: number;
  isAvailable: boolean;
};

export function CartView({ lines }: { lines: CartViewLine[] }) {
  if (lines.length === 0) {
    return (
      <EmptyState message="Keranjang masih kosong. Pilih barang dari katalog dulu." />
    );
  }

  const subtotal = lines
    .filter((line) => line.isAvailable)
    .reduce((sum, line) => sum + line.qty * line.pricePerUnit, 0);
  const count = lines.filter((l) => l.isAvailable).reduce((s, l) => s + l.qty, 0);

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {lines.map((line) => (
          <li
            key={line.slug}
            className="grid gap-2 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body-md text-foreground">{line.name}</p>
                <p className="text-code-tabular text-body-sm text-muted-foreground">
                  {formatRupiah(line.pricePerUnit)} / buah
                </p>
                {!line.isAvailable ? (
                  <p className="text-body-sm text-destructive">
                    Barang ini sudah tidak tersedia dan tidak akan ikut
                    ditagih.
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-code-tabular text-body-md text-foreground">
                {formatRupiah(line.qty * line.pricePerUnit)}
              </p>
            </div>

            {line.isAvailable ? (
              <div className="flex items-center gap-2">
                <ActionForm
                  action={updateCartQty}
                  hidden={{ productSlug: line.slug, qty: line.qty - 1 }}
                  className="contents"
                >
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    aria-label={`Kurangi jumlah ${line.name}`}
                    disabled={line.qty <= 1}
                  >
                    <MinusIcon size={14} weight="bold" aria-hidden />
                  </Button>
                </ActionForm>

                <span className="min-w-8 text-center text-code-tabular text-body-md">
                  {formatNumber(line.qty)}
                </span>

                <ActionForm
                  action={updateCartQty}
                  hidden={{ productSlug: line.slug, qty: line.qty + 1 }}
                  className="contents"
                >
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    aria-label={`Tambah jumlah ${line.name}`}
                    disabled={line.qty >= 99}
                  >
                    <PlusIcon size={14} weight="bold" aria-hidden />
                  </Button>
                </ActionForm>

                <ActionForm
                  action={updateCartQty}
                  hidden={{ productSlug: line.slug, qty: 0 }}
                  className="contents ml-auto"
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${line.name} dari keranjang`}
                  >
                    <TrashIcon size={16} weight="bold" aria-hidden />
                  </Button>
                </ActionForm>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <span className="text-body-md text-muted-foreground">
          Subtotal {formatNumber(count)} barang
        </span>
        <span className="text-code-tabular text-title-md text-foreground">
          {formatRupiah(subtotal)}
        </span>
      </div>

      <p className="text-body-sm text-muted-foreground">
        Ongkir ditambahkan setelah alamat pengiriman dipilih. Total akhir
        dihitung ulang di server, bukan diambil dari layar ini.
      </p>
    </div>
  );
}

/**
 * Tombol "Masukkan keranjang" di halaman detail produk.
 *
 * Pakai `ActionForm`, bukan `<form action={serverAction}>` langsung.
 *
 * Semua aksi Server Action di repo ini berbentuk `(prevState, formData)`,
 * sedangkan `<form action>` mengharapkan `(formData)`. Dipanggil langsung,
 * argumen pertama akan menerima FormData dan `_prev` terisi data form —
 * kebetulan aman di sini karena `addToCart` tidak memakai `_prev`, tapi itu
 * bergantung pada detail yang rapuh. `ActionForm` adalah jembatan yang benar.
 */
export function AddToCartForm({ productSlug }: { productSlug: string }) {
  return (
    /*
     * `submitLabel` SENGAJA TIDAK dipakai. `ActionForm` merender tombolnya
     * sendiri kalau `submitLabel` diisi, dan `children` di sini juga berisi
     * tombol — hasilnya DUA tombol submit dengan nama yang sama di satu form.
     * Itu bukan hanya soal tampilan: Playwright (`getByRole` dengan strict
     * mode) langsung menolak, dan yang lebih buruk, orang bisa unknowingly
     * menekan tombol yang salah.
     */
    <ActionForm
      action={addToCart}
      hidden={{ productSlug, qty: 1 }}
      className="contents"
    >
      <Button type="submit" size="touch" className="w-full">
        <ShoppingCartIcon size={18} weight="light" aria-hidden />
        Masukkan keranjang
      </Button>
    </ActionForm>
  );
}

/** Tautan ke checkout, dipakai di header storefront. */
export function CheckoutLink({ basePath, count }: { basePath: string; count: number }) {
  if (count === 0) return null;
  return (
    <Link
      href={`${basePath}/checkout`}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-label-lg text-foreground transition-colors hover:bg-muted"
    >
      <ShoppingCartIcon size={18} weight="light" aria-hidden />
      <span className="sr-only">Keranjang,</span>
      {formatNumber(count)} barang
    </Link>
  );
}
