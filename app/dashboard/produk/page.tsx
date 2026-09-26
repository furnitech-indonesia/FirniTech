import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ArmchairIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { createSignedUrls } from "@/lib/storage";
import { formatRupiah } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

/** Katalog produk (ROADMAP Sprint 3). */
export default async function ProductsPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      basePrice: products.basePrice,
      images: products.images,
      isPublished: products.isPublished,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      woodType: products.woodType,
      finishingType: products.finishingType,
    })
    .from(products)
    .where(eq(products.tenantId, actor.tenantId))
    .orderBy(desc(products.createdAt));

  // Foto privat → signed URL. Satu panggilan untuk semua foto, bukan satu per baris.
  const imagePaths = rows.flatMap((r) => r.images);
  const signedMap = await createSignedUrls(imagePaths);

  const variantCounts = await db
    .select({
      productId: productVariants.productId,
      total: sql<number>`count(*)::int`,
    })
    .from(productVariants)
    .groupBy(productVariants.productId);

  const variantMap = new Map(
    variantCounts.map((v) => [v.productId, Number(v.total)]),
  );

  const canEdit = actor.role === "owner" || actor.role === "admin_penjualan";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Katalog Produk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} produk · harga belum termasuk ongkir; ongkir dihitung
            saat checkout.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/produk/baru"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Tambah produk
          </Link>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <EmptyState message="Belum ada produk. Tambahkan produk pertama untuk mulai menjual." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((product) => {
            const cover = product.images[0];
            const coverUrl = cover ? signedMap[cover] : undefined;
            const variants = variantMap.get(product.id) ?? 0;

            return (
              <Card key={product.id} bare>
                <div className="flex gap-3 p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {coverUrl ? (
                      // Bucket Storage privat: URL dari signed URL server-side.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ArmchairIcon
                        size={28}
                        weight="light"
                        className="h-full w-full text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/produk/${product.id}`}
                      className="font-semibold text-foreground hover:text-accent-foreground"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-secondary">
                      {formatRupiah(product.basePrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.lengthCm}×{product.widthCm}×
                      {product.heightCm} cm · {product.woodType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.finishingType}
                      {variants > 0 ? ` · ${variants} variasi` : ""}
                    </p>
                    <div className="mt-2">
                      {product.isPublished ? (
                        <Badge tone="settled">tayang</Badge>
                      ) : (
                        <Badge tone="neutral">draft</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
