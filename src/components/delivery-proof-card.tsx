import { CheckCircleIcon, PenNibIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";

import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { formatDateID, formatRupiah } from "@/lib/format";

/**
 * Bukti penerimaan di detail pesanan (Sprint 6).
 *
 * Ada supaya bukti ini bukan sekadar baris di database yang tidak pernah
 * dilihat siapa pun. Pengrajin perlu bisa membuka foto dan tanda tangannya
 * kalau ada yang menyangkut pembayarannya.
 *
 * TIGA HAL YANG SENGAJA TIDAK ADA DI SINI:
 *   - Tombol hapus atau ubah. Barisnya append-only di database, jadi
 *     tombol seperti itu hanya akan menampilkan error.
 *   - Status pembayaran. Pembayaran dicatat di modul pembayaran, supaya ada
 *     satu tempat yang jadi acuan kas.
 *   - Nominal pencairan. Yang tampil di sini adalah buktinya; nominalnya
 *     ada di modul payout dan dihitung di server.
 *
 * `photoUrl` dan `signatureUrl` adalah SIGNED URL berumur satu jam. Path
 * mentah tidak boleh pernah menempel ke `<img src>`: bucketnya privat, jadi
 * hasilnya 403 — dan yang lebih buruk, kalau bucketnya sampai publik, path
 * mentah adalah tautan permanen ke bukti orang.
 */
export type DeliveryProofView = {
  id: string;
  photoUrl: string | null;
  signatureUrl: string | null;
  signerName: string;
  courierName: string;
  notes: string | null;
  codAmount: number | null;
  codProofUrl: string | null;
  receivedAt: Date;
};

export function DeliveryProofCard({ proof }: { proof: DeliveryProofView }) {
  return (
    <SectionCard
      title="Bukti barang diterima"
      description={`Diterima ${formatDateID(proof.receivedAt)} oleh ${proof.courierName}.`}
    >
      <div className="grid gap-4">
        <p className="flex items-center gap-2 text-body-sm text-status-settled">
          <CheckCircleIcon size={16} weight="fill" aria-hidden />
          Pencairan untuk pesanan ini sudah dipicu.
        </p>

        <dl className="grid gap-2 text-body-sm">
          <div className="flex flex-wrap items-center gap-2">
            <dt className="flex min-w-40 items-center gap-2 text-muted-foreground">
              <TruckIcon size={16} weight="light" aria-hidden />
              Diterima dari
            </dt>
            <dd className="text-foreground">{proof.signerName}</dd>
          </div>
          {proof.codAmount !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">COD diterima</dt>
              <dd className="text-code-tabular text-foreground">
                {formatRupiah(proof.codAmount)}
              </dd>
            </div>
          ) : null}
          {proof.notes ? (
            <div className="flex flex-wrap items-start gap-2">
              <dt className="text-muted-foreground">Catatan kurir</dt>
              <dd className="text-foreground">{proof.notes}</dd>
            </div>
          ) : null}
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="grid gap-1.5">
            <figcaption className="text-body-sm font-medium text-secondary">
              Foto barang
            </figcaption>
            {proof.photoUrl ? (
              // Signed URL satu jam. `alt` menjelaskan isi, bukan "gambar".
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proof.photoUrl}
                alt={`Foto barang diterima untuk ${proof.signerName}`}
                className="aspect-square w-full rounded-xl border border-border object-cover"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-body-sm text-muted-foreground">
                Foto tidak dapat dimuat. Tautan kedaluwarsa — muat ulang
                halaman.
              </p>
            )}
          </figure>

          <figure className="grid gap-1.5">
            <figcaption className="flex items-center gap-2 text-body-sm font-medium text-secondary">
              <PenNibIcon size={16} weight="light" aria-hidden />
              Tanda tangan
            </figcaption>
            {proof.signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proof.signatureUrl}
                alt={`Tanda tangan ${proof.signerName}`}
                className="w-full rounded-xl border border-border bg-input object-contain"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-body-sm text-muted-foreground">
                Tanda tangan tidak dapat dimuat. Tautan kedaluwarsa — muat
                ulang halaman.
              </p>
            )}
          </figure>
        </div>

        {proof.codProofUrl ? (
          <figure className="grid gap-1.5">
            <figcaption className="text-body-sm font-medium text-secondary">
              Bukti transfer COD
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proof.codProofUrl}
              alt="Bukti transfer COD"
              className="max-h-64 w-full rounded-xl border border-border object-contain"
            />
          </figure>
        ) : null}

        <p className="text-body-sm text-muted-foreground">
          Bukti ini tidak bisa diubah atau dihapus, termasuk oleh FurniTech.
          Kalau ada yang tidak sesuai, catat di catatan pesanan — jangan
          mengunggah ulang.
        </p>
      </div>
    </SectionCard>
  );
}

/** Bukti belum ada. Dipisah supaya halaman tidak memanggil loader sama sekali. */
export function DeliveryProofMissing({ hasCourier }: { hasCourier: boolean }) {
  return (
    <SectionCard
      title="Bukti barang diterima"
      description={
        hasCourier
          ? "Kurir sudah ditugaskan. Bukti terkirim setelah barang diterima di tempat."
          : "Belum ada kurir yang ditugaskan untuk pesanan ini."
      }
    >
      <Badge variant="pending">Belum ada bukti</Badge>
    </SectionCard>
  );
}
