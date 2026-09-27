import Link from "next/link";
import {
  CameraIcon,
  RulerIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/panels";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PROGRESS_STAGE_LABELS,
  type OrderStatus,
} from "@/lib/labels";
import { PROGRESS_STAGE_ORDER, type ProgressStage } from "@/lib/order-status";
import { formatNumber } from "@/lib/format";
import { buildWhatsAppLink, progressMessageFor } from "@/lib/wa-link";

/**
 * Antrean produksi untuk tukang (ROADMAP Sprint 4, "Carpenter Mobile
 * Interface").
 *
 * Kenapa halaman terpisah, dan bukan sekadar halaman pesanan yang diadaptasi
 * untuk tukang:
 *
 * 1. **Data yang ditampilkan berbeda.** Tukang tidak butuh total transaksi,
 *    saldo cair, maupun status pembayaran. Menampilkannya cuma menambah
 *    kebisingan di layar yang kecil, dan di layar kecil setiap baris yang
 *    tidak perlu adalah satu baris yang pushes informasi penting ke bawah.
 * 2. **Filtranya berbeda.** Tukang hanya melihat pesanannya sendiri. Halaman
 *    umum menampilkan seluruh pesanan tenant, jadi tukang bisa melihat pekerjaan
 *    orang lain — dan itu bukan haknya.
 * 3. **Aksi utamanya berbeda.** Owner butuh "catat pesanan"; tukang butuh
 *    "unggah foto" dalam satu ketukan, karena itulah yang dia lakukan seratus
 *    kali sehari di bengkel.
 *
 * Prinsip layout (PRD §3.1): tanpa lebar tetap, tanpa tabel yang digeser
 * horizontal, target sentuh `min-h-11`, dan readable di 375px. Dimensi
 * memakai angka tabular supaya mudah dibandingkan antar pesanan.
 */

export type CarpenterQueueItem = {
  id: string;
  orderCode: string;
  orderStatus: OrderStatus;
  customerName: string;
  /**
   * Nomor WhatsApp pembeli. Disimpan sudah ternormalisasi ke `628…` oleh
   * `loadCarpenterQueue`; `null` berarti nomornya tidak bisa dipakai untuk
   * tautan `wa.me` dan tombolnya tidak dirender sama sekali.
   */
  customerPhone: string | null;
  workshopName?: string | null;
  items: {
    productName: string;
    quantity: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    woodType?: string;
    finishingType?: string;
  }[];
  /** Tahap terakhir yang sudah diunggah, atau null kalau belum ada. */
  lastStage: ProgressStage | null;
};

export function CarpenterQueue({ items }: { items: CarpenterQueueItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState message="Belum ada pesanan yang ditugaskan ke Anda. Owner akan menugaskan pekerjaan di sini." />
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <QueueCard item={item} />
        </li>
      ))}
    </ul>
  );
}

function QueueCard({ item }: { item: CarpenterQueueItem }) {
  const reached = item.lastStage
    ? PROGRESS_STAGE_ORDER.indexOf(item.lastStage) + 1
    : 0;

  return (
    <article className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-code-tabular text-title-md text-foreground">
            {item.orderCode}
          </p>
          <p className="truncate text-body-sm text-muted-foreground">
            {item.customerName}
          </p>
        </div>
        <Badge variant={ORDER_STATUS_TONES[item.orderStatus] ?? "neutral"}>
          {ORDER_STATUS_LABELS[item.orderStatus]}
        </Badge>
      </header>

      {/*
       * Lima tahap produksi.
       *
       * Strip-nya `aria-hidden` dan teks di sebelahnya yang membawa artinya,
       * karena
       * lima label di dalam 375px hanya menghasilkan teks yang tidak terbaca.
       * Pembaca screen reader dapat Tahap: Finishing (3 dari 5).
       */}
      <div className="grid gap-1.5">
        <div className="flex items-center gap-1" aria-hidden>
          {PROGRESS_STAGE_ORDER.map((stage, index) => (
            <span
              key={stage}
              className={`h-1.5 flex-1 rounded-full ${
                index < reached ? "bg-status-settled" : "bg-border"
              }`}
            />
          ))}
        </div>
        <p className="text-body-sm text-muted-foreground">
          {item.lastStage
            ? `Tahap: ${PROGRESS_STAGE_LABELS[item.lastStage]} (${reached} dari 5)`
            : "Belum ada foto progres"}
        </p>
      </div>

      {/* Dimensi: yang paling penting di bengkel, jadi bukan detail kecil. */}
      <ul className="grid gap-2">
        {item.items.map((line, index) => (
          <li
            key={`${line.productName}-${index}`}
            className="grid gap-1 border-t border-border pt-2 first:border-0 first:pt-0"
          >
            <p className="text-body-md text-foreground">
              {line.quantity > 1 ? `${line.quantity}× ` : ""}
              {line.productName}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
              {hasDimensions(line) ? (
                <span className="flex items-center gap-1 text-code-tabular">
                  <RulerIcon size={14} weight="light" aria-hidden />
                  {formatDimensions(line)}
                </span>
              ) : null}
              {line.woodType ? <span>Bahan: {line.woodType}</span> : null}
              {line.finishingType ? (
                <span>Finishing: {line.finishingType}</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>

      {/*
       * Dua aksi, dan urutannya disengaja.
       *
       * "Unggah foto progres" ke FurniTech dulu, karena itulah yang membuat
       * foto tercatat di timeline pesanan dan bisa dilihat owner, Super Admin,
       * dan pembeli lewat halaman lacak. "Kirim lewat WhatsApp" adalah
       * pelengkap: dipakai tukang untuk mengirim fotonya ke pembeli.
       *
       * Keduanya memakai `min-h-11` (44px). Ini bukan decorasi — tombol yang
       * paling sering ditekan di bengkel tidak boleh jadi yang terkecil.
       */}
      <div className="grid gap-2">
        <Link
          href={`/dashboard/pesanan/${item.id}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <CameraIcon size={18} weight="light" aria-hidden />
          Unggah foto progres
        </Link>

        {item.customerPhone ? (
          <a
            href={buildWhatsAppLink({
              to: item.customerPhone,
              message: progressMessageFor({
                customerName: item.customerName,
                orderCode: item.orderCode,
                workshopName: item.workshopName,
              }),
            })!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-label-lg text-foreground transition-colors hover:bg-muted"
          >
            <WhatsappLogoIcon size={18} weight="fill" aria-hidden />
            Kirim lewat WhatsApp
          </a>
        ) : null}

        {/*
         * Labelnya jujur: aplikasi ini TIDAK mengirim fotonya. `wa.me` hanya
         * membuka percakapan dengan pesan yang sudah terisi; foto tetap
         * dipilih tukang sendiri di WhatsApp. Kalau tombolnya berbunyi "Kirim
         * foto", orang akan menekan sekali lalu mencari-cari kenapa fotonya
         * belum terkirim.
         */}
        {item.customerPhone ? (
          <p className="text-body-sm text-muted-foreground">
            WhatsApp terbuka dengan pesan pembuka. Pilih fotonya di sana.
          </p>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            Nomor WhatsApp pembeli tidak tersedia, jadi foto belum bisa dikirim
            dari sini.
          </p>
        )}
      </div>
    </article>
  );
}

function hasDimensions(item: CarpenterQueueItem["items"][number]): boolean {
  return (
    item.lengthCm !== undefined ||
    item.widthCm !== undefined ||
    item.heightCm !== undefined
  );
}

/**
 * Dimensi dalam sentimeter, dengan satuan hanya di akhir.
 *
 * "P 120 × L 60 × T 75 cm" — bukan "120cm x 60cm x 75cm". Menulis satuan di
 * setiap angka bikin baris jauh lebih lebar di 375px. Menulis satuan di
 * awal setiap dimensi juga menambah beberapa karakter yang harus dibaca orang
 * yang sedang memotong kayu; meletakkannya sekali di akhir jauh lebih cepat
 * dibaca.
 */
function formatDimensions(item: CarpenterQueueItem["items"][number]): string {
  const parts: string[] = [];
  if (item.lengthCm !== undefined) parts.push(`P ${formatNumber(item.lengthCm)}`);
  if (item.widthCm !== undefined) parts.push(`L ${formatNumber(item.widthCm)}`);
  if (item.heightCm !== undefined) parts.push(`T ${formatNumber(item.heightCm)}`);
  return `${parts.join(" × ")} cm`;
}
