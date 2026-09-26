import { desc } from "drizzle-orm";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { formatDateID, formatRupiah } from "@/lib/format";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Direktori Tenant — FurniTech" };

/**
 * Direktori seluruh tenant (ROADMAP Sprint 2): nama, slug, domain, paket, dan
 * periode langganan. Impersonate Login belum dibuat karena perlu desain dulu
 * soal audit trail dan masa berlaku token.
 */
export default async function AdminTenantsPage() {
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Direktori Tenant</h1>
      <p className="mt-1 text-sm text-slate-600">
        {rows.length} tenant terdaftar.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600">
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
              <tr key={t.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {t.name}
                  {!t.isActive ? (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                      nonaktif
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  /t/{t.slug}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {t.customDomain ?? "—"}
                  {t.customDomain && !t.customDomainVerified ? (
                    <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600">
                      belum diverifikasi
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{t.plan}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatRupiah(PLANS[t.plan].priceMonthly)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateID(t.subscriptionExpiresAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
