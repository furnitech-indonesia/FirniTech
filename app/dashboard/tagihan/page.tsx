import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

import { SectionCard } from "@/components/panels";
import {
  InvoiceHistory,
  PendingInvoices,
} from "@/components/billing-invoices";
import { requireSession } from "@/lib/auth/session";
import { loadBillingNotice, loadInvoiceHistory } from "@/lib/billing/notice";
import { RENEWAL_LEAD_DAYS, daysUntil } from "@/lib/renewal";
import { formatDateID, formatNumber } from "@/lib/format";

export const metadata = { title: "Tagihan — FurniTech" };

/**
 * Halaman tagihan pengrajin (Sprint 6).
 *
 * Inilah "notifikasi" untuk pengrajin: tagihan perpanjangan terbit dari cron,
 * dan sebelum halaman ini ada tidak ada tempat yang bisa dilihat untuk
 * mengetahuinya. Alasannya bukan kekurangan fitur -- lihat catatan kanal di
 * `src/lib/billing/notice.ts`.
 *
 * Halaman ini menampilkan SEMUA jenis tagihan, bukan hanya yang menunggu.
 * Halaman yang hanya menampilkan yang belum lunas akan membuat orang mengira
 * FurniTech tidak punya catatan -- dan ketika sebuah tagihan lunas tanpa
 * sengaja, tidak ada tempat untuk memeriksanya.
 *
 * Satu-satuinya tempat `tenantId` dibaca adalah dari Sesi, tidak pernah dari
 * URL. Klien Drizzle adalah user postgres yang melewati RLS, jadi penyaring
 * `tenant_id` di kueri adalah satu-satunya penahan; relied on `requireSession`
 * untuk itu, bukan pada halaman yang memfilter.
 */
export default async function BillingPage() {
  const session = await requireSession("/dashboard/tagihan");
  const tenantId = session.tenantId;

  if (!tenantId) {
    // Super admin sudah diarahkan oleh layout dashboard, tapi jangan
    // andalkan itu: halaman ini bisa dipanggil langsung lewat URL.
    return (
      <main id="konten-utama" className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <p className="text-body-md text-muted-foreground">
          Halaman ini hanya untuk pemilik toko.
        </p>
      </main>
    );
  }

  const [notif, rows, tenant] = await Promise.all([
    loadBillingNotice(tenantId),
    loadInvoiceHistory(tenantId),
    db
      .select({
        expiresAt: tenants.subscriptionExpiresAt,
        domain: tenants.customDomain,
        domainExpiresAt: tenants.customDomainExpiresAt,
        domainStatus: tenants.customDomainStatus,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const sisaLangganan = daysUntil(new Date(), tenant?.expiresAt ?? null);
  const sisaDomain = daysUntil(new Date(), tenant?.domainExpiresAt ?? null);

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Tagihan</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Semua tagihan FurniTech untuk toko Anda, beserta masa berlakunya.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <PendingInvoices invoices={notif.pending} />

        <SectionCard
          title="Masa berlaku"
          description="Tagihan perpanjangan terbit otomatis sebelum periode di bawah habis."
        >
          <dl className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-body-md text-muted-foreground">
                Langganan berakhir
              </dt>
              <dd className="text-body-md text-foreground">
                {tenant?.expiresAt ? formatDateID(tenant.expiresAt) : "—"}
                {sisaLangganan !== null ? (
                  <span
                    className={
                      sisaLangganan <= RENEWAL_LEAD_DAYS
                        ? "ml-2 text-body-sm text-status-pending"
                        : "ml-2 text-body-sm text-muted-foreground"
                    }
                  >
                    {sisaLangganan > 0
                      ? `${formatNumber(sisaLangganan)} hari lagi`
                      : "sudah lewat"}
                  </span>
                ) : null}
              </dd>
            </div>
            {/*
             * Domain ditampilkan hanya kalau tokonya memang memakainya.
             * Baris "tidak ada domain" untuk 80% pengrajin yang tidak
             *bergerak menambah kebisingan tanpa menambah informasi.
             */}
            {tenant?.domain ? (
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
                <dt className="text-body-md text-muted-foreground">
                  Domain {tenant.domain}
                </dt>
                <dd className="text-body-md text-foreground">
                  {tenant.domainExpiresAt
                    ? formatDateID(tenant.domainExpiresAt)
                    : "belum dibayar"}
                  {sisaDomain !== null ? (
                    <span className="ml-2 text-body-sm text-muted-foreground">
                      {sisaDomain > 0
                        ? `${formatNumber(sisaDomain)} hari lagi`
                        : "sudah lewat"}
                    </span>
                  ) : null}
                  {tenant.domainStatus === "suspended" ? (
                    <span className="ml-2 text-body-sm text-status-failed">
                      · ditangguhkan
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>

        <SectionCard
          title="Riwayat tagihan"
          description="Termasuk tagihan yang sudah lunas."
          bare
        >
          <div className="p-4">
            <InvoiceHistory rows={rows} />
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
