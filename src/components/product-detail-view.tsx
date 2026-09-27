import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeftIcon, RulerIcon, TreeIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductImage } from "@/components/catalog-view";
import { AddToCartForm } from "@/components/cart-view";
import { createSignedUrls } from "@/lib/storage";
import { formatNumber, formatRupiah } from "@/lib/format";

/**
 * Detail produk publik (ROADMAP Sprint 5).
 *
 * Mengembalikan `notFound()` kalau produknya tidak ada ATAU tidak published.
 * Keduanya harus 404 yang sama: kalau produk unpublished menjawab 403 atau
 * "tidak tersedia", pembeli bisa membedakan mana yang belum tayang, dan itu
 * membocorkan katalog yang belum siap. Halaman ini publik tanpa login.
 */
export async function ProductDetailView({
  tenantId,
  productSlug,
  basePath,
}: {
  tenantId: string;
  productSlug: string;
  basePath: string;
}) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.slug, productSlug),
        eq(products.isPublished, true),
      ),
    )
    .limit(1);

  if (!product) notFound();

  const images = product.images ?? [];
  const signed = await createSignedUrls([...new Set(images)]);
  // Foto pertama jadi sampul; sisanya mengikuti. Kalau produk tidak punya
  // foto sama sekali, komponen ProductImage sudah menampilkan "Tanpa foto",
  // jadi halaman ini tidak perlu penanganan tambahan.
  const [cover, ...gallery] = images;

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href={`${basePath}/produk`}
        className="inline-flex min-h-11 items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeftIcon size={16} weight="light" aria-hidden />
        Kembali ke katalog
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="grid gap-2">
          <ProductImage
            path={cover}
            signedUrl={cover ? signed[cover] : undefined}
            alt={product.name}
            className="rounded-2xl"
          />
          {gallery.length > 0 ? (
            <ul className="grid grid-cols-4 gap-2">
              {gallery.map((path) => (
                <li key={path}>
                  <ProductImage
                    path={path}
                    signedUrl={signed[path]}
                    alt={`${product.name} — foto tambahan`}
                    className="rounded-xl"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <p className="text-label-sm uppercase text-muted-foreground">
            {product.category}
          </p>
          <h1 className="text-headline-md text-foreground text-balance">
            {product.name}
          </h1>

          {product.description ? (
            <p className="text-body-md text-muted-foreground text-pretty">
              {product.description}
            </p>
          ) : null}

          <p className="text-code-tabular text-headline-md text-foreground">
            {formatRupiah(product.basePrice)}
          </p>

          <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-body-md">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <RulerIcon size={16} weight="light" aria-hidden />
                Dimensi
              </dt>
              <dd className="text-code-tabular text-right text-foreground">
                {formatNumber(product.lengthCm)} × {formatNumber(product.widthCm)} ×{" "}
                {formatNumber(product.heightCm)} cm
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <TreeIcon size={16} weight="light" aria-hidden />
                Bahan
              </dt>
              <dd className="text-right text-foreground">{product.woodType}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Finishing</dt>
              <dd className="text-right text-foreground">
                {product.finishingType}
              </dd>
            </div>
          </dl>

          {/*
            Tombol keranjang, bukan "Beli sekarang". Membeli langsung dari
            halaman detail berarti pembeli melewati pemilihan keranjang, dan
            untuk mebel kargo (yang ongkirnya bergantung pada kabupaten tujuan)
            hampir selalu ada lebih dari satu barang yang akan dipesan.
          */}
          <AddToCartForm productSlug={product.slug} />

          <p className="text-body-sm text-muted-foreground">
            Ongkir kargo dihitung setelah Anda memilih kota tujuan pada
            langkah pemesanan.
          </p>
        </div>
      </div>
    </main>
  );
}
