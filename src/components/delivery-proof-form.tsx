"use client";

import { FileField, TextAreaField, TextField } from "@/components/rhf-fields";
import { formatRupiah } from "@/lib/format";
import { SignaturePad } from "@/components/signature-pad";
import { ZodForm } from "@/components/zod-form";
import { submitDeliveryProof } from "@/lib/actions/delivery";
import { deliveryProofFormSchema } from "@/lib/schemas/delivery";

/**
 * Form bukti penerimaan (Sprint 6).
 *
 * Dua isian yang di sini WAJIB ada dan tidak bisa dilewati: foto barang dan
 * tanda tangan. Keduanya tidak punya "nanti saja" — kalau barang sudah sampai
 * dan tidak ada yang merekamnya, uang pengrajin tidak pernah bergerak, dan
 * tidak ada pula pihak yang bisa menegaskan barangnya benar-benar sampai.
 *
 * Tanda tangan digambar di layar HP kurir, bukan di layar pelanggan. Itu
 * keputusan yang diketahui lemah: yang menandatangani belum tentu yang
 * membeli, dan tidak ada verifikasi identitas. Diterima karena kanal
 * pembayaran hanya VA (transfer bank tidak bisa di-chargeback) dan tidak ada
 * skema refund — lihat catatan risiko di ROADMAP. Begitu kartu kredit atau
 * QRIS ditambahkan, kelemahan ini berubah jadi tanggung jawab platform.
 *
 * `photo` TIDAK didaftarkan ke react-hook-form: RHF tidak mengurus `File`.
 * Nilainya diambil dari `new FormData(form)` di dalam `ZodForm` lalu
 * divalidasi di server (`src/lib/storage.ts`: MIME + ukuran).
 */
export function DeliveryProofForm({
  orderId,
  isCod,
  remaining,
  onDone,
}: {
  orderId: string;
  /**
   * Pesanan COD atau bukan. Menentukan apakah field nominal COD dirender.
   *
   * `isCod` datang dari server, dan `submitDeliveryProof` memverifikasinya
   * ULANG dari database. Field yang tidak cocok dengan pesanannya akan
   * ditolak, jadi parameter ini hanya untuk tampilan, bukan untuk kebenaran.
   */
  isCod: boolean;
  /** Sisa tagihan untuk COD, dari server. */
  remaining: number;
  /** Dipanggil setelah server menyatakan berhasil, untuk menutup panel. */
  onDone?: () => void;
}) {
  return (
    <ZodForm
      schema={deliveryProofFormSchema}
      action={submitDeliveryProof}
      hidden={{ orderId, codAmount: isCod ? undefined : "" }}
      defaultValues={{ signerName: "", notes: "" }}
      submitLabel="Kirim bukti & picu pencairan"
      onSuccess={onDone}
      className="grid gap-4"
    >
      {(ctx) => (
        <>
          {isCod ? (
            <>
              <div className="rounded-xl border border-border bg-surface-sunken p-3 text-body-sm text-muted-foreground">
                Pesanan COD. Uang diterima di tempat, jadi tidak ada yang
                masuk ke saldo pengrajin. Catat nominalnya supaya pengrajin
                tahu apa yang sudah tertagih.
                {remaining > 0 ? (
                  <>
                    {" "}Sisa tagihan{" "}
                    <span className="text-code-tabular text-foreground">
                      {formatRupiah(remaining)}
                    </span>
                    .
                  </>
                ) : null}
              </div>

              <TextField
                ctx={ctx}
                label="Uang COD yang diterima (Rp)"
                name="codAmount"
                required
                inputMode="numeric"
                placeholder="0"
                hint={
                  remaining > 0
                    ? `Tidak boleh melebihi ${formatRupiah(remaining)}. Tulis 0 kalau memang tidak ada uang masuk.`
                    : "Tulis 0 kalau memang tidak ada uang masuk."
                }
              />

              <FileField
                label="Bukti transfer COD (opsional)"
                name="codProof"
                hint="Foto struk atau screenshot mutasi rekening. Untuk uang tunai tidak perlu."
              />
            </>
          ) : null}

          <FileField
            label="Foto barang diterima"
            name="photo"
            required
            hint="JPEG/PNG/WebP/AVIF, maksimal 12 MB."
          />

          <SignaturePad name="signature" />

          <TextField
            ctx={ctx}
            label="Nama yang menerima"
            name="signerName"
            required
            placeholder="Nama sendiri, atau nama piket/keluarga"
          />

          <TextAreaField
            ctx={ctx}
            label="Catatan"
            name="notes"
            rows={2}
            placeholder="Barang diterima lengkap / ada goresan / barang ditolak"
          />
        </>
      )}
    </ZodForm>
  );
}
