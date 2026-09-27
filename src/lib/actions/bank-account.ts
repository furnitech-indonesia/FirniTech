"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { integrationAuditLogs, tenantBankAccounts } from "@/db/schema";
import { guard, requireTenantWrite } from "@/lib/auth/guard";
import { normalizeBankAccount } from "@/lib/banks";
import {
  isPayoutsConfigured,
  loadBankOptions,
  PayoutsNotConfiguredError,
  validateBankAccount,
} from "@/lib/midtrans/payouts";
import { bankAccountFormSchema } from "@/lib/schemas/bank-account";
import { parseForm } from "@/lib/schemas/primitives";

/**
 * Simpan rekening pengrajin, lalu verifikasi lewat Payouts.
 *
 * KEPUTUSAN PENTING: KEGAGALAN VERIFIKASI TIDAK MENGHALANGI PENYIMPANAN.
 *
 * Ini mengikuti prinsip yang sama dengan pendaftaran owner: provisioning
 * berhasil, dan bagian yang butuh pihak ketiga (Midtrans) bisa gagal tanpa
 * membatalkan apa pun yang sudah berhasil. Kalau rekening tidak bisa disimpan
 * karena layanan sedang mati, pengrajin tidak bisa menarik uangnya sama sekali
 * — dan itu kerugian yang jauh lebih besar daripada pencairan yang tertahan
 * satu hari karena nomor rekeningnya belum diperiksa.
 *
 * Yang berubah saat verifikasi gagal adalah STATUS, bukan keberadaan data:
 * `unverified` kalau tidak sempat dicek, `failed` kalau ditolak. Keduanya
 * sama-sama memblokir pencairan, tapi hanya `failed` yang perlu diperbaiki
 * pengrajin, dan membedakan keduanya membuat pesan yang tampil jujur.
 *
 * AKSES: hanya `owner`, di guard DAN di policy RLS
 * (`tenant_bank_accounts_write`). Bukan karena admin penjualan tidak boleh
 * melihat rekening — dia memang boleh membacanya — tapi karena rekening
 * adalah satu-satunya jalan uang keluar dari platform, dan perubahannya
 * harus bisa dipertanggungjawabkan ke satu orang. Dua lapis itu bukan
 * redundansi: guard melindungi aplikasi, policy melindungi jalur yang tidak
 * lewat aplikasi sama sekali.
 */
export type BankAccountState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /*
   * Tidak ada field terpisah untuk "nama rekening berbeda dari yang diketik".
   *
   * Awalnya ada, lalu dihapus: `ZodForm` tidak menyerahkan `state` ke
   * children, jadi field itu hanya akan sampai ke clogged log — dan informasi
   * yang tidak sampai ke layar pengrajin sama saja tidak ada. Sekarang
   *_disampaikan lewat `message` yang sama, supaya tidak ada keadaan di mana
   * verifikasi berhasil tapi pengrajin tidak diberi tahu nama mana yang
   * akan tampil ke pembeli.
   */
};

export async function saveBankAccount(
  _prev: BankAccountState,
  formData: FormData,
): Promise<BankAccountState> {
  return guard<BankAccountState>(
    async () => {
      const actor = await requireTenantWrite(["owner"]);

      const parsed = parseForm(bankAccountFormSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { bankCode, accountNumber, accountName } = parsed.data;

      /*
       * Kode bank diperiksa terhadap daftar yang SEDANG DIPAKAI halaman, bukan
       * terhadap daftar yang ditulis di skema.
       *
       * Daftar itu bisa datang dari `GET /beneficiary_banks`, yang berubah
       * kapan saja. Skema yang punya daftar sendiri akan menolak kode yang
       * sebenarnya valid begitu Midtrans menambah bank baru — dan penolakan itu
       * akan muncul sebagai "Pilih bank." pada kode yang kelihatan benar.
       */
      const { options } = await loadBankOptions();
      const known = options.some(
        (o) => o.code.toLowerCase() === bankCode.toLowerCase(),
      );
      if (!known) {
        return {
          error: "Bank tersebut tidak didukung untuk pencairan.",
          fieldErrors: { bankCode: "Pilih salah satu bank dari daftar." },
        };
      }
      const code = bankCode.toLowerCase();

      /*
       * Verifikasi (kalau Payouts sudah dikonfigurasi).
       *
       * Semua kegagalan di sini ditelan — termasuk error jaringan — dan
       * berakhir sebagai `unverified`, bukan `failed`. Alasannya: "tidak bisa
       * dihubungi" dan "rekeningnya memang salah" adalah dua hal yang sangat
       * berbeda bagi pengrajin, dan yang pertama tidak boleh reported
       * sebagai masalah rekening yang harus ia perbaiki.
       */
      let status: "unverified" | "verified" | "failed" = "unverified";
      let verifiedAt: Date | null = null;
      let message: string | null = null;
      let storedName = accountName;
      let mismatch: { typed: string; verified: string } | undefined;

      if (!isPayoutsConfigured()) {
        message =
          "Tersimpan. Verifikasi rekening belum bisa dijalankan karena kredensial Payouts FurniTech belum diisi — pencairan akan ditahan sampai itu diperbaiki.";
      } else {
        let result;
        try {
          result = await validateBankAccount({
            bankCode: code,
            accountNumber,
            accountName,
          });
        } catch (err) {
          if (err instanceof PayoutsNotConfiguredError) {
            message = "Tersimpan, verifikasi belum bisa dijalankan.";
          } else {
            // Kesalahan jaringan, timeout, atau bentuk respons yang tidak
            // terduga. Semuanya "belum terverifikasi", bukan "ditolak".
            console.error("Verifikasi rekening gagal:", err);
            message =
              "Tersimpan, tapi verifikasi belum selesai karena layanan tidak bisa dihubungi. Coba lagi nanti.";
          }
          result = null;
        }

        if (result) {
          if (result.ok) {
            status = "verified";
            verifiedAt = new Date();
            message = null;
            /*
             * Nama yang disimpan adalah NAMA DARI BANK, bukan yang diketik
             * pengrajin. Itu seluruh gunanya memverifikasi: nama di rekening
             * akan DITAMPILKAN ke pembeli pada COD transfer bank, jadi yang
             * harus tampil adalah nama yang benar-benar ada di bank — bukan
             * ketikan yang bisa saja keliru.
             */
            storedName = result.accountName;
            if (result.accountName.toLowerCase() !== accountName.toLowerCase()) {
              mismatch = { typed: accountName, verified: result.accountName };
            }
          } else {
            status = "failed";
            message = result.message;
          }
        }
      }

      /*
       * `onConflictDoUpdate` pada `tenant_id`, bukan insert-then-catch.
       *
       * Satu tenant = satu rekening, jadi primary key sudah menyatakan
       * aturannya; `onConflict` membuat penyimpanan ini idempoten tanpa
       * perlu logika "cari dulu, lalu insert atau update" yang punya
       * race condition-nya sendiri. Dan `actor.tenantId` SELALU dari guard —
       * `tenantId` tidak pernah dibaca dari FormData, karena itu berarti
       * owner bisa menulis rekening ke tenant lain hanya dengan mengetik
       * UUID.
       */
      const bankName =
        options.find((o) => o.code.toLowerCase() === code)?.label ?? code;

      await db
        .insert(tenantBankAccounts)
        .values({
          tenantId: actor.tenantId,
          bankCode: code,
          bankName,
          // Dinormalisasi ulang di sini juga. Schema sudah melakukannya, tapi
          // nilai yang disimpan adalah yang keluar dari database, dan satu
          // titik normalisasi lebih mudah diaudit daripada tiga.
          accountNumber: normalizeBankAccount(accountNumber),
          accountName: storedName,
          status,
          verifiedAt,
          validationMessage: message,
        })
        .onConflictDoUpdate({
          target: tenantBankAccounts.tenantId,
          set: {
            bankCode: code,
            bankName,
            accountNumber: normalizeBankAccount(accountNumber),
            accountName: storedName,
            status,
            verifiedAt,
            validationMessage: message,
          },
        });

      /*
       * Audit log. WAJIB, dan bukan formalitas: ini satu-satunya catatan
       * bahwa rekening tujuan pencairan berubah, dan pencairan dilakukan
       * ke rekening itu. Tanpa baris ini, pertanyaan "ke mana
       * uang bulan ini dikirim" tidak bisa dijawab.
       *
       * Yang TIDAK ditulis ke audit: nomor rekening dan nama pemilik. Itu
       * data bank, dan tabel audit dibaca super admin — untuk rekonsiliasi
       * cukup tahu rekening BERUBAH pada jam berapa oleh siapa, bukan
       * seperti apa isinya.
       */
      await db.insert(integrationAuditLogs).values({
        tenantId: actor.tenantId,
        service: "iris",
        action: "bank_account_saved",
        status: status === "failed" ? "failed" : "success",
        requestMeta: {
          bankCode: code,
          accountNumberLast4: normalizeBankAccount(accountNumber).slice(-4),
          verificationOutcome: status,
        },
        errorMessage: status === "failed" ? message : null,
      });

      revalidatePath("/dashboard/pengaturan/rekening");

      if (status === "failed") {
        return { error: message ?? "Rekening tidak bisa diverifikasi." };
      }

      const success = mismatch
        ? `Rekening terverifikasi, tetapi nama di bank adalah "${mismatch.verified}" — bukan "${mismatch.typed}" seperti yang diketik. Yang tersimpan dan yang akan tampil ke pembeli adalah "${mismatch.verified}". Kalau ini memang bukan rekening Anda, ganti sekarang: nama itu akan dilihat pembeli.`
        : `Rekening terverifikasi. Nama pemilik yang tercatat di bank adalah "${storedName}", dan itulah yang akan tampil ke pembeli.`;

      return { message: message ?? success };
    },
    (error) => ({ error }),
  );
}
