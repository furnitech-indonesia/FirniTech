import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { TenantShell } from "@/components/tenant-shell";
import { resolveTenantForRequest } from "@/lib/tenants";

/**
 * Placeholder storefront per-tenant. Sprint 5 akan menggantinya dengan
 * katalog + kalkulasi ongkir + checkout Midtrans.
 *
 * Di sinilah tenant di-resolve, karena hanya page yang menerima `params`
 * segmen `[[...slug]]` (layout tidak menerimanya). Resolusi di-cache lewat
 * React cache() di src/lib/tenants.ts, jadi satu request = satu query.
 */
export default async function TenantHome({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const tenant = await resolveTenantForRequest(h, slug);

  if (!tenant) {
    // Tenant tidak dikenal / tidak aktif → 404, bukan error 500.
    notFound();
  }

  // Dalam mode host-based, segmen pertama adalah path storefront (mis.
  // "produk"), bukan slug tenant — slug sudah datang dari header proxy.
  const rest = h.get("x-tenant-slug") ? slug : slug?.slice(1);

  return (
    <TenantShell name={tenant.name} plan={tenant.plan}>
      <main id="konten-utama" className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
        <p className="mt-1 text-secondary">
          Tenant: <code>{tenant.slug}</code> · paket{" "}
          <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
            {tenant.plan}
          </span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Path: <code>/{rest?.join("/") ?? ""}</code> — katalog, ongkir otomatis,
          dan checkout Midtrans menyusul di Sprint 5.
        </p>
      </main>
    </TenantShell>
  );
}
