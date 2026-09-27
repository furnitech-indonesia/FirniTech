import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { TenantShell } from "@/components/tenant-shell";
import { CatalogView } from "@/components/catalog-view";
import { ProductDetailView } from "@/components/product-detail-view";
import { CheckoutView } from "@/components/checkout-view";
import { resolveTenantForRequest } from "@/lib/tenants";
import { readCart } from "@/lib/cart";
import { resolveStorefrontRoute } from "@/lib/storefront-routes";

/**
 * Storefront publik per-tenant (ROADMAP Sprint 5).
 *
 * TEMPAT DI SINI SEMUA RESOLUSI TENANT, karena hanya `page` yang menerima
 * `params` pada catch-all ([[...slug]]) — layout-nya selalu dapat
 * `params = undefined`. Itu sebabnya `TenantShell` hanya menerima
 * `basePath` dan tidak menerima params sama sekali.
 *
 * URL storefront:
 *   /t/<slug>                        beranda + katalog singkat
 *   /t/<slug>/produk                 katalog penuh, filter kategori
 *   /t/<slug>/produk/<productSlug>   detail produk
 *
 * Bedanya bukan `app/t/[...path]/produk/[slug]`: Next.js tidak
 * mengizinkan segmen dinamis di bawah catch-all. Sisa segmen diurai di
 * src/lib/storefront-routes.ts.
 */
export default async function TenantStorefront({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { slug } = await params;
  const { kategori } = await searchParams;
  const h = await headers();
  const tenant = await resolveTenantForRequest(h, slug);

  // Tenant tidak dikenal / belum bayar → 404, bukan 500. `getTenantBySlug`
  // sudah memfilter `isActive`, jadi tenant yang menunggak pembayaran tidak
  // punya toko publik sama sekali.
  if (!tenant) notFound();

  // Dalam mode host-based, segmen pertama adalah path storefront, bukan slug
  // tenant — slug sudah datang dari header proxy.
  const rest = h.get("x-tenant-slug") ? slug : slug?.slice(1);
  const basePath = `/t/${tenant.slug}`;
  const route = resolveStorefrontRoute(rest, kategori);

  // Kategori diambil dari nilai yang benar-benar ada, supaya tidak ada filter
  // yang mengarah ke katalog kosong.
  const categoryRows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.tenantId, tenant.id), eq(products.isPublished, true)))
    .orderBy(products.category);
  const categories = categoryRows.map((row) => row.category);

  /*
   * Keranjang dibaca per-request dari cookie, bukan di-cache. `cookies()` di
   * Next membuat halaman ini dinamis, dan memang harus begitu: angka barang di
   * header yang berasal dari cache akan tampil benar untuk pembeli berikutnya
   * yang punya cookie berbeda.
   */
  const cart = await readCart();
  const cartCount = cart.lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <TenantShell
      name={tenant.name}
      plan={tenant.plan}
      basePath={basePath}
      categories={categories}
      cartCount={cartCount}
    >
      {route.kind === "notFound" ? notFound() : null}

      {route.kind === "home" ? (
        <main id="konten-utama" className="mx-auto w-full max-w-5xl px-4 py-8">
          <h1 className="text-headline-lg text-foreground text-balance">
            Mebel untuk rumah Anda
          </h1>
          <p className="mt-2 max-w-prose text-body-lg text-muted-foreground">
            Katalog mebel {tenant.name}. Harga sudah termasuk bahan pilihan;
            ongkir kargo dihitung saat checkout.
          </p>
          <div className="mt-8">
            <CatalogView tenantId={tenant.id} category="all" basePath={basePath} />
          </div>
        </main>
      ) : null}

      {route.kind === "catalog" ? (
        <main id="konten-utama" className="mx-auto w-full max-w-5xl px-4 py-8">
          <h1 className="text-headline-md text-foreground">Katalog</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            {route.category === "all"
              ? "Semua produk yang tersedia."
              : `Kategori ${route.category}.`}
          </p>
          <div className="mt-6">
            <CatalogView
              tenantId={tenant.id}
              category={route.category}
              basePath={basePath}
            />
          </div>
        </main>
      ) : null}

      {route.kind === "product" ? (
        <ProductDetailView
          tenantId={tenant.id}
          productSlug={route.productSlug}
          basePath={basePath}
        />
      ) : null}

      {route.kind === "checkout" ? (
        <CheckoutView
          tenantSlug={tenant.slug}
          tenantId={tenant.id}
          basePath={basePath}
        />
      ) : null}
    </TenantShell>
  );
}
