import { ArrowSquareOutIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { SectionCard, EmptyState } from "@/components/panels";
import { formatDateID, formatRupiah } from "@/lib/format";
import {
  UMUR_TAGIHAN_MENARIK,
  invoiceHint,
  labelInvoice,
  type InvoiceHistoryRow,
  type PendingInvoice,
} from "@/lib/billing/notice";

/**
 * Banner tagihan yang menunggu, dan daftar riwayat tagihan.
 *
 * Ini adalah "notifikasi" untuk pengrajin (Sprint 6): tagihan perpanjangan
 * terbit dari cron, dan tanpa ini orang hanya mengetahuinya ketika layanannya
 * sudah berhenti. Bukan email, dan alasannya ada di `src/lib/billing/notice.ts`
 * -- singkatnya, tidak ada kanal keluar yang bisa dipakai hari ini, dan
 * notifikasi yang tidak bisa dibayar hanya memindahkan rasa bersalah ke
 * tempat yang salah.
 *
 * HONOR: banner tidak pernah menutupi isi halaman. Ditempatkan di atas
 * `children` layout, bukan sebagai overlay, jadi ia menambah tinggi halaman
 * alih-alih menutupinya.
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

function badgeStatus(status: string) {
  if (status === "paid") return <Badge variant="settled">Lunas</Badge>;
  if (status === "pending") return <Badge variant="pending">Menunggu</Badge>;
  if (status === "refunded") return <Badge>Dikembalikan</Badge>;
  return <Badge variant="failed">Gagal</Badge>;
}

/** Tombol bayar. `payUrl` kosong berarti charge-nya belum pernah dibuat. */
function BayarButton({ invoice }: { invoice: PendingInvoice }) {
  if (!invoice.payUrl) {
    return (
      <p className="text-body-sm text-muted-foreground">
        Halaman pembayaran untuk tagihan ini belum bisa dibuat. Hubungi kami
        dan kami buatkan.
      </p>
    );
  }

  return (
    <a
      href={invoice.payUrl}
      // `noopener` wajib: tanpa itu, halaman Midtrans bisa mengubah
      // `window.opener` dan menavigate dashboard pengrajin ke domain lain.
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      Bayar sekarang
      <ArrowSquareOutIcon size={16} weight="light" aria-hidden />
    </a>
  );
}

export function PendingInvoices({ invoices }: { invoices: PendingInvoice[] }) {
  if (invoices.length === 0) return null;

  const total = invoices.reduce((a, b) => a + b.amount, 0);
  // Ada tagihan yang sudah tua: Snap-nya kemungkinan kedaluwarsa, dan
  // menekan tombol hanya menghasilkan halaman error Midtrans. Meny-embunyikan
  // tombol dan menjelaskan lebih berguna daripada membiarkan orang gagal.
  const adaYangLama = invoices.some((i) => i.umurHari > UMUR_TAGIHAN_MENARIK);

  return (
    <SectionCard
      title={
        invoices.length === 1
          ? "Ada tagihan yang menunggu"
          : `Ada ${invoices.length} tagihan yang menunggu`
      }
      description={`Total ${formatRupiah(total)} sudah termasuk semua biaya Midtrans. Tidak ada biaya tambahan untuk membayar.`}
    >
      <div className="flex flex-col gap-4">
        {adaYangLama ? (
          <p className="flex items-start gap-2 rounded-lg border border-border bg-surface-sunken p-3 text-body-sm text-muted-foreground">
            <WarningIcon
              size={18}
              className="mt-0.5 shrink-0 text-status-pending"
              aria-hidden
            />
            <span>
              Salah satu tagihan di bawah sudah terbit lebih dari{" "}
              {UMUR_TAGIHAN_MENARIK} hari lalu. Halaman pembayaran dari
              Midtrans punya masa berlaku, jadi kalau tombolnya tidak
              berhasil, hubungi kami dan kami buatkan ulang.
            </span>
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-title-md text-foreground">
                  {labelInvoice(inv.itemType)}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  {invoiceHint(inv)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <p className="text-headline-sm text-code-tabular text-foreground">
                  {formatRupiah(inv.amount)}
                </p>
                <BayarButton invoice={inv} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

/** Ringkasan satu kalimat untuk banner layout. */
export function PendingBannerLine({ total, count }: { total: number; count: number }) {
  if (count === 0) return null;
  return `${count === 1 ? "Ada 1 tagihan" : `Ada ${count} tagihan`} menunggu pembayaran — ${formatRupiah(total)}`;
}

export function InvoiceHistory({ rows }: { rows: InvoiceHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="Belum ada tagihan. Tagihan muncul di sini begitu langganan atau add-on diterbitkan." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/*
       * Kartu di mobile, tabel di md ke atas. Aturan `test:responsive` --
       * dan alasan sebenarnya: tabel lima kolom di 375px memaksa scroll
       * horizontal, dan kolom yang keluar dari layar adalah NOMINALNYA.
       */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-title-md text-foreground">
                {labelInvoice(r.itemType)}
              </p>
              {badgeStatus(r.status)}
            </div>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {invoiceHint({
                itemType: r.itemType,
                isRenewal: r.isRenewal,
                periodEnd: r.periodEnd,
              })}
            </p>
            <p className="mt-2 text-headline-sm text-code-tabular text-foreground">
              {formatRupiah(r.amount)}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {r.paidAt
                ? `Dibayar ${formatDateID(r.paidAt)}`
                : `Diterbitkan ${formatDateID(r.createdAt)}`}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Riwayat tagihan FurniTech</caption>
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Tagihan
              </th>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Berlaku sampai
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Nominal
              </th>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <span className="block text-foreground">
                    {labelInvoice(r.itemType)}
                  </span>
                  <span className="block text-body-sm text-muted-foreground">
                    {invoiceHint({
                      itemType: r.itemType,
                      isRenewal: r.isRenewal,
                      periodEnd: r.periodEnd,
                    })}
                  </span>
                </th>
                <td className="px-4 py-2 text-foreground">{r.periodEnd}</td>
                <td className="px-4 py-2 text-right text-code-tabular text-foreground">
                  {formatRupiah(r.amount)}
                </td>
                <td className="px-4 py-2">
                  {badgeStatus(r.status)}
                  <span className="sr-only">{STATUS_LABEL[r.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
