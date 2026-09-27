import { redirect } from "next/navigation";
import Link from "next/link";

import { RegisterForm } from "@/components/register-form";
import { getSession } from "@/lib/auth/session";
import { PLANS, type PlanId } from "@/lib/plans";
import { isMidtransConfigured } from "@/lib/midtrans/snap";
import { formatRupiah } from "@/lib/format";

export const metadata = { title: "Daftar — FurniTech" };

/**
 * Halaman pendaftaran owner.
 *
 * Split layout, sama seperti /login: panel kiri berisi harga paket, panel
 * kanan berisi wizard. Alasannya sama — di 1440px satu kolom di tengah
 * menyisakan ruang kosong besar yang tidak memberi apa pun. Di mobile
 * urutannya dibalik: form dulu, branding disembunyikan.
 *
 * `isMidtransConfigured()` dibaca di sini supaya statusnya diketahui lebih
 * awal dan jujur sejak halaman dibuka. Halaman ini tetap bisa dibuka dan form
 * tetap bisa diisi saat Midtrans belum dikonfigurasi — yang terjadi saat itu
 * adalah penolakan di server saat tombol ditekan, dengan pesan yang tidak
 * menyebut nama variabel lingkungan (lihat provision.ts).
 */
export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main
      id="konten-utama"
      className="grid min-h-[100dvh] lg:grid-cols-[1fr_minmax(0,30rem)]"
    >
      {/* ---------- Panel kiri: paket ---------- */}
      <aside className="hidden flex-col bg-foreground p-10 lg:flex">
        <p className="flex items-center gap-2 text-title-md text-background">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl bg-primary text-label-sm font-semibold text-primary-foreground"
          >
            F
          </span>
          FurniTech
        </p>

        <div className="mt-12">
          <h1 className="max-w-md text-headline-lg text-background text-balance">
            Satu sistem untuk toko, produksi, dan pembayaran
          </h1>
          <p className="mt-3 max-w-md text-body-lg text-foreground-inverse-muted text-pretty">
            Tidak ada free trial. Pilih paket, buat akun, dan tokonya langsung
            bisa diakses.
          </p>
        </div>

        {/* Harga dari PLANS, bukan diketik. */}
        <ul className="mt-14 flex flex-col gap-4">
          {(Object.keys(PLANS) as PlanId[]).map((id) => (
            <li
              key={id}
              className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 last:border-0"
            >
              <span className="text-title-md text-background">
                {PLANS[id].label}
              </span>
              <span className="text-code-tabular text-foreground-inverse-muted">
                {formatRupiah(PLANS[id].priceMonthly)}/bulan
                <span className="ml-2 text-body-sm text-muted-foreground">
                  {formatRupiah(PLANS[id].priceYearly)}/tahun
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-auto pt-10 text-body-sm text-foreground-inverse-muted">
          Pendaftaran berhenti sebelum menulis apa pun ke sistem kalau
          pembayaran belum siap, supaya tidak ada akun menggantung.
        </p>
      </aside>

      {/* ---------- Panel kanan: wizard ---------- */}
      <section className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <p className="mb-8 flex items-center gap-2 lg:hidden">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-xl bg-primary text-label-sm font-semibold text-primary-foreground"
            >
              F
            </span>
            <span className="text-title-md text-foreground">FurniTech</span>
          </p>

          <h2 className="text-headline-md text-foreground">Buat akun</h2>
          <p className="mt-1.5 text-body-md text-muted-foreground">
            Empat langkah, sekitar dua menit.
          </p>

          {!isMidtransConfigured() ? (
            <p className="mt-4 rounded-xl border border-border bg-muted px-3 py-2 text-body-sm text-muted-foreground">
              Pendaftaran belum dibuka untuk umum. Anda masih bisa mengisi form
              di bawah, tetapi akun tidak akan dibuat sampai pembayaran siap.
            </p>
          ) : null}

          <div className="mt-8">
            <RegisterForm />
          </div>

          <Link
            href="/login"
            className="mt-8 flex min-h-11 items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <span aria-hidden>&larr;</span>
            Sudah punya akun? Masuk
          </Link>
        </div>
      </section>
    </main>
  );
}
