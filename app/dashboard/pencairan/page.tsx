import { eq } from "drizzle-orm";
import { MoneyIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { PayoutButton } from "@/components/payout-button";
import { EmptyState } from "@/components/panels";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { tenantBankAccounts } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { formatDateID, formatRupiah } from "@/lib/format";
import { FEE_PENCAIRAN } from "@/lib/fees";
import { isPayoutsConfigured } from "@/lib/midtrans/payouts";
import { listPayouts, previewPayout } from "@/lib/payouts";
import { PAYOUT_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Pencairan — FurniTech" };

/**
 * Halaman pencairan untuk owner (Sprint 6).
 *
 * TIGA HAL YANG DITAMPILKAN, dan tidak ada keempatnya:
 *
 *  1. ANGKANYA, sebelum tombol ditekan. Ini satu-satunya tempat di aplikasi
 *     di mana uang benar-benar keluar dari platform, jadi nominalnya harus
 *     terlihat lebih dulu.
 *  2. FEE-nya, terpisah dari nominal. Rp5.550 dipotong saat pencairan dan
 *     Rp4.440 saat pesanan lunas — menjadikannya satu angka total membuat
 *     pengrajin salah menghitung kapan saldonya masih utuh.
 *  3. APA YANG TERTAHAN, kalau ada. Payout yang `failed` atau `blocked`
 *     ditampilkan lengkap dengan alasannya, karena "Rp900.000 belum sampai"
 *     tanpa penjelasan adalah sumber kecemasan yang tidak perlu.
 *
 * Yang TIDAK ada: tombol hapus, tombol "batalkan", dan nominal yang bisa
 * diedit. Payout adalah dokumen; setelah terkirim, riwayatnya adalah yang
 * terjadi.
 */
export default async function PayoutPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan"]);

  const [bank] = await db
    .select()
    .from(tenantBankAccounts)
    .where(eq(tenantBankAccounts.tenantId, actor.tenantId))
    .limit(1);

  const preview = await previewPayout(actor.tenantId);
  const history = await listPayouts(actor.tenantId);
  const configured = isPayoutsConfigured();
  const isOwner = actor.role === "owner";

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Pencairan</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Uang dari pesanan yang sudah lunas dan barangnya sudah diterima
          dikirim ke rekening Anda.
        </p>
      </header>

      {/*
        rekening DITAMPILKAN di atas, bukan disembunyikan di pengaturan.
        Orang yang akan/cair uangnya perlu tahu rekening mana yang jadi
        tujuan, dan "mengimana kalau ternyata tujuan ini yang salah?" adalah
        pertanyaan yang harus dijawab di halaman tempat uang keluar, bukan
        tiga klik lagi.
      */}
      <SectionCard
        title="Rekening tujuan"
        description={
          bank
            ? "Semua pencairan dikirim ke rekening ini."
            : "Belum diisi — pencairan tidak bisa jalan sebelum ada rekening."
        }
      >
        {bank ? (
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <MoneyIcon size={18} weight="light" aria-hidden />
              <span className="text-title-md text-foreground">
                {bank.bankName}
              </span>
              <BankStatusBadge status={bank.status} />
            </div>
            <p className="text-code-tabular text-body-md text-foreground">
              {bank.accountNumber}
            </p>
            <p className="text-body-sm text-muted-foreground">
              atas nama {bank.accountName}
            </p>
            {bank.status !== "verified" ? (
              <p className="mt-2 flex items-start gap-2 text-body-sm text-muted-foreground">
                <WarningIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Rekening belum terverifikasi, jadi pencairan ditahan sampai
                  verifikasi selesai di Pengaturan → Rekening pencairan.
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState message="Rekening pencairan belum diisi." />
        )}
      </SectionCard>

      <div className="mt-4">
        <SectionCard
          title="Siap dicairkan"
          description={`Fee pencairan ${formatRupiah(FEE_PENCAIRAN)} dipotong satu kali per pencairan, bukan per pesanan.`}
        >
          {isOwner ? (
            <PayoutButton
              net={preview.net}
              fee={preview.fee}
              orderCount={preview.candidates.length}
            />
          ) : (
            <p className="text-body-md text-muted-foreground">
              Hanya owner yang bisa menjalankan pencairan. Riwayat lengkapnya
              ada di bawah.
            </p>
          )}

          {!configured ? (
            <p className="mt-3 flex items-start gap-2 text-body-sm text-muted-foreground">
              <WarningIcon size={16} weight="light" className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Layanan pencairan FurniTech belum dikonfigurasi, jadi
                pencairan belum bisa dijalankan.
              </span>
            </p>
          ) : null}
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Riwayat"
          description="Setiap pencairan dan apa yang menutupinya."
        >
          {history.length === 0 ? (
            <EmptyState message="Belum ada pencairan." />
          ) : (
            <ul className="grid gap-3">
              {history.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-code-tabular text-title-md text-foreground">
                      {formatRupiah(p.amount)}
                    </p>
                    <Badge variant={statusVariant(p.status)}>
                      {PAYOUT_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {p.orderCount} pesanan · {formatDateID(p.createdAt)} ·{" "}
                    {p.bankName} {p.bankAccountNumber}
                  </p>
                  {p.errorMessage ? (
                    <p className="mt-2 text-body-sm text-destructive">
                      {p.errorMessage}
                    </p>
                  ) : null}
                  {p.irisReferenceId ? (
                    <p className="mt-1 text-code-tabular text-body-sm text-muted-foreground">
                      Ref {p.irisReferenceId}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </main>
  );
}

function statusVariant(
  status: string,
): "settled" | "failed" | "pending" | "production" {
  if (status === "success") return "settled";
  if (status === "failed") return "failed";
  if (status === "blocked") return "failed";
  return "pending";
}

function BankStatusBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge variant="settled">Terverifikasi</Badge>;
  if (status === "failed") return <Badge variant="failed">Ditolak bank</Badge>;
  return <Badge variant="pending">Belum diverifikasi</Badge>;
}
