import Link from "next/link";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { formatDateID, formatRupiah } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Direktori Tenant — FurniTech" };

type TenantRow = typeof tenants.$inferSelect;

/**
 * Direktori seluruh tenant (ROADMAP Sprint 2).
 *
 * RESPONSIF: tabel disembunyikan di bawah `md`, diganti daftar kartu. Direktori
 * sering dibuka admin dari HP saat sedang di luar kantor, jadi tampilan kartu
 * bukan opsional.
 *
 * Impersonate Login belum ada karena perlu desain soal audit trail dan masa
 * berlaku token lebih dulu.
 */
export default async function AdminTenantsPage() {
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-foreground">Direktori Tenant</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length} tenant terdaftar.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Belum ada tenant.
        </p>
      ) : (
        <>
          <ul className="mt-6 grid gap-3 md:hidden">
            {rows.map((t) => (
              <li key={t.id}>
                <TenantCard tenant={t} />
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Toko</th>
                  <th className="px-4 py-3 font-medium">Subdomain</th>
                  <th className="px-4 py-3 font-medium">Custom domain</th>
                  <th className="px-4 py-3 font-medium">Paket</th>
                  <th className="px-4 py-3 font-medium">Harga/bln</th>
                  <th className="px-4 py-3 font-medium">Berlaku sampai</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{t.name}</span>
                      {!t.isActive ? (
                        <span className="ml-2">
                          <Badge variant="failed">nonaktif</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      <Link
                        href={`/t/${t.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        /t/{t.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {t.customDomain ?? "—"}
                      {t.customDomain && !t.customDomainVerified ? (
                        <span className="ml-2">
                          <Badge variant="pending">belum diverifikasi</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize text-secondary">{t.plan}</td>
                    <td className="px-4 py-3 text-secondary">
                      {formatRupiah(PLANS[t.plan].priceMonthly)}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {formatDateID(t.subscriptionExpiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function TenantCard({ tenant }: { tenant: TenantRow }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{tenant.name}</p>
          <Link
            href={`/t/${tenant.slug}`}
            className="truncate text-sm text-primary hover:underline"
          >
            /t/{tenant.slug}
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={tenant.isActive ? "settled" : "failed"}>
            {tenant.plan}
          </Badge>
          {!tenant.isActive ? <Badge variant="failed">nonaktif</Badge> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Harga/bln</dt>
        <dd className="text-right font-medium text-foreground">
          {formatRupiah(PLANS[tenant.plan].priceMonthly)}
        </dd>

        <dt className="text-muted-foreground">Berlaku sampai</dt>
        <dd className="text-right text-secondary">
          {formatDateID(tenant.subscriptionExpiresAt)}
        </dd>

        <dt className="text-muted-foreground">Custom domain</dt>
        <dd className="truncate text-right text-secondary">
          {tenant.customDomain ?? "—"}
        </dd>
      </dl>

      {tenant.customDomain && !tenant.customDomainVerified ? (
        <p className="mt-2">
          <Badge variant="pending">belum diverifikasi</Badge>
        </p>
      ) : null}
    </div>
  );
}
