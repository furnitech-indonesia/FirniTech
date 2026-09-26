import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BankIcon,
  StorefrontIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";

import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/permissions";
import { PLANS } from "@/lib/plans";
import { formatRupiah } from "@/lib/format";

export const metadata = { title: "Masuk — FurniTech" };

/**
 * Halaman masuk, split layout.
 *
 * Kenapa split dan bukan satu kolom di tengah: di 1440px satu kolom menyisakan
 * ruang kosong besar di kedua sisi tanpa memberi apa pun. Panel kiri memakai
 * ruang itu untuk hal yang tidak muat di bawah form — paket dan apa saja yang
 * termasuk. Isinya dibaca dari `PLANS`, jadi tidak ada angka yang bisa
 * melenceng dari sumbernya.
 *
 * DI MOBILE URUTANNYA DIBALIK: form muncul lebih dulu, panel branding
 * disembunyikan. Form adalah tugas, branding adalah hiasan; mobile adalah
 * perangkat yang dipakai sambil berdiri di bengkel.
 *
 * `min-h-[100dvh]` dan bukan `h-screen` (taste-skill §3.E): iOS Safari
 * address bar shrunk viewport, `h-screen` membuat halaman melompat.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Sudah punya session → jangan tampilkan form lagi.
  const session = await getSession();
  if (session) {
    redirect(homeForRole(session.role));
  }

  const { next } = await searchParams;

  return (
    <main
      id="konten-utama"
      className="grid min-h-[100dvh] lg:grid-cols-[1fr_minmax(0,26rem)]"
    >
      {/* ---------- Panel kiri: branding + yang termasuk ---------- */}
      <aside className="hidden flex-col bg-foreground p-10 lg:flex">
        <div>
          <p className="flex items-center gap-2 text-title-md text-background">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-xl bg-primary text-label-sm font-semibold text-primary-foreground"
            >
              F
            </span>
            FurniTech
          </p>

          <h1 className="mt-12 max-w-md text-headline-lg text-background text-balance">
            Kembali ke toko, produksi, dan pembayaran Anda
          </h1>
          <p className="mt-3 max-w-md text-body-lg text-foreground-inverse-muted text-pretty">
            Satu akun untuk katalog, antrean produksi di bengkel, dan pencairan
            dana.
          </p>
        </div>

        {/*
         * Jarak antar blok di sini tetap, bukan `justify-between`. Dengan
         * tiga anak, justify-between membagi tinggi panel menjadi tiga bagian
         * sama besar, sehingga jarak headline ke daftar ikut memanjang
         * mengikuti tinggi viewport — di monitor 27" lubangnya jadi setengah
         * layar. Konten dikelompokkan di atas, harga didorong ke bawah dengan
         * mt-auto.
         */}
        <ul className="mt-14 flex flex-col gap-5">
          {[
            {
              icon: StorefrontIcon,
              title: "Katalog & toko online",
              body: "Produk, variasi, dan pemesanan masuk dari satu tempat.",
            },
            {
              icon: WrenchIcon,
              title: "Produksi & inventaris",
              body: "Antrean tukang, foto progres, dan stok bahan baku.",
            },
            {
              icon: BankIcon,
              title: "Keuangan & payout",
              body: "DP, pelunasan, dan pencairan pukul 06.00 serta 18.00 WIB.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon
                size={20}
                weight="light"
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden
              />
              <div>
                <p className="text-title-md text-background">{title}</p>
                <p className="mt-0.5 text-body-sm text-foreground-inverse-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Harga dibaca dari PLANS dan diformat dengan formatRupiah yang
            sama dengan landing page, supaya dua halaman tidak bisa berbeda
            bentuk. */}
        <p className="mt-auto pt-10 text-body-sm text-foreground-inverse-muted">
          {(["basic", "pro", "max"] as const).map((id, i) => (
            <span key={id}>
              {i > 0 ? " · " : null}
              {PLANS[id].label} {formatRupiah(PLANS[id].priceMonthly)}/bulan
            </span>
          ))}
        </p>
      </aside>

      {/* ---------- Panel kanan: form ---------- */}
      <section className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          {/* Di mobile panel kiri tidak tampil, jadi brand harus muncul di
              sini — kalau tidak, pengguna tidak tahu sedang di mana. */}
          <p className="mb-8 flex items-center gap-2 lg:hidden">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-xl bg-primary text-label-sm font-semibold text-primary-foreground"
            >
              F
            </span>
            <span className="text-title-md text-foreground">FurniTech</span>
          </p>

          {/* "Masuk" saja terlalu singkat untuk judul halaman mandiri —
              panel kiri sudah menyebut FurniTech, tapi di mobile panel itu
              tidak tampil. */}
          <h2 className="text-headline-md text-foreground">
            Masuk ke FurniTech
          </h2>
          <p className="mt-1.5 text-body-md text-muted-foreground">
            Akun pengrajin, staf produksi, atau super admin platform.
          </p>

          <div className="mt-8">
            <LoginForm nextPath={next} />
          </div>

          <Link
            href="/"
            className="mt-8 flex min-h-11 items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <span aria-hidden>&larr;</span>
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
