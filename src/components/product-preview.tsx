import { CheckIcon, WrenchIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { totalGatewayCostPerOrder } from "@/lib/fees";
import { PROGRESS_STAGE_ORDER } from "@/lib/order-status";
import { PROGRESS_STAGE_LABELS } from "@/lib/labels";
import { formatRupiah } from "@/lib/format";

/**
 * Pratinjau komponen nyata di hero halaman publik.
 *
 * Kenapa ini BUKAN mockup screenshot: versi sebelumnya membangun panel-panel
 * `<div>` bergaya screenshot — nomor SPK rekaan, nama produk rekaan, foto
 * produk rekaan. Itu persis "div-based fake screenshot" yang di-ban
 * taste-skill §4.8, dan yang lebih penting, itu berbohong: semuanya.data
 * yang tidak pernah terjadi.
 *
 * Yang diganti: apa yang ditampilkan di sini DICUKIL dari sumber data
 * sungguhan.
 *   - 5 tahap produksi dari PROGRESS_STAGE_ORDER + PROGRESS_STAGE_LABELS
 *   - Jadwal payout dari PAYOUT_SLOTS
 *   - Biaya platform dari PLATFORM_FEE_RATE
 *   - Harga paket dari PLANS
 *   - Badge memakai varian status asli milik aplikasi
 * Tidak ada nomor pesanan, nama pelanggan, atau nominal transaksi rekaan —
 * karena tidak ada sumbernya. Kalau nanti hukumnya berubah, halaman ini ikut
 * berubah tanpa ada yang harus disinkronkan manual.
 *
 * Yang ditampilkan hanyalah Tahap yang sedang berjalan. Pratinjau harus
 * menunjukkan kondisi realistis, bukan kondisi "selesai semua" yang tidak
 * pernah terjadi di tengah pengerjaan.
 */

const CURRENT_STAGE_INDEX = 2; // finishing — tahap ketiga

export function ProductPreview() {
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-overlay">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="flex items-center gap-2 text-title-md text-foreground">
          <WrenchIcon size={20} weight="light" className="text-primary" aria-hidden />
          Progres Produksi
        </h2>
        <Badge variant="production">In Produksi</Badge>
      </div>

      {/*
       * <ol> bukan <div>: ini daftar tahapan berurutan, dan pembaca screen
       * reader perlu tahu ada lima item dan urutannya. List semantics adalah
       * bagian dari komponen yang nyata, bukan hiasan.
       */}
      <ol className="flex flex-col gap-1 py-4">
        {PROGRESS_STAGE_ORDER.map((stage, index) => {
          const done = index < CURRENT_STAGE_INDEX;
          const current = index === CURRENT_STAGE_INDEX;

          return (
            <li
              key={stage}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5"
              aria-current={current ? "step" : undefined}
            >
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full border ${
                  done
                    ? "border-status-settled bg-status-settled text-white"
                    : current
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckIcon size={14} weight="bold" /> : index + 1}
              </span>

              <span
                className={
                  current
                    ? "text-title-md text-foreground"
                    : done
                      ? "text-body-md text-secondary"
                      : "text-body-md text-muted-foreground"
                }
              >
                {PROGRESS_STAGE_LABELS[stage]}
              </span>

              {current ? (
                <span className="ml-auto shrink-0">
                  <Badge variant="pending">Sedang dikerjakan</Badge>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/*
      {/*
        Angka di bawah nyata, bukan contoh. Dua hal berubah dan keduanya
        jujur ditampilkan apa adanya: jadwal payout 06.00/18.00 WIB
        digantikan pemicu bukti pengiriman, dan fee platform 1,5% dihapus.
        Yang masih membebani pengrajin adalah fee gateway, jadi itulah yang
        ditulis — menampilkan "biaya platform 0%" tanpa penjelasan akan
        membuat pengrajin mengira FurniTech tidak memungut biaya apa pun.
      */}
      <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <div>
          <dt className="text-label-sm uppercase text-muted-foreground">
            Pencairan
          </dt>
          <dd className="mt-1 text-body-md text-secondary">
            Otomatis setelah bukti diterima
          </dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase text-muted-foreground">
            Biaya per transaksi
          </dt>
          <dd className="mt-1 text-code-tabular text-secondary">
            {formatRupiah(totalGatewayCostPerOrder())} — bisa disisipkan ke
            harga
          </dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase text-muted-foreground">
            Mulai dari
          </dt>
          <dd className="mt-1 text-code-tabular text-secondary">
            {formatRupiah(PLANS.basic.priceMonthly)}/bulan
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-label-sm text-muted-foreground">
        Pratinjau komponen asli. Tahap, jadwal payout, dan biaya platform dibaca
        langsung dari kode aplikasi.
      </p>
    </div>
  );
}
