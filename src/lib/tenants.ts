import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { ROOT_DOMAIN } from "./tenant-host";

/**
 * Lookup tenant berdasarkan host.
 *
 * `cache()` dari React memastikan lookup hanya dieksekusi SATU KALI per
 * request walau dipanggil dari banyak komponen (proxy, layout, page).
 *
 * Custom domain hanya dipercaya bila customDomainVerified = true — Cloudflare
 * for SaaS harus lebih dulu memverifikasi CNAME-nya.
 */

export type ResolvedTenant = typeof tenants.$inferSelect;

export const getTenantByHost = cache(
  async (host: string): Promise<ResolvedTenant | null> => {
    const hostname = host.toLowerCase();

    const subdomain = hostname.endsWith(`.${ROOT_DOMAIN}`)
      ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
      : null;

    // Jalur 1: subdomain bawaan -> tenants.slug
    if (subdomain && !subdomain.includes(".")) {
      const [row] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, subdomain))
        .limit(1);
      return row ?? null;
    }

    // Jalur 2: custom domain terverifikasi -> tenants.custom_domain
    if (hostname && hostname !== ROOT_DOMAIN) {
      const [row] = await db
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.customDomain, hostname),
            eq(tenants.customDomainVerified, true),
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
