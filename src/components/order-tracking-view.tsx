import { BankIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDateID, formatNumber } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PROGRESS_STAGE_LABELS,
} from "@/lib/labels";
import { PROGRESS_STAGE_ORDER, type ProgressStage } from "@/lib/order-status";
import type { TrackingOrder } from "@/lib/orders-public";

/**
 * Tampilan hasil lacak pesanan (Sprint 5 bagian 4).
 *
 * Yang ditampilkan: status, timeline lima tahap beserta foto, nomor resi, dan
 * ringkasan barang.
 *
 * Yang SENGAJA tidak ada, dan itu keputusan, bukan kebetulan:
 *   - `netTenantAmount`, `midtransMdrFee`, `platformServiceFee` — margin toko
 *     bukan urusan pembeli.
 *   - Koordinat GPS — itu lokasi rumah orang. Pembeli tidak butuh mengetuk
 *     peta untuk melihat status pesanannya.
 *   - Email, dan nomor WhatsApp orang lain di pesanan yang sama.
 */
export function OrderTrackingView({ order }: { order: TrackingOrder }) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-label-sm uppercase text-muted-foreground">
          Pesanan {order.orderCode}
        </p>
        <h1 className="text-headline-md text-foreground text-balance">
          {order.customerName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ORDER_STATUS_TONES[order.orderStatus as never] ?? "neutral"}>
            {ORDER_STATUS_LABELS[order.orderStatus as never] ?? order.orderStatus}
          </Badge>
          <Badge variant="neutral">
            {PAYMENT_STATUS_LABELS[order.paymentStatus as never] ?? order.paymentStatus}
          </Badge>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Dibuat {formatDateID(order.createdAt)} · Total{" "}
          <span className="text-code-tabular text-foreground">
            {formatRupiah(order.totalAmount)}
          </span>
        </p>
      </header>

      <StageTimeline order={order} />

      {order.codBank ? <CodPaymentPanel order={order} /> : null}

      {order.cargoName || order.trackingNumber ? (
        <section className="grid gap-2 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-title-md text-foreground">
            <TruckIcon size={18} weight="light" aria-hidden />
            Pengiriman
          </h2>
          {order.cargoName ? (
            <p className="text-body-md text-muted-foreground">
              Kurir: {order.cargoName}
            </p>
          ) : null}
          {order.trackingNumber ? (
            <p className="text-body-md">
              Nomor resi:{" "}
              <span className="text-code-tabular text-foreground">
                {order.trackingNumber}
              </span>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-title-md text-foreground">Pesanan</h2>
        <ul className="grid gap-1 text-body-md text-muted-foreground">
          {order.items.map((item, index) => (
            <li key={`${item.productName}-${index}`}>
              <span className="text-code-tabular text-foreground">
                {formatNumber(item.quantity)}×
              </span>{" "}
              {item.productName}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Dikirim ke {order.address}
          {order.cityName ? ` — ${order.cityName}` : ""}
        </p>
      </section>
    </div>
  );
}

/**
 * Timeline lima tahap produksi.
 *
 * Lima tahap SELALU digambar, bukan hanya yang sudah tercapai. Buyersnya
 * berhak tahu bahwa ada tahap lagi setelah yang sedang dikerjakan — dan kalau
 * hanya tahap yang tercapai yang tampil, "Belum ada foto progres" terlihat
 * seperti rusak, bukan seperti "belum mulai".
 */
function StageTimeline({ order }: { order: TrackingOrder }) {
  const reached = order.reachedStage;

  return (
    <section className="grid gap-3">
      <h2 className="text-title-md text-foreground">Progres pengerjaan</h2>

      {reached === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-body-md text-muted-foreground">
          Belum ada foto progres. Pesanan Anda sudah tercatat dan akan
          berjalan setelah pengerjaan dimulai.
        </p>
      ) : null}

      <ol className="grid gap-3">
        {PROGRESS_STAGE_ORDER.map((stage, index) => {
          const position = index + 1;
          const done = position <= reached;
          const entry = [...order.stages]
            .reverse()
            .find((s) => s.stage === (stage as ProgressStage));

          return (
            <li
              key={stage}
              className={`rounded-2xl border p-4 ${
                done ? "border-border bg-card" : "border-dashed border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-body-md ${done ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {position}. {labelFor(stage)}
                </p>
                {entry ? (
                  <span className="text-body-sm text-muted-foreground">
                    {formatDateID(entry.at)}
                  </span>
                ) : null}
              </div>

              {entry ? (
                <div className="mt-3 grid gap-2">
                  {entry.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.photoUrl}
                      alt={`Foto ${labelFor(stage)} untuk pesanan ${order.orderCode}`}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-xl bg-muted text-body-sm text-muted-foreground">
                      Foto tidak tersedia
                    </div>
                  )}

                  {entry.notes ? (
                    <p className="text-body-sm text-muted-foreground">
                      {entry.notes}
                    </p>
                  ) : null}

                  <p className="text-body-sm text-muted-foreground">
                    Oleh {entry.carpenterName}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Panel pembayaran COD (Sprint 6).
 *
 * Halaman lacak adalah tempat pembeli melihat Detail pesanannya, dan COD
 * adalah satu-satunya metode yang perlu dijelaskan di sini: pembayarannya terjadi
 * di luar sistem — uang tunai ke kurir, atau transfer ke rekening
 * pengrajin. Tanpa rekeningnya di halaman ini, pembeli tidak punya tempat
 * untuk mencari nomor tujuan.
 *
 * `order.codBank` hanya terisi untuk pesanan COD yang belum lunas dan yang
 * rekening pengrajinnya sudah terverifikasi (lihat `orders-public.ts`), jadi
 * komponen ini tidak punya kondisi yang perlu dicek ulang.
 *
 * NOMOR REKENINGNYA DITAMPILKAN UTUH, bukan disamarkan, dan ini disengaja.
 * Bedanya dengan halaman pencairan: di sini yang membaca adalah orang yang
 * harus MEMBAYAR ke rekening itu, jadi menyembunyikan sebagian justru
 * membuat ia salah transfer — dan orang yang menanggung salah transfer COD
 * adalah pengrajin.
 */
function CodPaymentPanel({ order }: { order: TrackingOrder }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-title-md text-foreground">
        <BankIcon size={18} weight="light" aria-hidden />
        Cara pembayaran
      </h2>

      <p className="text-body-md text-muted-foreground">
        Pesanan ini dibayar di tempat. Ada dua cara: serahkan uang tunai ke
        kurir saat barang diterima, atau transfer ke rekening di bawah lalu
        sebutkan kode pesanan <span className="text-code-tabular">{order.orderCode}</span>{" "}
        sebagai keterangan.
      </p>

      <dl className="grid gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
          <dt className="text-body-sm text-muted-foreground">
            {order.codBank!.bankName}
          </dt>
          <dd className="text-code-tabular text-title-md text-foreground">
            {order.codBank!.accountNumber}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-body-sm text-muted-foreground">Atas nama</dt>
          <dd className="text-body-md text-foreground">
            {order.codBank!.accountName}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-body-sm text-muted-foreground">Total</dt>
          <dd className="text-code-tabular text-body-md text-foreground">
            {formatRupiah(order.totalAmount)}
          </dd>
        </div>
      </dl>

      <p className="text-body-sm text-muted-foreground">
        Rekening ini milik pengrajin dan sudah diperiksa. Pastikan nama dan
        nomornya sama saat transfer — kalau ada yang berbeda, jangan transfer
        ke sana.
      </p>
    </section>
  );
}

/**
 * Label tahap diambil dari `PROGRESS_STAGE_LABELS`, bukan ditulis ulang di
 * sini. Versi pertama punya salinan literal dari kelima label, dan itulah
 * cara label di satu tempat mulai berbeda dari label di tempat lain.
 */
function labelFor(stage: (typeof PROGRESS_STAGE_ORDER)[number]): string {
  return PROGRESS_STAGE_LABELS[stage] ?? stage;
}
