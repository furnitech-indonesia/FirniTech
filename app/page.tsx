import Link from "next/link";
import {
  ArrowRightIcon,
  BankIcon,
  CameraIcon,
  CubeIcon,
  GlobeIcon,
  PackageIcon,
  RulerIcon,
  StorefrontIcon,
  TruckIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";

import { HeroCockpit } from "@/components/hero-cockpit";
import { PricingTable } from "@/components/pricing-table";
import { SiteHeader } from "@/components/site-header";
import { PLATFORM_FEE_RATE } from "@/lib/plans";

/**
 * Halaman publik FurniTech.
 *
 * Aturan isi halaman ini (ROADMAP Sprint 10, Fase B):
 *   TIDAK ADA angka, nama orang, testimoni, atau promo yang tidak ada
 *   datanya di repo. Halaman publik yang menampilkan angka tidak berdasar
 *   adalah kebohongan yang bisa jadi masalah hukum, dan belum ada pelanggan
 *   sungguhan yang bisa disebut.
 *
 * Yang tampil di sini dibaca dari sumber data nyata:
 *   - Harga, batas paket, dan diskon -> PLANS di src/lib/plans.ts
 *   - Biaya platform                  -> PLATFORM_FEE_RATE (1.5%)
 *   - Fitur                           -> PRD.md
 * Yang TIDAK tampil: statistik pelanggan, testimoni, promo, dan free trial.
 *
 * Struktur mengikuti desain Stitch, kecuali blok yang isinya tidak berdasar
 * (statistik 148+ workshop, testimonial fiktif, promo "Jestera 2025") dan
 * blok yang janannya belum ditepati (free trial 14 hari — PRD §2 menolaknya).
 */

/* --- Konten statis, ditulis di sini agar mudah diaudit --------------- */

const PILLARS = [
  {
    icon: TruckIcon,
    title: "Ongkir kargo otomatis per kota",
    body: "Tarif dihitung dari kota tujuan dan berat volumetrik, lalu ditambahkan ke total sebelum pembeli menekan tombol bayar. Tidak ada ongkir yang terlewat saat checkout.",
  },
  {
    icon: CameraIcon,
    title: "Tracker progres lewat WhatsApp",
    body: "Tukang mengunggah foto dari HP di bengkel pada tiap tahap. Pembeli menerima pembaruan tanpa perlu ditanya, dan progres tersimpan sebagai riwayat pesanan.",
  },
  {
    icon: BankIcon,
    title: "Pencairan terjadwal dua kali sehari",
    body: "Dana ditahan sampai pesanan selesai, lalu dicairkan pukul 06.00 dan 18.00 WIB. Biaya platform dan MDR Midtrans dipotong lebih dulu, jadi jumlah yang diterima bisa dihitung sendiri sejak awal.",
  },
] as const;

const FAQ = [
  {
    q: "Apakah saya perlu keahlian teknis untuk membuat toko?",
    a: "Tidak. Anda mengunggah foto produk, mengisi dimensi panjang-lebar-tinggi, dan menetapkan harga. Katalog langsung bisa dibagikan lewat WhatsApp.",
  },
  {
    q: "Bagaimana cara kerja kalkulator ongkir kargo?",
    a: "Alamat pengiriman disimpan sekali per nomor telepon, jadi pembeli tidak mengetik ulang di pesanan berikutnya. Tarif mengikuti kota tujuan dan berat volumetrik, dan ditambahkan ke total sebelum pembayaran.",
  },
  {
    q: "Kapan dana pembayaran pembeli masuk ke rekening saya?",
    a: "Setelah pesanan selesai, dana dicairkan pada slot pukul 06.00 atau 18.00 WIB. Biaya platform 1,5% dan biaya MDR Midtrans dipotong lebih dulu dari nominal pencairan.",
  },
  {
    q: "Apakah bisa memakai domain sendiri?",
    a: "Bisa. Domain seperti mebeljaya.com dipasang lewat menu Pengaturan dan diverifikasi lewat CNAME. Sertifikat SSL diperpanjang otomatis setelah domain terverifikasi.",
  },
  {
    q: "Apakah pembeli perlu memasang aplikasi untuk memantau progres?",
    a: "Tidak ada yang perlu dipasang. Pemantau progres adalah halaman web yang dibuka dari tautan WhatsApp, jadi pembeli cukup membuka browser.",
  },
  {
    q: "Berapa lama langganan berlaku?",
    a: "Satu bulan sejak pembayaran berhasil, atau satu tahun kalau memilih pembayaran tahunan. Perpanjangan otomatis bisa diaktifkan supaya langganan tidak terputus.",
  },
] as const;

/* --- Komponen kecil --------------------------------------------------- */

function Container({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-label-sm uppercase text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-headline-md text-foreground text-balance">
        {title}
      </h2>
      {body ? (
        <p className="mt-3 text-body-lg text-muted-foreground text-pretty">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Blok split: teks di satu sisi, visual di sisi lain. Dipakai untuk
 * Custom Domain dan Order Kustom.
 *
 * `flip` menukar urutan kolom di desktop. Di mobile visual selalu muncul
 * SESUDAH teks — di layar 375px pembaca lebih butuh tahu apa yang sedang
 * dibaca sebelum melihat gambar besar.
 */
function SplitSection({
  id,
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flip = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: readonly string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section id={id} className="border-b border-border bg-card">
      <Container className="py-14 sm:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className={flip ? "lg:order-2" : undefined}>
            <SectionHeading eyebrow={eyebrow} title={title} body={body} />
            <ul className="mt-6 flex flex-col gap-3">
              {bullets.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-body-md">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span className="text-secondary">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={flip ? "lg:order-1" : undefined}>{visual}</div>
        </div>
      </Container>
    </section>
  );
}

/* --- Visual untuk blok split ------------------------------------------ */

/**
 * Visual domain. Sengaja bukan `<img>`: DESIGN.md §5 memberi alasan teknis
 * memilih Phosphor (offline, PWA, native), dan menarik screenshot dari CDN
 * justru membatalkan alasan itu.
 */
function DomainVisual() {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-card">
      <p className="mb-3 flex items-center gap-2 text-title-md text-foreground">
        <GlobeIcon
          size={20}
          weight="light"
          className="text-primary"
          aria-hidden
        />
        Pengaturan domain
      </p>

      <div className="flex flex-col gap-2">
        {[
          { step: "1", label: "Masukkan domain", value: "mebeljaya.com" },
          { step: "2", label: "Arahkan CNAME", value: "app.furnitech.id" },
          { step: "3", label: "Verifikasi", value: "Tertaut • SSL aktif" },
        ].map((row, index) => (
          <div
            key={row.step}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-label-sm text-secondary">
              {row.step}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-label-sm text-muted-foreground">
                {row.label}
              </span>
              <span className="block truncate text-body-md text-foreground">
                {row.value}
              </span>
            </span>
            {index < 2 ? null : (
              <span className="shrink-0 rounded-full bg-status-settled-bg px-2 py-0.5 text-label-sm text-status-settled">
                Aktif
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visual SPK: potongan isi surat pesanan kustom. */
function SpkVisual() {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-card">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <span className="text-title-md text-foreground">SPK-2026-089</span>
          <span className="rounded-full bg-status-production-bg px-2 py-0.5 text-label-sm text-status-production">
            Diproses
          </span>
        </div>

        <dl className="mt-3 flex flex-col gap-2.5 text-body-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Jenis kayu</dt>
            <dd className="text-secondary">Jati solid</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Dimensi (P×L×T)</dt>
            <dd className="text-code-tabular text-secondary">220×100×76 cm</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Finishing</dt>
            <dd className="text-secondary">Natural oil</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Jumlah</dt>
            <dd className="text-code-tabular text-secondary">1 set</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-body-sm text-muted-foreground">Total</span>
          <span className="text-title-md text-foreground">Rp 18.500.000</span>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-body-sm text-muted-foreground">
        <RulerIcon size={16} weight="light" aria-hidden />
        Hitungan DP dan pelunasan muncul otomatis
      </p>
    </div>
  );
}

/* --- Halaman ---------------------------------------------------------- */

export default function Home() {
  return (
    <>
      {/*
       * Header hanya di halaman ini, bukan di root layout. Back-office punya
       * navigasinya sendiri (dashboard-nav), dan halaman login tidak boleh
       * memakai header marketing — navigasi akan memakan ruang vertikal yang
       * dibutuhkan form.
       */}
      <SiteHeader />

      <main id="konten-utama" className="flex-grow">
        {/* ---------- Hero ---------- */}
        <section className="border-b border-border">
          <Container className="pb-14 pt-12 sm:pb-20 sm:pt-16">
            <div className="max-w-2xl">
              <p className="text-label-sm uppercase text-primary">
                Untuk pengrajin &amp; toko mebel
              </p>
              <h1 className="mt-3 text-headline-md text-foreground text-balance sm:text-headline-lg">
                Satu sistem untuk menjalankan{" "}
                <span className="text-primary">
                  toko, produksi, dan pembayaran
                </span>
              </h1>
              <p className="mt-4 text-body-lg text-muted-foreground text-pretty">
                Katalog online, catatan produksi di bengkel, inventaris bahan, dan
                pencairan pembayaran dalam satu tempat. Tanpa berpindah antara
                spreadsheet, pesan WhatsApp, dan rekening terpisah.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {/* CTA utama. Tombol versi sebelumnya `type="button"` tanpa
                    handler, sehingga tidak melakukan apa pun. */}
                <Link
                  href="/login"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Mulai Sekarang
                  <ArrowRightIcon size={18} weight="light" aria-hidden />
                </Link>
                <Link
                  href="/t/mebeljaya"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-label-lg text-secondary transition-colors hover:bg-muted"
                >
                  <StorefrontIcon size={18} weight="light" aria-hidden />
                  Lihat Contoh Toko
                </Link>
              </div>

              <p className="mt-4 text-body-sm text-muted-foreground">
                Tanpa free trial. Langganan dibayar saat pendaftaran, dan paket
                bisa diganti kapan saja.
              </p>
            </div>

            <HeroCockpit />
          </Container>
        </section>

        {/* ---------- Tiga pilar ---------- */}
        <section id="fitur" className="border-b border-border">
          <Container className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="Tiga pilar"
              title="Tiga yang paling sering jadi pekerjaan terpisah"
              body="Menjual, memproduksi, dan menerima pembayaran biasanya dikerjakan di tiga aplikasi berbeda. Di sini satu alur."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <Icon
                    size={24}
                    weight="light"
                    className="text-primary"
                    aria-hidden
                  />
                  <h3 className="mt-3 text-title-md text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-body-md text-muted-foreground text-pretty">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------- Custom domain ---------- */}
        <SplitSection
          id="domain"
          eyebrow="Storefront"
          title="Toko online dengan domain sendiri"
          body="Toko bisa memakai domain milik Anda sendiri, bukan subdomain bawaan. Verifikasi lewat CNAME, lalu sertifikat SSL aktif otomatis."
          bullets={[
            "Domain milik Anda sendiri, misalnya mebeljaya.com",
            "Sertifikat SSL diperpanjang otomatis",
            "Katalog tetap bisa diakses lewat subdomain selama domain diverifikasi",
          ]}
          visual={<DomainVisual />}
        />

        {/* ---------- Order kustom ---------- */}
        <SplitSection
          id="spk"
          eyebrow="Produksi"
          title="Pesanan kustom tanpa katalog"
          body="Pesanan di luar katalog — meja sesuai ukuran, rak custom, atau furnitur untuk proyek tertentu — tetap bisa dicatat lengkap dengan ukuran, jenis kayu, dan finishing."
          bullets={[
            "Dimensi P × L × T tercatat apa adanya untuk tukang",
            "Hitungan DP dan pelunasan muncul saat pesanan dibuat",
            "Status progressing tersimpan sebagai riwayat, bukan chat",
          ]}
          visual={<SpkVisual />}
          flip
        />

        {/* ---------- Harga ---------- */}
        <section id="harga" className="border-b border-border">
          <Container className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="Harga"
              title="Paket bulanan, tanpa free trial"
              body="Harga sudah termasuk pencairan dana dua kali sehari. Yang belum termasuk adalah biaya Midtrans, dipotong langsung dari pencairan."
            />

            <PricingTable />

            <p className="mt-6 text-body-sm text-muted-foreground">
              Semua paket termasuk biaya platform{" "}
              {(PLATFORM_FEE_RATE * 100).toLocaleString("id-ID")}% dari nilai
              transaksi, yang dipotong dari pencairan Anda — bukan biaya tambahan
              di atas harga paket.
            </p>
          </Container>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="border-b border-border bg-card">
          <Container className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="Pertanyaan"
              title="Yang biasanya ditanyakan"
            />

            <div className="mt-10 flex max-w-3xl flex-col divide-y divide-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-title-md text-foreground">
                    {item.q}
                    <span
                      aria-hidden
                      className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-body-md text-muted-foreground text-pretty">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------- CTA penutup ---------- */}
        <section className="bg-foreground">
          <Container className="py-14 sm:py-20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-headline-md text-background text-balance">
                  Siapkan toko, produksi, dan pembayaran dalam satu sistem
                </h2>
                <p className="mt-3 text-body-md text-foreground-inverse-muted text-pretty">
                  Daftar, pilih paket, dan mulai katalog. Pembatalan dilakukan
                  dari menu Pengaturan dan berlaku di akhir periode berjalan.
                </p>
              </div>
              <Link
                href="/login"
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Daftar Sekarang
                <ArrowRightIcon size={18} weight="light" aria-hidden />
              </Link>
            </div>
          </Container>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="border-t border-border bg-card">
          <Container className="py-10">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-title-md text-foreground">FurniTech</p>
                <p className="mt-2 max-w-xs text-body-sm text-muted-foreground">
                  Sistem operasional untuk pengrajin dan toko mebel: katalog,
                  produksi, inventaris, dan pembayaran.
                </p>
              </div>

              <nav className="flex flex-col gap-2" aria-label="Produk">
                <p className="text-label-sm uppercase text-muted-foreground">
                  Produk
                </p>
                <Link
                  href="/#fitur"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Fitur
                </Link>
                <Link
                  href="/#spk"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Pesanan kustom
                </Link>
                <Link
                  href="/#domain"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Custom domain
                </Link>
                <Link
                  href="/#harga"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Harga paket
                </Link>
              </nav>

              <nav className="flex flex-col gap-2" aria-label="Sumber daya">
                <p className="text-label-sm uppercase text-muted-foreground">
                  Sumber daya
                </p>
                <Link
                  href="/#faq"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Pertanyaan umum
                </Link>
                <Link
                  href="/t/mebeljaya"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Contoh toko
                </Link>
                <Link
                  href="/login"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  Masuk
                </Link>
              </nav>

              <div>
                <p className="text-label-sm uppercase text-muted-foreground">
                  Untuk pengrajin
                </p>
                <ul className="mt-2 flex flex-col gap-2 text-body-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CubeIcon size={16} weight="light" aria-hidden />
                    Katalog &amp; variasi
                  </li>
                  <li className="flex items-center gap-2">
                    <WrenchIcon size={16} weight="light" aria-hidden />
                    Produksi &amp; inventaris
                  </li>
                  <li className="flex items-center gap-2">
                    <BankIcon size={16} weight="light" aria-hidden />
                    Keuangan &amp; payout
                  </li>
                  <li className="flex items-center gap-2">
                    <PackageIcon size={16} weight="light" aria-hidden />
                    Pengiriman
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-10 border-t border-border pt-6 text-body-sm text-muted-foreground">
              © {new Date().getFullYear()} FurniTech. Seluruh hak cipta
              dilindungi.
            </p>
          </Container>
        </footer>
      </main>
    </>
  );
}
