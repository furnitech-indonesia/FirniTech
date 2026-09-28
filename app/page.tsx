import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
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

import { ProductPreview } from "@/components/product-preview";
import { PricingTable } from "@/components/pricing-table";
import { SiteHeader } from "@/components/site-header";
import { totalGatewayCostPerOrder } from "@/lib/fees";
import { formatRupiah } from "@/lib/format";

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
 *   - Biaya transaksi                 -> totalGatewayCostPerOrder()
 *   - Fitur                           -> PRD.md
 * Yang TIDAK tampil: statistik pelanggan, testimoni, promo, dan free trial.
 *
 * Struktur mengikuti desain Stitch, kecuali blok yang isinya tidak berdasar
 * (statistik 148+ workshop, testimonial fiktif, promo "Jestera 2025") dan
 * blok yang janannya belum ditepati (free trial 14 hari — PRD §2 menolaknya).
 */

/* --- Konten statis, ditulis di sini agar mudah diaudit --------------- */

/**
 * Pilar pertama punya `detail` tambahan karena menempati sel bento 2x2.
 * Tipe ditulis eksplisit karena `as const` membuat tiap anggota tuple punya
 * bentuk berbeda, sehingga `detail` tidak bisa di-destructure tanpa error
 * pada dua anggota yang tidak memilikinya.
 */
type Pillar = {
  icon: typeof TruckIcon;
  title: string;
  body: string;
  detail?: string;
};

const PILLARS: readonly Pillar[] = [
  {
    icon: TruckIcon,
    title: "Ongkir kargo otomatis per kota",
    body: "Tarif dihitung dari kota tujuan dan berat volumetrik, lalu ditambahkan ke total sebelum pembeli menekan tombol bayar. Tidak ada ongkir yang terlewat saat checkout.",
    // Pilar pertama menempati sel 2×2, jadi butuh isi lebih banyak. Satu
    // kalimat tambahan, bukan paragraf kedua — selnya besar, bukan halaman.
    detail:
      "Alamat pengiriman disimpan sekali per nomor telepon, jadi pembeli tidak mengetik ulang di pesanan berikutnya.",
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <span className="flex items-center gap-2 text-title-md text-foreground">
            <RulerIcon
              size={18}
              weight="light"
              className="text-primary"
              aria-hidden
            />
            Surat Pesanan Kustom
          </span>
          <span className="rounded-full bg-status-production-bg px-2 py-0.5 text-label-sm text-status-production">
            Diproses
          </span>
        </div>

        {/*
         * Kolom di bawah sengaja TIDAK diisi nomor pesanan, nama kayu, atau
         * nominal. Formulir ini menggambarkan strukturnya — mengisinya dengan
         * "SPK-2026-089" dan "Rp 18.500.000" berarti memamerkan transaksi yang
         * tidak pernah terjadi, dan itu pemeranan yang sama yang sudah
         * dihapus dari pratinjau hero. Nilai placeholder ditandai dengan garis
         * putus-putus supaya jelas bukan data.
         */}
        <dl className="mt-4 flex flex-col gap-3 text-body-sm">
          {[
            { label: "Jenis kayu", placeholder: "dipilih pengrajin" },
            { label: "Dimensi (P×L×T)", placeholder: "dalam sentimeter" },
            { label: "Finishing", placeholder: "dari palet workshop" },
            { label: "Jumlah", placeholder: "bisa pecahan" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-2"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="truncate text-right text-muted-foreground">
                {row.placeholder}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-body-sm text-muted-foreground">
            DP, pelunasan, dan total
          </span>
          <span className="text-body-sm text-muted-foreground">
            dihitung otomatis
          </span>
        </div>
      </div>

      <p className="mt-3 text-body-sm text-muted-foreground">
        Nilai kolom diisi sendiri oleh pengrajin dan pembeli. Hitungan DP dan
        pelunasan muncul begitu pesanan disimpan.
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
                  href="/daftar"
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

            <ProductPreview />
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

            {/*
             * BENTO 1+2, bukan tiga kartu sama besar.
             *
             * Versi sebelumnya memakai tiga kolom sama besar dengan tinggi
             * sama. Itu pola yang paling sering keluar dari generator —
             * taste-skill §9.C menandainya sebagai tanda "AI", dan memang
             * benar: tiga kotak identik tidak memberi hierarki, mata tidak
             * tahu harus mulai dari mana.
             *
             * Pilar pertama memakai dua kolom DANdua baris, dua pilar
             * berikutnya mengisi sisanya. Hierarki terbentuk dari ukuran, bukan
             * dari ketebalan border.
             *
             * Sel pertama juga diberi latar amber (satu-satunya sel berwarna
             * di halaman ini), karena §4.7 mensyaratkan beberapa sel dalam grid
             * multi-sel punya variasi visual — kalau semua putih di atas
             * putih, hasilnya terbaca datar.
             */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body, detail }, index) => {
                const lead = index === 0;
                return (
                  <div
                    key={title}
                    className={`rounded-2xl border p-5 ${
                      lead
                        ? "border-accent bg-accent/40 shadow-card sm:col-span-2 lg:col-span-2 lg:row-span-2"
                        : "border-border bg-card shadow-card"
                    }`}
                  >
                    <Icon
                      size={lead ? 28 : 24}
                      weight="light"
                      className="text-primary"
                      aria-hidden
                    />
                    <h3
                      className={
                        lead
                          ? "mt-4 text-headline-sm text-foreground"
                          : "mt-3 text-title-md text-foreground"
                      }
                    >
                      {title}
                    </h3>
                    <p
                      className={
                        lead
                          ? "mt-3 max-w-md text-body-lg text-secondary text-pretty"
                          : "mt-2 text-body-md text-muted-foreground text-pretty"
                      }
                    >
                      {body}
                    </p>
                    {lead && detail ? (
                      <p className="mt-4 max-w-md border-t border-accent pt-4 text-body-md text-muted-foreground text-pretty">
                        {detail}
                      </p>
                    ) : null}
                  </div>
                );
              })}
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
              body="Pencairan dana berjalan otomatis setelah bukti barang diterima. Pengrajin tidak membayar biaya pencairan ke platform."
            />

            <PricingTable />

            <p className="mt-6 text-body-sm text-muted-foreground">
              Harga paket sudah termasuk semuanya — tidak ada biaya platform
              per transaksi lagi. Biaya payment gateway{" "}
              {formatRupiah(totalGatewayCostPerOrder())} per pesanan
              ditanggung pengrajin, dan kalkulator di halaman produk membantu
              menghitungnya supaya bisa disisipkan ke harga jual.
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
                href="/daftar"
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Mulai Sekarang
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
                <p className="flex items-center gap-2 text-title-md text-foreground">
                  <BrandMark className="size-7 rounded-lg" />
                  FurniTech
                </p>
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
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Fitur
                </Link>
                <Link
                  href="/#spk"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Pesanan kustom
                </Link>
                <Link
                  href="/#domain"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Custom domain
                </Link>
                <Link
                  href="/#harga"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
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
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Pertanyaan umum
                </Link>
                <Link
                  href="/t/mebeljaya"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Contoh toko
                </Link>
                <Link
                  href="/daftar"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
                >
                  Daftar workshop
                </Link>
                <Link
                  href="/login"
                  className="flex min-h-11 items-center text-body-sm text-secondary hover:text-primary"
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
