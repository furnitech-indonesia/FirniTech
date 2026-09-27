import { eq } from "drizzle-orm";
import { InfoIcon, WalletIcon } from "@phosphor-icons/react/dist/ssr";

import { BankAccountForm } from "@/components/bank-account-form";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { tenantBankAccounts } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { formatDateID } from "@/lib/format";
import { isPayoutsConfigured, loadBankOptions } from "@/lib/midtrans/payouts";

export const metadata = { title: "Rekening Pencairan — FurniTech" };

/**
 * Pengaturan rekening pencairan (Sprint 6).
 *
 * Halaman ini satu-satunya tempat pengrajin bisa memasukkan rekening, dan
 * hanya owner yang boleh membukanya: rekening adalah satu-satunya jalan uang
 * keluar dari platform, jadi perubahannya harus bisa dipertanggungjawabkan ke
 * satu orang.
 *
 * TIGA KEADAAN YANG DITAMPILKAN SECARA BERBEDA, karena artinya berbeda:
 *   - `verified`   — rekening sudah dicek oleh Payouts.
 *   - `failed`     — rekening ditolak, ada alasannya, dan itu yang perlu
 *                    diperbaiki pengrajin.
 *   - `unverified` — rekening tersimpan tapi belum sempat dicek. BUKAN error:
 *                    `MIDTRANS_IRIS_API_KEY` masih kosong, jadi selama itu
 *                    kosong semua tenant akan berada di sini, dan menampilkannya
 *                    sebagai merah hanya membuat pengrajin mengira rekeningnya
 *                    yang bermasalah.
 */
export default async function BankAccountPage() {
  const actor = await requireTenantWrite(["owner"]);

  const [account] = await db
    .select()
    .from(tenantBankAccounts)
    .where(eq(tenantBankAccounts.tenantId, actor.tenantId))
    .limit(1);

  const { options, fromService } = await loadBankOptions();
  const configured = isPayoutsConfigured();

  const hasAccount = Boolean(account);

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Rekening pencairan</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Rekening tempat uang dari pesanan yang sudah lunas dikirim ke Anda.
        </p>
      </header>

      {hasAccount ? (
        <SectionCard
          title="Rekening saat ini"
          description="Dipakai untuk semua pencairan berikutnya."
        >
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <WalletIcon size={18} weight="light" aria-hidden />
              <span className="text-title-md text-foreground">
                {account?.bankName}
              </span>
              <StatusBadge status={account?.status} />
            </div>

            {/*
              Nomor rekening ditampilkan PENUH, bukan disamarkan.

              Ini halaman owner yang sudah login dan sudah diberi satu-satunya
              jalan keluar dari platform. Menyembunyikan nomornya dari dia
              sendiri menambah satu langkah tanpa menambah keamanan — dan yang
              tidak ditampilkan di sini memang tidak ada: FurniTech tidak
              menyimpan nama lengkap pemilik rekening dari identitas
              pengrajin, hanya atas nama rekening seperti tertulis di buku
              bank.
            */}
            <p className="text-code-tabular text-title-md text-foreground">
              {account?.accountNumber}
            </p>
            <p className="text-body-md text-muted-foreground">
              atas nama {account?.accountName}
            </p>

            {account?.status === "verified" && account.verifiedAt ? (
              <p className="text-body-sm text-status-settled">
                Terverifikasi {formatDateID(account.verifiedAt)}.
              </p>
            ) : null}
            {account?.validationMessage ? (
              <p
                className={
                  account.status === "failed"
                    ? "text-body-sm text-destructive"
                    : "text-body-sm text-muted-foreground"
                }
              >
                {account.validationMessage}
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="mt-4">
        <SectionCard
          title={hasAccount ? "Ganti rekening" : "Isi rekening"}
          description="Nomor dan atas nama rekening ini akan ditampilkan kepada pembeli pada pembayaran COD transfer bank."
        >
          <BankAccountForm
            options={options}
            current={{
              bankCode: account?.bankCode ?? null,
              accountNumber: account?.accountNumber ?? null,
              accountName: account?.accountName ?? null,
            }}
          />
        </SectionCard>
      </div>

      {/*
        Dua catatan yang harus jujur, bukan disembunyikan sampai muncul
        sebagai masalah.
      */}
      {!configured ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-sunken p-4 text-body-sm text-muted-foreground">
          <InfoIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Verifikasi rekening belum bisa dijalankan: kredensial Payouts
            FurniTech belum diisi. Rekening tetap bisa disimpan, dan pencairan
            akan ditahan sampai verifikasi bisa dijalankan.
          </span>
        </p>
      ) : !fromService ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-sunken p-4 text-body-sm text-muted-foreground">
          <InfoIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Daftar bank memakai daftar cadangan internal, karena layanan
            sedang tidak bisa dihubungi. Kode bank yang salah akan ditolak
            saat verifikasi, bukan menyebabkan transfer ke bank yang keliru.
          </span>
        </p>
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "verified") return <Badge variant="settled">Terverifikasi</Badge>;
  if (status === "failed") return <Badge variant="failed">Ditolak bank</Badge>;
  return <Badge variant="pending">Belum diverifikasi</Badge>;
}
