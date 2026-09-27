import Link from "next/link";
import type { ReactNode } from "react";
import { StorefrontIcon, ShoppingCartIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Kerangka tampilan storefront per-tenant.
 *
 * Sengaja berupa komponen biasa (bukan bagian dari layout): `params` pada
 * layout HANYA berisi segmen dinamis di jalur layout itu sendiri. Untuk
 * `app/t/layout.tsx` itu berarti `params` selalu kosong — segmen
 * `[[...slug]]` ada di bawahnya. Resolusi tenant karena itu dilakukan di
 * page (yang memang menerima params), lalu hasilnya dioper ke sini.
 *
 * `basePath` adalah "/t/<slug>" dan dipakai untuk membangun tautan internal
 * storefront. Satu tautan lagi TIDAK memakainya: "Lacak" menuju /lacak di
 * level platform, karena pembeli sering tidak ingat nama toko tempat ia
 * memesan — dan halaman lacak tidak butuh tahu tokonya. Kenapa tidak `basePath` otomatis: page-nya sudah tahu slug-nya,
 * sedangkan komponen ini tidak menerima `params` sama sekali — meneruskannya
 * berarti setiap komponen di subtree ikut membawa params, yang tidak pernah
 * mereka butuhkan.
 */
export function TenantShell({
  name,
  plan,
  basePath,
  categories,
  cartCount = 0,
  children,
}: Readonly<{
  name: string;
  plan: string;
  basePath: string;
  /** Kategori yang benar-benar ada di katalog tenant ini. */
  categories: readonly string[];
  /**
   * Jumlah barang di keranjang pembeli. Dibaca server dari cookie, jadi
   * header ini tidak perlu JS untuk menampilkan jumlah yang benar.
   *
   * 0 berarti tautannya tidak dirender sama sekali — tombol keranjang yang
   * selalu ada tapi selalu kosong hanya menambah noise di header.
   */
  cartCount?: number;
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={basePath}
              className="flex min-h-11 items-center gap-2 truncate text-title-md text-foreground"
            >
              <StorefrontIcon
                size={22}
                weight="light"
                className="shrink-0 text-secondary"
                aria-hidden
              />
              <span className="truncate">{name}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {/*
                Angka keranjang dibaca server dari cookie, jadi jumlah di sini
                benar sejak render pertama. Menghitungnya di klien akan
                menampilkan 0 lalu melompat — flicker di header adalah hal
                yang paling terlihat di halaman yang paling sering dibuka.
              */}
              {cartCount > 0 ? (
                <Link
                  href={`${basePath}/checkout`}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-label-lg text-foreground transition-colors hover:bg-muted"
                >
                  <ShoppingCartIcon size={18} weight="light" aria-hidden />
                  <span className="text-code-tabular">{cartCount}</span>
                  <span className="sr-only">barang di keranjang</span>
                </Link>
              ) : null}
              <Link
                href="/lacak"
                className="flex min-h-11 items-center rounded-xl border border-border px-3 text-label-lg text-foreground transition-colors hover:bg-muted"
              >
                Lacak
              </Link>
              <Link
                href={`${basePath}/produk`}
                className="flex min-h-11 items-center rounded-xl border border-border px-3 text-label-lg text-foreground transition-colors hover:bg-muted"
              >
                Katalog
              </Link>
            </div>
          </div>

          {/*
            Filter kategori hanya dirender kalau memang ada lebih dari satu.
            Satu kategori berarti tautan ke "semua" itu satu-satunya pilihan
            dan tidakceded info apa pun.
          */}
          {categories.length > 1 ? (
            <nav aria-label="Kategori produk" className="-mx-4 mt-1 overflow-x-auto px-4">
              <ul className="flex w-max gap-2 pb-2">
                <li>
                  <Link
                    href={`${basePath}/produk`}
                    className="flex min-h-11 items-center rounded-full border border-border px-3 text-body-sm text-secondary transition-colors hover:bg-muted"
                  >
                    Semua
                  </Link>
                </li>
                {categories.map((category) => (
                  <li key={category}>
                    <Link
                      href={`${basePath}/produk?kategori=${encodeURIComponent(category)}`}
                      className="flex min-h-11 items-center rounded-full border border-border px-3 text-body-sm text-secondary transition-colors hover:bg-muted"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <span className="sr-only">Paket langganan: {plan}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
