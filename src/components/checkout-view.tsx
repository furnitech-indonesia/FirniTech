import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { products } from "@/db/schema";
import { CheckoutClient } from "@/components/checkout-client";
import { CartView } from "@/components/cart-view";
import { readCart } from "@/lib/cart";
import { listShippingRates } from "@/lib/shipping";
import { isMidtransConfigured } from "@/lib/midtrans/snap";

/**
 * Halaman checkout (Sprint 5 bagian 2, 3, dan 4).
 *
 * Keranjang dibaca dari COOKIE lewat `readCart()` — bukan dikirim dari klien
 * dan bukan diambil dari query string. Semua harga di bawah diambil ulang
 * dari tabel `products`, dan ongkir dari `shipping_rates`; tidak ada satu
 * pun nominal yang datang dari browser. Komentar panjangnya ada di
 * `src/lib/cart.ts`.
 *
 * Keranjang yang isinya sudah tidak ada tidak dibuang diam-diam: barisnya
 * tetap ditampilkan dengan catatan "tidak tersedia", supaya pembeli melihat
 * apa yang hilang dan kenapa totalnya berbeda dari yang ia ingat. Membuangnya
 * tanpa penjelasan membuat angka di layar terasa salah, dan orang akan
 * mempercayainya lebih dulu daripada aplikasi.
 */
export async function CheckoutView({
  tenantSlug,
  tenantId,
  basePath,
}: {
  tenantSlug: string;
  tenantId: string;
  basePath: string;
}) {
  const cart = await readCart();

  // Tarif diambil di sini, satu query, lalu dikirim ke klien untuk
  // ditampilkan. Query-nya terjadi di server, jadi ini bukan membuka
  // endpoint tarif ke publik.
  const [rates, midtransReady] = await Promise.all([
    listShippingRates(tenantId),
    Promise.resolve(isMidtransConfigured()),
  ]);

  const slugs = cart.lines.map((line) => line.slug);
  const productRows =
    slugs.length > 0
      ? await db
          .select({
            slug: products.slug,
            name: products.name,
            basePrice: products.basePrice,
          })
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.isPublished, true),
              inArray(products.slug, slugs),
            ),
          )
      : [];

  const priceBySlug = new Map(productRows.map((p) => [p.slug, p]));

  /*
   * Subtotal dihitung dengan satu `reduce`, bukan akumulator yang ditulis
   * di dalam callback `map`. Alasannya teknis: `itemsSubtotal += ...` di
   * dalam callback adalah penulisan variabel yang蛟eta lint React Compiler
   * (`react-hooks/immutability`) tandai sebagai "reassign after render" —
   * memang benar untuk hook, tapi di sini hasil finally-nya sama persis.
   */
  const { lines, itemsSubtotal, itemCount } = cart.lines.reduce(
    (acc, line) => {
      const product = priceBySlug.get(line.slug);
      if (!product) {
        acc.lines.push({
          slug: line.slug,
          name: line.slug,
          qty: line.qty,
          pricePerUnit: 0,
          isAvailable: false,
        });
        return acc;
      }
      acc.lines.push({
        slug: line.slug,
        name: product.name,
        qty: line.qty,
        pricePerUnit: product.basePrice,
        isAvailable: true,
      });
      acc.itemsSubtotal += product.basePrice * line.qty;
      acc.itemCount += line.qty;
      return acc;
    },
    {
      lines: [] as {
        slug: string;
        name: string;
        qty: number;
        pricePerUnit: number;
        isAvailable: boolean;
      }[],
      itemsSubtotal: 0,
      itemCount: 0,
    },
  );

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`${basePath}/produk`}
        className="inline-flex min-h-11 items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeftIcon size={16} weight="light" aria-hidden />
        Kembali ke katalog
      </Link>

      <h1 className="mt-4 text-headline-md text-foreground">Checkout</h1>

      {/*
        Langkah alamat dan pembayaran SELALU dirender, termasuk saat keranjang
        kosong. Versi pertama menyembunyikannya dan menampilkan `EmptyState`
        saja — tapi `/checkout` bukan hanya tempat menyelesaikan pesanan,
        pembeli juga datang ke sini untuk menyiapkan alamat yang akan dipakai
        nanti. Halaman yang buntu di tengah jalan hanya membuat orang berhenti,
        dan tombol bayar yang tidak aktif sudah menjelaskan kenapa pembayaran
        belum bisa dilakukan.
      */}
      <section aria-label="Barang yang dipesan" className="mt-6">
        <CartView lines={lines} />
      </section>

      <div className="mt-8">
        <CheckoutClient
          tenantSlug={tenantSlug}
          itemsSubtotal={itemsSubtotal}
          itemCount={itemCount}
          rates={rates.map((rate) => ({
            regencyId: rate.regencyId,
            isDefault: rate.isDefault,
            rateAmount: rate.rateAmount,
          }))}
          midtransReady={midtransReady}
        />
      </div>
    </main>
  );
}
