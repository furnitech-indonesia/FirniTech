"use client";

import { SelectField, TextField } from "@/components/rhf-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ZodForm } from "@/components/zod-form";
import { saveBankAccount } from "@/lib/actions/bank-account";
import { bankAccountFormSchema } from "@/lib/schemas/bank-account";

/**
 * Form rekening pencairan (Sprint 6).
 *
 * Tiga hal yang perlu diketahui orang yang mengisi form ini, dan semuanya
 * ditampilkan di halaman — bukan hanya di dokumentasi:
 *
 *  1. **Rekening ini akan tampil ke pembeli.** Pada COD transfer bank, FurniTech
 *     menampilkan nomor dan atas nama rekening ini kepada pelanggan. Itu
 *     alasan rekeningnya diverifikasi: kalau nomornya salah, pembeli salah
 *     transfer dan yang menanggung adalah pengrajin.
 *  2. **Nama yang disimpan adalah nama dari bank**, bukan yang diketik di
 *     sini, kalau verifikasi berhasil. Kalau keduanya berbeda, pengrajin
 *     diberi tahu secara eksplisit.
 *  3. **Menyimpan tidak butuh verifikasi berhasil.** Verifikasi yang gagal
 *     menahan pencairan, bukan menolak menyimpan.
 */
export function BankAccountForm({
  options,
  current,
}: {
  options: ReadonlyArray<{ code: string; label: string }>;
  current: {
    bankCode: string | null;
    accountNumber: string | null;
    accountName: string | null;
  };
}) {
  const options_ = [
    // Kode yang tersimpan tapi tidak ada di daftar (mis. bank yang
    // ditambahkan Midtrans dan daftar lokal belum menyusul) tetap
    // ditampilkan. Menyingkirkan pilihan yang sedang aktif menghasilkan
    // dropdown yang menampilkan nilai yang tidak ada di dalamnya, dan
    // pengrajin akan mengira datanya hilang.
    ...(current.bankCode &&
    !options.some((o) => o.code === current.bankCode)
      ? [{ code: current.bankCode, label: `${current.bankCode} (tidak ada di daftar)` }]
      : []),
    ...options,
  ];

  return (
    <ZodForm
      schema={bankAccountFormSchema}
      action={saveBankAccount}
      defaultValues={{
        bankCode: current.bankCode ?? "",
        accountNumber: current.accountNumber ?? "",
        accountName: current.accountName ?? "",
      }}
      submitLabel="Simpan & verifikasi rekening"
    >
      {(ctx) => (
        <>
          <SelectField
            ctx={ctx}
            label="Bank"
            name="bankCode"
            required
            defaultValue={current.bankCode ?? ""}
            options={options_.map((o) => ({ value: o.code, label: o.label }))}
            placeholder="— pilih bank —"
          />

          <TextField
            ctx={ctx}
            label="Nomor rekening"
            name="accountNumber"
            required
            inputMode="numeric"
            placeholder="1234567890"
            hint="Tanpa spasi dan tanda hubung. Spasi dan tanda hubung otomatis dibuang."
          />

          <TextField
            ctx={ctx}
            label="Atas nama"
            name="accountName"
            required
            placeholder="Nama seperti tertulis di buku bank"
            hint="Kalau verifikasi berhasil, yang disimpan adalah nama dari bank — bukan ketikan ini."
          />

          <Alert>
            <AlertTitle>Rekening ini dipakai untuk menarik uang Anda</AlertTitle>
            <AlertDescription>
              Pada pembayaran COD transfer bank, nomor dan atas nama rekening
              ini ditampilkan kepada pembeli. Pastikan keduanya benar —
              kesalahan transfer ditanggung pengrajin.
            </AlertDescription>
          </Alert>
        </>
      )}
    </ZodForm>
  );
}
