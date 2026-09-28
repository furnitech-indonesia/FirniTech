import { NextResponse } from "next/server";

import { and, eq, isNotNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { integrationAuditLogs, tenants } from "@/db/schema";
import { DOMAIN_ADDON, shouldSuspendDomain } from "@/lib/addons";
import { createDomainRenewal } from "@/lib/midtrans/addons";

/**
 * Cron harian untuk add-on domain: renewal + suspend.
 *
 * Kenapa cron dan bukan webhook:
 *
 * **Renewal** adalah tagihan yang harus terbit sendiri pada waktunya.
 * Kalau hanya terbit saat pengrajin menekan tombol, domain yang sudah
 * dibayar akan berhenti di tengah — dan satu-satunya cara memperbaruinya
 * adalah mengaktifkan tenant secara manual, satu per satu. Di 1.000 tenant
 * itu mustahil.
 *
 * **Suspend** adalah konsekuensi dari tagihan yang lewat, bukan dari satu
 * pembayaran yang gagal. Jadi bukanPeristiwa: yang memicu pembayaran gagal
 * adalah Midtrans (deny/expire), sedangkan yang memicu suspend adalah waktu
 * yang habis. Dua sebab berbeda, dua mekanisme berbeda.
 *
 * Kenapa suspend WAJIB ada, bukan fitur tambahan: tanpa suspend, domain
 * aktif yang tidak ditagih terus berjalan. 1.000 domain seperti itu memakan
 * Rp 188 juta per tahun — lebih besar dari seluruh laba add-on
 * (Rp 102 juta pada take-up 60%). Add-on yang tidak bisa menunda dirinya
 * sendiri berubah dari pendapatan menjadi beban.
 *
 * JALURAN: `vercel.json` mendaftarkan cron harian. Kalau `CRON_SECRET` belum
 * diisi, route tetap jalan di lokal; di produksi Vercel mengirim header
 * `Authorization: Bearer <CRON_SECRET>` dan route menolak tanpa itu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seberapa awal invoice renewal diterbitkan.
 *
 * 30 hari sebelum periode habis, supaya pengrajin punya waktu membayar
 * tanpa domain terputus.Dulu jaraknya 7 hari, hanya menyisakan
 * halaman pembayaran yang tidak sempat dibaca orang.
 */
const MUNDUR_RENEWAL_HARI = 30;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Tanpa secret, route hanya boleh jalan di luar produksi. Di produksi
  // tanpa CRON_SECRET, cron akan menolak sendiri — jadi membiarkan route
  // terbuka berarti siapa pun bisa memicu renewal untuk semua tenant.
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const now = new Date();
  const hasil = { renewal: 0, renewalGagal: 0, suspended: 0 };

  /*
   * ---------------------------------------------------------------
   * 1. SUSPEND: periode habis lebih dari 3 bulan lalu.
   * ---------------------------------------------------------------
   *
   * Dicek LEBIH DAHULU dari renewal. Urutannya penting: tenant yang
   * domainnya sudah lewat 3 bulan tidak boleh dibuat invoice renewal
   * untuk periode yang dimulai 4 bulan lalu.
   */
  const kandidatSuspend = await db
    .select({
      id: tenants.id,
      expiresAt: tenants.customDomainExpiresAt,
      domain: tenants.customDomain,
    })
    .from(tenants)
    .where(
      and(
        eq(tenants.customDomainStatus, "active"),
        isNotNull(tenants.customDomainExpiresAt),
      ),
    );

  for (const t of kandidatSuspend) {
    if (!shouldSuspendDomain(now, t.expiresAt)) continue;

    await db
      .update(tenants)
      .set({ customDomainStatus: "suspended", customDomainSuspendedAt: now })
      .where(eq(tenants.id, t.id));

    await db.insert(integrationAuditLogs).values({
      tenantId: t.id,
      service: "cloudflare",
      action: "domain_suspend",
      status: "success",
      requestMeta: {
        domain: t.domain,
        expiredAt: t.expiresAt?.toISOString() ?? null,
        graceMonths: DOMAIN_ADDON.suspendAfterMonths,
      },
    });

    hasil.suspended += 1;
  }

  /*
   * ---------------------------------------------------------------
   * 2. RENEWAL: periode habis dalam 30 hari ke depan.
   * ---------------------------------------------------------------
   */
  const batas = new Date(now);
  batas.setDate(batas.getDate() + MUNDUR_RENEWAL_HARI);

  const kandidatRenewal = await db
    .select({ id: tenants.id, expiresAt: tenants.customDomainExpiresAt })
    .from(tenants)
    .where(
      and(
        eq(tenants.customDomainStatus, "active"),
        isNotNull(tenants.customDomainExpiresAt),
        lte(tenants.customDomainExpiresAt, batas),
      ),
    );

  for (const t of kandidatRenewal) {
    // Yang sudah lewat 3 bulan sudah disuspend di langkah 1, jadi di sini
    // hanya periode yang masih dalam masa toleransi.
    if (shouldSuspendDomain(now, t.expiresAt)) continue;

    const result = await createDomainRenewal(t.id, now);
    if (result.ok) {
      hasil.renewal += 1;
      await db.insert(integrationAuditLogs).values({
        tenantId: t.id,
        service: "midtrans",
        action: "domain_renewal_invoice",
        status: "success",
        requestMeta: { expiresAt: t.expiresAt?.toISOString() ?? null },
      });
    } else {
      hasil.renewalGagal += 1;
      await db.insert(integrationAuditLogs).values({
        tenantId: t.id,
        service: "midtrans",
        action: "domain_renewal_invoice",
        status: "failed",
        errorMessage: result.error,
      });
    }
  }

  return NextResponse.json({ ok: true, ...hasil, at: now.toISOString() });
}
