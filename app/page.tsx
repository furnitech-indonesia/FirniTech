import Link from "next/link";
import {
  ArrowRightIcon,
  BankIcon,
  CameraIcon,
  CheckCircleIcon,
  CubeIcon,
  GlobeIcon,
  StorefrontIcon,
  TruckIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";

import { PLANS, PLATFORM_FEE_RATE } from "@/lib/plans";
import { formatRupiah } from "@/lib/format";

/**
 * Halaman publik FurniTech.
 *
 * Aturan isi halaman ini (ROADMAP Sprint 10, Fase B):
 *   TIDAK ADA angka, nama orang, testimoni, atau promo yang tidak ada
 *   datanya di repo. Halaman publik yang menampilkan angka tidak berdasar
 *   adalah kebohongan yang bisa jadi masalah hukum, dan tidak ada satu pun
 *   pelanggan sungguhan yang bisa disebut sampai ada yang membayar.
 *
 * Semua yang tampil di sini dibaca dari sumber data nyata:
 *   - Harga & batas paket  -> PLANS di src/lib/plans.ts
 *   - Biaya platform       -> PLATFORM_FEE_RATE (1.5%)
 *   - Fitur               -> PRD.md
 * Yang TIDAK tampil: statistik pelanggan, testimoni, dan promo apa pun.
 */

/* --- Konten statis, ditulis di sini agar mudah diaudit --------------- */

const PILLARS = [
  {
    icon: StorefrontIcon,
    title: "Katalog & toko online",
    body: "Katalog produk dengan variasi kayu, finishing, dan dimensi. Pembeli melihat foto, ukuran, dan harga tanpa perlu datang ke bengkel. Alamat pengiriman disimpan sekali, jadi checkout berikutnya tidak perlu mengetik dari nol.",
  },
  {
    icon: WrenchIcon,
    title: "Produksi & Inventaris",
    body: "Bahan baku tercatat sesuai satuan aslinya — mililiter untuk cat dan perekat, meter kubik untuk kayu. Stok bahan hanya berubah lewat penyesuaian yang tercatat, jadi selalu ada jejak siapa yang menambah dan mengapa. Notifikasi muncul saat stok menipis, bukan setelah order gagal.",
  },
  {
    icon: BankIcon,
    title: "Keuangan & Payout",
    body: "Pembeli membayar lewat Midtrans; dana ditahan sampai pesanan selesai. Biaya platform dan MDR Midtrans dipotong lebih dulu, lalu sisanya dicairkan ke rekening Anda dua kali sehari pada pukul 06.00 dan 18.00 WIB.",
  },
] as const;

const CAPABILITIES = [
  {
    icon: CubeIcon,
    title: "Pesanan Kustom (SPK Digital)",
    body: "Pesanan tanpa katalog pun bisa dicatat lengkap: ukuran P × L × T, jenis kayu, dan pilihan finishing. Hitungan DP dan pelunasan langsung muncul saat pesanan dibuat.",
  },
  {
    icon: CameraIcon,
    title: "Progress Produksi Berbasis Foto",
    body: "Tukang mengunggah foto dari HP di bengkel pada tiap tahap. Pembeli melihat timeline foto tanpa perlu pesan berulang, dan progres tersimpan sebagai riwayat pesanan.",
  },
  {
    icon: TruckIcon,
    title: "Ongkir Kargo per Kota",
    body: "Tarif dihitung dari kota tujuan dan berat volumetrik, lalu ditambahkan ke total sebelum pembeli menekan tombol bayar. Tidak ada ongkir yang terlewat saat checkout.",
  },
  {
    icon: GlobeIcon,
    title: "Custom Domain & SSL",
    body: "Toko bisa memakai domain sendiri, misalnya mebeljaya.com, dengan sertifikat SSL yang diperpanjang otomatis. Verifikasi domain memakai CNAME yang diberikan setelah langganan aktif.",
  },
] as const;

const FAQ = [
  {
    q: "Apakah saya perlu keahlian teknis untuk membuat toko?",
    a: "Tidak. Setelah paket aktif, Anda membuat katalog lewat menu Katalog, dan toko online langsung bisa diakses lewat tautan yang bisa dibagikan ke WhatsApp. Pengaturan domain sendiri bisa dilakukan kapan saja lewat menu Pengaturan.",
  },
  {
    q: "Kapan dana pembayaran pembeli masuk ke rekening saya?",
    a: "Dana pembeli ditahan sampai pesanan selesai, lalu dicairkan pada slot payout pukul 06.00 atau 18.00 WIB. Biaya platform 1,5% dan biaya MDR Midtrans dipotong lebih dulu dari nominal pencairan, jadi jumlah yang diterima selalu lebih kecil dari total tagihan pembeli — sudah termasuk dalam harga yang Anda tentukan.",
  },
  {
    q: "Apakah paket bisa diganti?",
    a: "Bisa. Paket dan masa langganan tampil di menu Pengaturan. Paket yang lebih tinggi bisa diambil kapan saja; sisa periode berjalan dihitung sebagai kredit ke periode berikutnya.",
  },
  {
    q: "Pembeli perlu memasang aplikasi untuk memantau progres?",
    a: "Tidak ada yang perlu dipasang. Pemantau progress adalah halaman web yang dibuka dari tautan yang dikirim lewat WhatsApp, sehingga pembeli cukup membuka browser.",
  },
  {
    q: "Berapa lama langganan saya berlaku?",
    a: "Satu bulan sejak pembayaran berhasil, dan bisa diperpanjang per bulan atau per tahun. Perpanjangan otomatis bisa diaktifkan supaya langganan tidak terputus.",
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
    <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`}>
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
        <p className="mt-3 text-body-lg text-muted-foreground text-pretty">{body}</p>
      ) : null}
    </div>
  );
}

/* --- Pricing ---------------------------------------------------------- */

/**
 * Satu kartu paket. `plans` di bawah adalah urutan presentasi, bukan urutan
 * nilai — nilai taken dari PLANS supaya harga di sini tidak mungkin melenceng
 * dari sumber tunggal.
 */
function PlanCard({
  plan,
  featured,
  detail,
}: {
  plan: (typeof PLANS)[keyof typeof PLANS];
  featured?: boolean;
  detail: readonly string[];
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-card p-6 ${
        featured
          ? "border-primary shadow-card-hover"
          : "border-border shadow-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-headline-sm text-foreground">{plan.label}</h3>
        {featured ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-label-sm text-accent-foreground">
            Paling dipilih
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-code-tabular text-foreground">
          {formatRupiah(plan.priceMonthly)}
        </span>
        <span className="text-body-sm text-muted-foreground">/bulan</span>
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {formatRupiah(plan.priceYearly)} per tahun
      </p>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {detail.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-body-md">
            <CheckCircleIcon
              size={18}
              weight="light"
              className="mt-0.5 shrink-0 text-status-settled"
              aria-hidden
            />
            <span className="text-secondary">{line}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/login"
        className={`mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-label-lg transition-colors ${
          featured
            ? "bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border border-border bg-card text-secondary hover:bg-muted"
        }`}
      >
        Pilih {plan.label}
        <ArrowRightIcon size={18} weight="light" aria-hidden />
      </Link>
    </div>
  );
}

const PLAN_DETAILS: Record<string, readonly string[]> = {
  basic: [
    "20 produk di katalog",
    "1 staf produksi selain owner",
    "100 pesan WhatsApp per bulan",
    "Laporan keuangan dasar",
    "Tanpa biaya setup",
  ],
  pro: [
    "100 produk di katalog",
    "5 staf produksi",
    "500 pesan WhatsApp per bulan",
    "Laporan laba-rugi",
    "Domain sendiri + SSL",
  ],
  max: [
    "Produk katalog tanpa batas",
    "Staf tanpa batas",
    "Pesan WhatsApp tanpa batas",
    "Laporan eksekutif",
    "Domain sendiri + SSL",
  ],
};

/* --- Halaman ---------------------------------------------------------- */

export default function Home() {
  return (
    <main id="konten-utama" className="flex-grow">
      {/* ---------- Hero ---------- */}
      <section className="border-b border-border bg-card">
        <Container className="pb-14 pt-12 sm:pb-20 sm:pt-16">
          <div className="max-w-2xl">
            <h1 className="text-headline-md text-foreground text-balance sm:text-headline-lg">
              Satu sistem untuk menjalankan{" "}
              <span className="text-primary">
                toko, produksi, dan pembayaran
              </span>
            </h1>
            <p className="mt-4 text-body-lg text-muted-foreground text-pretty">
              FurniTech menyatukan katalog online, catatan produksi di bengkel,
              dan pencairan pembayaran dalam satu tempat. Pengrajin tidak perlu
              berpindah antara catatan, pesan, dan rekening terpisah.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* CTA utama. Sebelumnya tombol di halaman ini tidak punya
                  handler apa pun sehingga tidak melakukan apa pun. */}
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
        </Container>
      </section>

      {/* ---------- Tiga pilar ---------- */}
      <section className="border-b border-border">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Tiga pilar"
            title="Dari bahan mentah sampai uang masuk"
            body="FurniTech dibangun untuk tiga pekerjaan yang biasanya terpisah: menjual, memproduksi, dan menerima pembayaran."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <Icon size={24} weight="light" className="text-primary" aria-hidden />
                <h3 className="mt-3 text-title-md text-foreground">{title}</h3>
                <p className="mt-2 text-body-md text-muted-foreground text-pretty">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Kemampuan ---------- */}
      <section className="border-b border-border bg-card">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Yang dikerjakan"
            title="Detail yang menentukan kerja di bengkel"
            body="Empat hal yang biasanya jadi pekerjaan terpisah, dan di sini jadi satu alur."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-border bg-background p-5"
              >
                <Icon
                  size={22}
                  weight="light"
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <h3 className="text-title-md text-foreground">{title}</h3>
                  <p className="mt-1.5 text-body-md text-muted-foreground text-pretty">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Harga ---------- */}
      <section id="harga" className="border-b border-border">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Harga"
            title="Paket bulanan, tanpa free trial"
            body="Harga sudah termasuk pencairan dana dua kali sehari. Yang belum termasuk adalah biaya Midtrans, dipotong langsung dari pencairan."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3 md:items-stretch">
            <PlanCard plan={PLANS.basic} detail={PLAN_DETAILS.basic} />
            <PlanCard
              plan={PLANS.pro}
              featured
              detail={PLAN_DETAILS.pro}
            />
            <PlanCard plan={PLANS.max} detail={PLAN_DETAILS.max} />
          </div>

          <p className="mt-6 text-body-sm text-muted-foreground">
            Semua paket termasuk biaya platform{" "}
            {(PLATFORM_FEE_RATE * 100).toLocaleString("id-ID")}% dari nilai
            transaksi, yang dipotong dari pencairan Anda — bukan biaya tambahan
            di atas harga paket.
          </p>
        </Container>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-b border-border bg-card">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Pertanyaan"
            title="Yang biasanya ditanyakan"
          />

          <div className="mt-10 flex max-w-3xl flex-col divide-y divide-border">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-md text-foreground">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-body-md text-muted-foreground text-pretty">
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
                Siapkan toko, produksi, dan pembayaran Anda dalam satu sistem
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
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-title-md text-foreground">FurniTech</p>
              <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
                Sistem operasional untuk pengrajin dan toko mebel. Katalog,
                produksi, inventaris, dan pembayaran dalam satu tempat.
              </p>
            </div>

            <nav className="flex flex-col gap-2" aria-label="Tautan footer">
              <Link
                href="/login"
                className="text-body-sm text-secondary hover:text-primary"
              >
                Masuk
              </Link>
              <Link
                href="/harga"
                className="text-body-sm text-secondary hover:text-primary"
              >
                Harga paket
              </Link>
              <Link
                href="/t/mebeljaya"
                className="text-body-sm text-secondary hover:text-primary"
              >
                Contoh toko
              </Link>
            </nav>
          </div>

          <p className="mt-8 border-t border-border pt-6 text-body-sm text-muted-foreground">
            © {new Date().getFullYear()} FurniTech. Seluruh hak cipta dilindungi.
          </p>
        </Container>
      </footer>
    </main>
  );
}
