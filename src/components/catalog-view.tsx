import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { RulerIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { products } from "@/db/schema";
import { formatRupiah, formatNumber } from "@/lib/format";
import { createSignedUrls } from "@/lib/storage";

/**
 * Katalog produk publik (ROADMAP Sprint 5).
 *
 * Hanya `isPublished = true` yang boleh tampil. Tanpa filter itu, produk yang
 * baru disimpan tapi belum siap turbines akan bocor ke pembeli — dan karena
 * halaman ini publik tanpa login, "bocor" berarti tidak bisa ditarik
 * kembali.
 *
 * Filter kategori diambil dari NILAI YANG BENAR-BENARNY ADA di katalog
 * tenant ini, bukan dari daftar tetap di kode. Daftar tetap membuat
 * kategori kosong yang terlihat seperti filter yang gagal.
 */
export async function CatalogView({
  tenantId,
  category,
  basePath,
}: {
  tenantId: string;
  /** `"all"` = tanpa filter. */
  category: string | "all";
  basePath: string;
}) {
  /*
   * Filter kategori memakai `lower()` di kedua sisi supaya `?kategori=meja`
   * dan `?kategori=Meja` menghasilkan hasil yang sama. Perbandingan mentah
   * membuat tautan yang diketik manusia salahDiam-diam mengembalikan katalog
   * kosong.
   *
   * `isPublished` ditambahkan di dalam query, bukan sesudahnya. Menyaring
   * di memori tetap benar tapi menarik semua produk tenant ke memori dulu —
   * dan tidak perlu kalau tidak akan ditampilkan.
   */
  const filters = [eq(products.tenantId, tenantId), eq(products.isPublished, true)];
  if (category !== "all") {
    filters.push(sql`lower(${products.category}) = lower(${category})`);
  }

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      category: products.category,
      basePrice: products.basePrice,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      woodType: products.woodType,
      finishingType: products.finishingType,
      images: products.images,
    })
    .from(products)
    .where(and(...filters))
    .orderBy(desc(products.createdAt));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-body-md text-muted-foreground">
          {category === "all"
            ? "Katalog masih kosong."
            : `Tidak ada produk di kategori ${category}.`}
        </p>
        {category !== "all" ? (
          <Link
            href={`${basePath}/produk`}
            className="mt-4 inline-flex min-h-11 items-center text-body-sm text-primary hover:underline"
          >
            Lihat semua produk
          </Link>
        ) : null}
      </div>
    );
  }

  /*
   * Signed URL dibuat sekaligus: satu panggilan per foto jauh lebih lambat,
   * dan API Storage-nya dibatasi, jadi untuk 20 produk kita jangan melakukan
   * 40 permintaan.
   */  // Object path yang sama bisa muncul di beberapa produk (foto dipakai ulang),
  // jadi dikumpulkan dulu supaya tidak meminta signed URL berkali-kali.
  const uniqueImages = [...new Set(rows.flatMap((r) => r.images ?? []))];
  const signed = await createSignedUrls(uniqueImages);

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rows.map((product) => (
        <li key={product.id}>
          <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <ProductImage
              path={product.images?.[0]}
              signedUrl={product.images?.[0] ? signed[product.images[0]] : undefined}
              alt={product.name}
            />

            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-label-sm uppercase text-muted-foreground">
                {product.category}
              </p>
              <h2 className="text-title-md text-foreground">{product.name}</h2>
              <p className="flex items-center gap-1 text-body-sm text-muted-foreground">
                <RulerIcon size={14} weight="light" aria-hidden />
                <span className="text-code-tabular">
                  {formatNumber(product.lengthCm)} × {formatNumber(product.widthCm)} ×{" "}
                  {formatNumber(product.heightCm)} cm
                </span>
              </p>
              <p className="text-body-sm text-muted-foreground">
                {product.woodType} · {product.finishingType}
              </p>

              <p className="mt-auto pt-2 text-code-tabular text-title-md text-foreground">
                {formatRupiah(product.basePrice)}
              </p>

              <Link
                href={`${basePath}/produk/${product.slug}`}
                className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Lihat detail
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/**
 * Foto produk.
 *
 * Bucket-nya privat, jadi `src` berisi object path dan harus diganti signed
 * URL dulu (lihat src/lib/storage.ts). Menempelkan path mentah ke `src`
 * menghasilkan gambar rusak yang tidak terlihat di server HTML — bug yang
 * baru ketahuan saat hydration di browser.
 *
 * Rasio tetap 4:3 supaya gambar tidak menggeser tata letak saat dimuat
 * (PRD §3.1).
 */
export function ProductImage({
  path,
  signedUrl,
  alt,
  className,
}: {
  path?: string;
  signedUrl?: string;
  alt: string;
  className?: string;
}) {
  if (!signedUrl) {
    return (
      <div
        className={`grid aspect-[4/3] place-items-center bg-muted text-body-sm text-muted-foreground ${
          className ?? ""
        }`}
      >
        Tanpa foto
      </div>
    );
  }

  void path;

  /*
   * `<img>` bukan `next/image` dengan sengaja. `next/image` akan mengirim
   * gambar privat melewati optimizer Vercel, yang tidak boleh menyentuh
   * bucket privat dan tidak punya kredensial Supabase. Signed URL yang sudah
   * dibuat di server inilah yang disalin ke markup.
   */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={signedUrl}
      alt={alt}
      loading="lazy"
      className={`aspect-[4/3] w-full object-cover ${className ?? ""}`}
    />
  );
}
