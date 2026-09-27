import { WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { needsReviewCount } from "@/lib/shipping";

/**
 * Peringatan tarif yang belum terhubung ke wilayah.
 *
 * Baris hasil backfill yang nama wilayahnya ambigu atau tidak dikenal ("Bandung",
 * "Jakarta") tidak bisa dipetakan ke satu kabupaten, jadi sekarang ia berlaku
 * untuk SELURUH wilayah. Kalau tarifnya ternyata tidak sesuai untuk daerah
 * itu, pengrajin menarik rupiah yang keliru dari pembeli nyata.
 *
 * DITAMPILKAN, bukan disembunyikan. Sengaja: diam-diamnya tarif generik ini
 * adalah jenis kesalahan yang baru ketahuan setelah ada pembeli yang protes.
 */
export async function NeedsReviewNotice({ tenantId }: { tenantId: string }) {
  const count = await needsReviewCount(tenantId);
  if (count === 0) return null;

  return (
    <div className="mb-6 flex gap-3 rounded-2xl border border-status-pending bg-muted p-4">
      <WarningIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-status-pending" aria-hidden />
      <div className="text-body-md">
        <p className="text-title-md text-foreground">
          {count} tarif belum terhubung ke kabupaten tertentu
        </p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Tarif ini dulu diisi sebagai teks bebas, dan namanya bisa berarti lebih
          dari satu kabupaten. Selama belum dipilih kabupatennya, tarif tersebut
          dipakai untuk semua wilayah. Pilih kabupaten yang benar agar tidak
          menarik tarif yang keliru dari pembeli.
        </p>
      </div>
    </div>
  );
}
