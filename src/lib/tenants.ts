import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { ROOT_DOMAIN } from "./tenant-host";

/**
 * Lookup tenant.
 *
 * `cache()` dari React memastikan lookup hanya dieksekusi SATU KALI per
 * request walau dipanggil dari banyak komponen (layout, page, sub-component).
 *
 * Custom domain hanya dipercaya bila customDomainVerified = true — Cloudflare
 * for SaaS harus lebih dulu memverifikasi CNAME-nya.
 *
 * `isActive = true` di kedua query di bawah, dan itu disengaja: tenant yang
 * baru mendaftar tapi belum membayar (`subscriptionStatus = pending`,
 * `isActive = false`) tidak boleh punya toko publik. Tanpa filter ini, satu
 * tenant yang belum transfer pun akan tampil begitu daftarnya masuk.
 * Back-office-nya ditahan terpisah di app/dashboard/layout.tsx; halaman
 * publik cukup 404 di sini.
 */

export type ResolvedTenant = typeof tenants.$inferSelect;

export const getTenantBySlug = cache(
  async (slug: string): Promise<ResolvedTenant | null> => {
    const [row] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.slug, slug.toLowerCase()),
          eq(tenants.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  },
);

export const getTenantByHost = cache(
  async (host: string): Promise<ResolvedTenant | null> => {
    const hostname = host.toLowerCase();

    if (!hostname) return null;

    // Jalur 1: subdomain bawaan -> tenants.slug (butuh root domain).
    if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
      if (subdomain && !subdomain.includes(".")) {
        return getTenantBySlug(subdomain);
      }
    }

    // Jalur 2: custom domain terverifikasi -> tenants.custom_domain
    if (hostname !== ROOT_DOMAIN) {
      const [row] = await db
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.customDomain, hostname),
            eq(tenants.customDomainVerified, true),
            eq(tenants.isActive, true),
          ),
        )
        .limit(1);
      return row ?? null;
    }

    return null;
  },
);

/** Host dari header yang dipasang proxy.ts, dengan fallback ke URL request. */
export function resolveHostFromHeaders(
  headers: Headers,
  fallbackUrl?: string,
): string {
  const fromProxy = headers.get("x-tenant-host");
  if (fromProxy) return fromProxy;
  if (fallbackUrl) {
    try {
      return new URL(fallbackUrl).hostname;
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Resolusi tenant untuk satu request, dengan urutan prioritas:
 *
 *   1. Header `x-tenant-slug` — proxy.ts sudah me-resolve subdomain tenant.
 *   2. Segmen path pertama setelah `/t/` — mode path-based, dipakai selama
 *      domain raíz belum ada (hosting Vercel `*.vercel.app`).
 *   3. Custom domain terverifikasi — dipakai saat proxy me-rewrite host
 *      yang bukan subdomain dari root domain.
 *
 * Mode path-based AKTIF selama NEXT_PUBLIC_ROOT_DOMAIN kosong; setelah domain
 * tersedia, host-based routing take over dan path `/t/<slug>` tetap bisa
 * dipakai sebagai tautan cadangan.
 */
export async function resolveTenantForRequest(
  headers: Headers,
  pathSlug?: string[],
): Promise<ResolvedTenant | null> {
  const slugFromProxy = headers.get("x-tenant-slug");
  if (slugFromProxy) {
    return getTenantBySlug(slugFromProxy);
  }

  const firstSegment = pathSlug?.[0];
  if (firstSegment) {
    return getTenantBySlug(firstSegment);
  }

  return getTenantByHost(resolveHostFromHeaders(headers));
}
