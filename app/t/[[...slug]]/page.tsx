import { headers } from "next/headers";

import { resolveHostFromHeaders, getTenantByHost } from "@/lib/tenants";

/**
 * Placeholder storefront per-tenant. Sprint 5 akan menggantinya dengan
 * katalog + kalkulasi ongkir + checkout Midtrans.
 */
export default async function TenantHome({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const tenant = await getTenantByHost(resolveHostFromHeaders(h));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">
        {tenant?.name ?? "Storefront"}
      </h1>
      <p className="mt-1 text-slate-700">
        Tenant: <code>{tenant?.slug}</code> · paket{" "}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
          {tenant?.plan}
        </span>
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Path: <code>/{slug?.join("/") ?? ""}</code> — katalog, ongkir otomatis, dan
        checkout Midtrans menyusul di Sprint 5.
      </p>
    </main>
  );
}
