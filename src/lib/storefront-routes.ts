/**
 * Routing storefront per-tenant.
 *
 * Kenapa parser manual dan bukan folder terpisah: halaman storefront ada di
 * `app/t/[[...slug]]/page.tsx`, yaitu catch-all. Next.js tidak mengizinkan
 * segmen dinamis DI BAWAH catch-all, jadi `app/t/[[...slug]]/produk/[slug]`
 * tidak bisa dibuat. Satu-satunya cara yang tersedia adalah mengurai sisa
 * segmen di dalam page itu sendiri.
 *
 * Konsekuensinya, setiap path storefront harus ada di sini. Kalau lupa,
 * route-nya `notFound()` — bukan 404 diam-diam, dan bukan halaman kosong.
 */

export type StorefrontRoute =
  | { kind: "home" }
  /** `all` = katalog tanpa filter kategori. */
  | { kind: "catalog"; category: "all" | string }
  | { kind: "product"; productSlug: string }
  | { kind: "checkout" }
  | { kind: "notFound" };

/**
 * Terjemahkan sisa segmen URL jadi rute storefront.
 *
 * `segments` adalah `slug.slice(1)` — sudah dipotong segmen tenant, jadi
 * `[]` untuk beranda.
 *
 * Perbandingan `kategori` TIDAK case-sensitive dan mengabaikan spasi
 * berlebih, karena tautan filter datang dari URL yang bisa diketik manusia.
 * Bandingkan apa adanya membuat `?kategori=Meja` dan `?kategori=meja`
 * menghasilkan hasil berbeda, dan yang salah terasa seperti bug.
 */
export function resolveStorefrontRoute(
  segments: string[] | undefined,
  categoryParam?: string,
): StorefrontRoute {
  const parts = (segments ?? []).filter(Boolean);
  const [head, second] = parts;

  if (!head) {
    // Filter kategori hanya berlaku di katalog. Query string di beranda
    // diabaikan, bukan dianggap salah.
    return { kind: "home" };
  }

  if (head === "produk") {
    if (!second) {
      const category = categoryParam?.trim();
      return {
        kind: "catalog",
        category: category && category !== "all" ? category : "all",
      };
    }
    // Segmen ketiga ke bawah ditolak: `/produk/a/b` tidak punya arti, dan
    // merender apa saja di sana membuat URL rusak terlihat seperti halaman
    // yang benar.
    if (parts.length > 2) return { kind: "notFound" };
    return { kind: "product", productSlug: second };
  }

  if (head === "checkout" && parts.length === 1) {
    return { kind: "checkout" };
  }

  return { kind: "notFound" };
}
