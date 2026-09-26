import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getTenantByHost, resolveHostFromHeaders } from "@/lib/tenants";

/**
 * Layout storefront per-tenant.
 *
 * proxy.ts me-rewrite SEMUA host non-platform ke /t/*, sehingga layout ini
 * adalah tempat tunggal untuk resolve tenant (subdomain ATAU custom domain).
 * Semua halaman di bawah /t otomatis ter-isolasi per tenant.
 */
export default async function TenantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const host = resolveHostFromHeaders(h);
  const tenant = await getTenantByHost(host);

  if (!tenant) {
    // Host tidak dikenal / tenant nonaktif → 404, bukan error 500.
    notFound();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-slate-900">
            {tenant.name}
          </span>
          <span className="material-symbols-outlined text-slate-700">
            storefront
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
