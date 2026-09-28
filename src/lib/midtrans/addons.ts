import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import {
  DOMAIN_ADDON,
  LEGALITAS_ADDON,
  ORDER_ID_PREFIX,
  nextDomainPeriod,
} from "@/lib/addons";
import { createSaasCharge } from "./saas";
import { getRequestHost } from "@/lib/tenant-host";

/**
 * Pembuatan tagihan add-on: custom domain dan paket pendirian PT.
 *
 * Berdiri sendiri dari `saas.ts` karena dua alasan, keduanya soal bentuk
 * tagihan:
 *
 * 1. **Tagihan domain bergantung pada `tenants`, bukan pada FormData.**
 *    Harga, tenant, dan periode semuanya dibaca dari database. Kalau harga
 *    datang dari klien, orang bisa membeli domain seharga satu rupiah --
 *    dan karena marjinnya Rp 61.333 per invoice, itu bukan bug kecil: satu
 *   saja cukup untuk menutup seluruh laba add-on dalam 4,2 tahun.
 *
 * 2. **Tagihan legalitas tidak punya paket.** `saasInvoices.plan` nullable
 *    supaya baris ini tidak perlu mengarang "paket basic" demi memenuhi
 *    kolom yang tadinya NOT NULL.
 */

export type CreateAddonResult =
  | { ok: true; redirectTo: string; amount: number; invoiceId: string }
  | { ok: false; error: string };

/**
 * Origin dari Host request.
 *
 * `NEXT_PUBLIC_APP_URL` di-inline saat build, jadi satu build untuk lokal
 * dan Vercel akan mengarahkan orang ke domain yang tidak melayani
 * tagihannya -- pola yang sama sudah pernah jadi bug di `createCheckoutOrder`.
 */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const host = getRequestHost(h, fallback);
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * `dom-<tenant>-<timestamp>` atau `leg-<tenant>-<timestamp>`.
 *
 * Tanda hubung setelah prefix itu WAJIB dan bukan gaya penulisan: webhook
 * mengenali jenis tagihan dengan `orderId.startsWith(prefix)`, dan prefix
 * `leg-` yang ditulis sebagai `leg` tidak akan cocok dengan apa pun.
 * Versi pertama menulis `${prefix}${tenantId}` dan hasilnya `leg5f64b9f7-`,
 * yang `startsWith("leg-")` bernilai FALSE -- jadi setiap invoice legalitas
 * diam-diam jatuh ke cabang langganan dan memberi satu tahun gratis.
 * `test:addons` menangkapnya, tapi hanya karena ia mengirim orderId yang
 * benar-benar terpotret dari kode.
 */
function addonOrderId(prefix: string, tenantId: string, now: Date): string {
  return `${prefix}-${tenantId.slice(0, 8)}-${now.getTime()}`;
}

/* ------------------------------------------------------------------ *
 * Add-on custom domain
 * ------------------------------------------------------------------ */

export async function createDomainInvoice(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string | null;
  finishUrl: string;
}): Promise<CreateAddonResult> {
  const [tenant] = await db
    .select({
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, input.tenantId))
    .limit(1);

  if (!tenant?.customDomain) {
    return { ok: false, error: "Domain belum diatur untuk toko ini." };
  }
  if (!tenant.customDomainVerified) {
    return {
      ok: false,
      error: "Domain belum terverifikasi. Atur DNS dulu sebelum membayar.",
    };
  }

  const now = new Date();
  const period = nextDomainPeriod(now, tenant.customDomainExpiresAt);
  const orderId = addonOrderId(ORDER_ID_PREFIX.domain, input.tenantId, now);

  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: input.tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: orderId,
      periodStart: toDate(period.start),
      periodEnd: toDate(period.end),
    })
    .returning();

  const charge = await createSaasCharge({
    orderId,
    amount: DOMAIN_ADDON.price,
    customerName: input.tenantName,
    customerEmail: input.email,
    customerPhone: input.phone,
    itemName: `Custom domain ${tenant.customDomain} (12 bulan)`,
    finishUrl: input.finishUrl,
  });

  return {
    ok: true,
    redirectTo: charge.redirectUrl,
    amount: DOMAIN_ADDON.price,
    invoiceId: invoice.id,
  };
}

/* ------------------------------------------------------------------ *
 * Add-on Paket Pendirian PT Perorangan
 * ------------------------------------------------------------------ */

export async function createLegalitasInvoice(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string | null;
  finishUrl: string;
}): Promise<CreateAddonResult> {
  const now = new Date();
  const orderId = addonOrderId(ORDER_ID_PREFIX.legalitas, input.tenantId, now);

  // Sekali bayar: periode = satu hari. `period_end` wajib NOT NULL, dan
  // memberikan periode 12 bulan di sini akan membuat webhook yang salah
  // terlihat benar -- bukan itu yang kita mau.
  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: input.tenantId,
      itemType: "legalitas",
      plan: null,
      period: "monthly",
      amount: LEGALITAS_ADDON.price,
      status: "pending",
      midtransOrderId: orderId,
      periodStart: toDate(now),
      periodEnd: toDate(now),
    })
    .returning();

  const charge = await createSaasCharge({
    orderId,
    amount: LEGALITAS_ADDON.price,
    customerName: input.tenantName,
    customerEmail: input.email,
    customerPhone: input.phone,
    itemName: "Paket Pendirian PT Perorangan",
    finishUrl: input.finishUrl,
  });

  return {
    ok: true,
    redirectTo: charge.redirectUrl,
    amount: LEGALITAS_ADDON.price,
    invoiceId: invoice.id,
  };
}

/* ------------------------------------------------------------------ *
 * Renewal domain (dipanggil cron)
 * ------------------------------------------------------------------ */

/**
 * Buat invoice perpanjangan untuk satu tenant.
 *
 * Sengaja accepts `now` supaya bisa diuji tanpa menunggu tanggal tertentu.
 */
export async function createDomainRenewal(
  tenantId: string,
  now: Date,
): Promise<CreateAddonResult> {
  const [tenant] = await db
    .select({
      name: tenants.name,
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.customDomain || !tenant.customDomainVerified) {
    return { ok: false, error: "Domain tidak bisa diperpanjang." };
  }

  // `period_start` untuk renewal adalah periode yang SEHARUSNYA berakhir --
  // bukan hari invoice dibuat. Kalau invoice terbit 20 hari sebelum periode
  // habis dan periode barunya dihitung dari `now`, pengrajin kehilangan 20
  // hari yang sudah dibayar. `nextDomainPeriod` sudah menangani keduanya:
  // lanjut dari periode lama kalau masih berjalan, mulai dari `now` kalau
  // sudah lewat.
  const period = nextDomainPeriod(now, tenant.customDomainExpiresAt);
  const orderId = addonOrderId(ORDER_ID_PREFIX.domain, tenantId, now);

  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: orderId,
      periodStart: toDate(period.start),
      periodEnd: toDate(period.end),
    })
    .returning();

  const [owner] = await db
    .select({ fullName: users.fullName, email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "owner")))
    .limit(1);

  const origin = await appOrigin();
  const charge = await createSaasCharge({
    orderId,
    amount: DOMAIN_ADDON.price,
    customerName: owner?.fullName ?? tenant.name,
    customerEmail: owner?.email ?? "admin@furnitech.id",
    customerPhone: owner?.phone ?? null,
    itemName: `Perpanjangan domain ${tenant.customDomain}`,
    finishUrl: `${origin}/dashboard/pengaturan/domain`,
  });

  return {
    ok: true,
    redirectTo: charge.redirectUrl,
    amount: DOMAIN_ADDON.price,
    invoiceId: invoice.id,
  };
}

function toDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
