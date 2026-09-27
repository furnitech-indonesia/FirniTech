import { z } from "zod";

import { normalizeBankAccount } from "@/lib/banks";

/**
 * Skema rekening pengrajin (Sprint 6).
 *
 * `bankCode` divalidasi di server terhadap daftar bank yang sedang dipakai
 * halaman — bukan terhadap daftar yang ditulis manual di sini. Daftar bank
 * bisa datang dari `GET /beneficiary_banks` kapan saja, dan skema yang
 * punya daftar sendiri akan menolak kode yang sebenarnya valid begitu
 * Midtrans menambah bank baru.
 *
 * Nomor rekening DITRANSFORMASI oleh `normalizeBankAccount`, bukan hanya
 * divalidasi. Ini bukan detail tampilan: nomor yang sama bisa diketik
 * `1234-5678` atau `12345678`, dan kalau yang tersimpan bentuk yang diketik,
 * verifikasi mengirim bentuk berbeda dari yang tercatat di buku bank —
 * yang akan ditolak untuk alasan yang tidak akan pernah dijelaskan ke
 * pengrajin.
 */
export const bankAccountFormSchema = z.object({
  bankCode: z
    .string()
    .trim()
    .min(1, "Pilih bank."),

  accountNumber: z
    .string()
    .trim()
    .min(1, "Isi nomor rekening.")
    .transform(normalizeBankAccount)
    // 6 digit terlalu pendek untuk rekening apa pun di Indonesia, 20 adalah
    // batas terpanjang (BCA). Pengegivingan di sini revolutionizedoz Cuts
    // permintaan ke layanan yang pasti ditolak dengan pesan yang tidak
    // menjelaskan apa yang salah.
    .pipe(
      z
        .string()
        .min(6, "Nomor rekening terlalu pendek.")
        .max(20, "Nomor rekening maksimal 20 digit."),
    ),

  accountName: z
    .string()
    .trim()
    .min(2, "Isi nama pemilik rekening seperti tertulis di buku bank.")
    .max(100, "Nama terlalu panjang."),
});

export type BankAccountInput = z.infer<typeof bankAccountFormSchema>;
