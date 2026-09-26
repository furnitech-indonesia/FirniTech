import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { deleteProduct, deleteVariant } from "@/lib/actions/products";
import { ProductForm } from "@/components/product-form";
import { VariantForm } from "@/components/variant-form";
import { createSignedUrls } from "@/lib/storage";
import { formatRupiah } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";

/**
 * Detail produk: ubah data dasar, kelola variasi, dan hapus.
 * Query selalu difilter tenantId — knowing an UUID produk tidak cukup untuk
 * membukanya di tenant lain.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product || product.tenantId !== actor.tenantId) {
    notFound();
  }

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.createdAt));

  const signedMap = await createSignedUrls(product.images);
  const isOwner = actor.role === "owner";
  const canEdit = actor.role === "owner" || actor.role === "admin_penjualan";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/produk" className="text-amber-700 hover:underline">
          ← Kembali ke katalog
        </Link>
      </p>

      <header className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatRupiah(product.basePrice)} · {product.isPublished ? "tayang" : "draft"}
          </p>
        </div>
        {product.images.length > 0 ? (
          <div className="flex gap-2">
            {product.images.map((path) => (
              <div
                key={path}
                className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100"
              >
                {signedMap[path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedMap[path]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6">
        {canEdit ? (
          <Card title="Ubah data produk" description="Harga tetap dalam rupiah penuh.">
            <ProductForm
              mode="edit"
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                lengthCm: product.lengthCm,
                widthCm: product.widthCm,
                heightCm: product.heightCm,
                woodType: product.woodType,
                finishingType: product.finishingType,
                basePrice: Number(product.basePrice),
                isPublished: product.isPublished,
              }}
            />
          </Card>
        ) : (
          <Card title="Data produk">
            <p className="text-sm text-slate-700">
              Peran {actor.role} hanya dapat melihat katalog, bukan mengubahnya.
            </p>
          </Card>
        )}

        {canEdit ? (
          <Card
            title="Variasi"
            description="Ukuran, jenis kayu, atau finishing lain. Kosongkan harga bila memakai harga dasar."
          >
            {variants.length === 0 ? (
              <p className="mb-4 text-sm text-slate-600">
                Belum ada variasi. Produk memakai data di atas sebagai varian bawaan.
              </p>
            ) : (
              <ul className="mb-4 grid gap-2">
                {variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{variant.name}</p>
                      <p className="text-xs text-slate-600">
                        {[
                          variant.lengthCm && `${variant.lengthCm} cm`,
                          variant.widthCm && `${variant.widthCm} cm`,
                          variant.heightCm && `${variant.heightCm} cm`,
                          variant.woodType,
                          variant.finishingType,
                          variant.sku && `SKU ${variant.sku}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {variant.price
                          ? formatRupiah(variant.price)
                          : "harga dasar"}
                      </span>
                      <ActionForm
                        action={deleteVariant}
                        hidden={{ variantId: variant.id, productId: product.id }}
                        submitLabel="Hapus"
                        tone="danger"
                        className="flex"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <VariantForm productId={product.id} />
          </Card>
        ) : null}

        {isOwner ? (
          <Card
            title="Hapus produk"
            description="Variasi ikut terhapus. Riwayat pesanan tetap utuh karena isian produk disalin ke item pesanan."
          >
            <ActionForm
              action={deleteProduct}
              hidden={{ id: product.id }}
              submitLabel="Hapus produk"
              tone="danger"
            >
              <p className="text-sm text-slate-700">
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
