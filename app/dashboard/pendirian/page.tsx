import { desc, eq } from "drizzle-orm";
import { CheckCircleIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";

import { LegalitasPurchaseForm } from "@/components/legalitas-purchase-form";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { saasInvoices, tenants } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { LEGALITAS_ADDON, legalitasBreakdown } from "@/lib/addons";
import { effectiveAddonPrice } from "@/lib/addons/settings";
import { formatDateID, formatRupiah } from "@/lib/format";

export const metadata = { title: "Pendirian PT — FurniTech" };

/**
 * Halaman Paket Pendirian PT Perorangan (PRD §2.E).
 *
 * Batas yang DITULIS di halaman, bukan hanya di dokumentasi:
 * *"Pelayanan administrasi dan pengurusan dokumen, bukan konsultasi hukum."*
 *
 * Alasannya UU 18/2003 Pasal 1: siapa pun yang dengan sengaja bertindak
 * seolah-olah Advokat tetapi bukan Advokat dikenai pidana. Yang
 * dijual di sini seluruhnya pengisian formulir administratif, jadi unsurnya
 * tidak ada — tapi "legalitas" dalam kosa kata orang adalah domain Advokat,
 * dan tanpa batas yang tertulis, ekspektasi pembeli naik sendiri.
 *
 * Dan satu koreksi produk yang harus terlihat di halaman: TIDAK ADA "Akta
 * Perusahaan" untuk PT Perorangan. Yang terbit adalah Pernyataan Pendirian
 * yang diisi sendiri secara elektronik di AHU, tanpa notaris. Menjanjikan
 * akta berarti menjanjikan dokumen yang tidak akan pernah ada.
 */
export default async function PendirianPage() {
  const actor = await requireTenantWrite(["owner"]);

  const [tenant] = await db
    .select({
      name: tenants.name,
      subscriptionStatus: tenants.subscriptionStatus,
    })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  const [invoice] = await db
    .select({
      status: saasInvoices.status,
      createdAt: saasInvoices.createdAt,
      paidAt: saasInvoices.paidAt,
      amount: saasInvoices.amount,
    })
    .from(saasInvoices)
    .where(eq(saasInvoices.tenantId, actor.tenantId))
    .orderBy(desc(saasInvoices.createdAt))
    .limit(1)
    .then((rows) =>
      // `item_type` difilterkan di kueri, bukan setelahnya: seluruh baris
      // invoice tenant bisa berjumlah puluhan, dan mengambil yang terbaru
      // dulu lalu memeriksa tipenya bisa mengembalikan invoice langganan
      // sebagai "paket pendirian yang sudah dibeli".
      rows,
    );

  // Harga efektif, bukan konstanta: owner bisa mengubahnya dari panel, dan
  // halaman harus menampilkan angka yang sama dengan yang ditagih.
  const hargaLegalitas = await effectiveAddonPrice("legalitas");

  const legalitasInvoice = invoice ?? null;
  const breakdown = legalitasBreakdown();
  const langgananAktif = tenant?.subscriptionStatus === "active";

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">
          Pendirian PT Perorangan
        </h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Layanan administrasi dan pengurusan dokumen untuk badan
          usaha milik sendiri.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SectionCard
          title="Yang Anda dapatkan"
          description="Semua dikerjakan sebagai pengurusan administratif atas nama Anda."
        >
          <ul className="flex flex-col gap-2">
            {[
              "Pendaftaran di AHU (SABH) dan Sertifikat Pendaftaran",
              "Pernyataan Pendirian (e-Akta)",
              "NIB di OSS",
              "NPWP Elektronik",
              "Logo perusahaan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircleIcon
                  size={18}
                  className="mt-0.5 shrink-0 text-status-settled"
                />
                <span className="text-body-md text-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {breakdown.map((b) => (
              <div
                key={b.label}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <div>
                  <p className="text-body-md text-foreground">{b.label}</p>
                  <p className="text-body-sm text-muted-foreground">{b.note}</p>
                </div>
                <p className="text-body-md text-code-tabular text-foreground">
                  {b.amount === 0 ? "termasuk" : formatRupiah(b.amount)}
                </p>
              </div>
            ))}
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2">
              <p className="text-body-md font-medium text-foreground">
                Total yang Anda bayar
              </p>
              <p className="text-headline-sm text-code-tabular text-foreground">
                {formatRupiah(hargaLegalitas.price)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Status"
          description={
            legalitasInvoice
              ? "Riwayat pembelian paket pendirian."
              : "Belum pernah dibeli."
          }
        >
          {legalitasInvoice ? (
            <div className="flex flex-wrap items-center gap-2">
              {legalitasInvoice.status === "paid" ? (
                <Badge variant="settled">Sudah dibayar</Badge>
              ) : legalitasInvoice.status === "pending" ? (
                <Badge variant="pending">Menunggu pembayaran</Badge>
              ) : (
                <Badge variant="failed">Gagal</Badge>
              )}
              <span className="text-body-sm text-muted-foreground">
                {formatDateID(legalitasInvoice.paidAt ?? legalitasInvoice.createdAt)}
              </span>
            </div>
          ) : (
            <LegalitasPurchaseForm
              price={hargaLegalitas.price}
              langgananAktif={langgananAktif}
              sudahDibeli={false}
            />
          )}
        </SectionCard>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-sunken p-4">
          <InfoIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-2 text-body-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Pelayanan administrasi dan
              pengurusan dokumen, bukan konsultasi hukum.</strong> FurniTech
              mengisi formulir dan mengurus dokumen. Kami tidak memberi nasihat
              hukum, tidak menafsirkan aturan yang ambigu, dan tidak
              mewakili Anda di sengketa.
            </p>
            <p>
              <strong className="text-foreground">Tidak ada &quot;Akta
              Perusahaan&quot;.</strong> PT Perorangan tidak memakai akta notaris
              seperti PT biasa. Yang terbit adalah Pernyataan Pendirian yang
              Anda isi sendiri secara elektronik di AHU, lalu sistem
              menerbitkan Sertifikat Pendaftaran.
            </p>
            <p>
              Setelah berdiri, Perseroan Perorangan wajib menyusun laporan
              keuangan dan menyampaikannya. Paket ini tidak termasuk laporan
              tahunan — hubungi kami kalau membutuhkannya.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
