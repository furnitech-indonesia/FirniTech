import { NextResponse } from "next/server";

import { and, eq, isNotNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { integrationAuditLogs, tenants } from "@/db/schema";
import { DOMAIN_ADDON, shouldSuspendDomain } from "@/lib/addons";
import { createDomainRenewal } from "@/lib/midtrans/addons";
import { createSubscriptionRenewal } from "@/lib/midtrans/renewal";
import { RENEWAL_LEAD_DAYS, shouldIssueRenewal } from "@/lib/renewal";

/**
 * Cron harian: perpanjangan langganan + domain, dan suspend domain.
 *
 * Kenapa cron dan bukan webhook:
 *
 * **Renewal** adalah tagihan yang harus terbit sendiri pada waktunya.
 * Kalau hanya terbit saat pengrajin menekan tombol, langganan yang sudah
 * dibayar akan berhenti di tengah — dan satu-satunya cara memperbaruinya
 * adalah mengaktifkan tenant secara manual, satu per satu. Di 1.000 tenant
 * itu mustahil. Dan tidak ada tombol "perpanjang" di mana pun: kalau
 * perpanjangan bergantung pada orang yang mencari-cari halaman tagihan,
 * sebagian besar langganan akan berakhir tanpa pernah ditagih.
 *
 * **Suspend** adalah konsekuensi dari tagihan yang lewat, bukan dari satu
 * pembayaran yang gagal. Yang memicu pembayaran gagal adalah Midtrans
 * (deny/expire), sedangkan yang memicu suspend adalah waktu yang habis.
 * Dua sebab berbeda, dua mekanisme berbeda.
 *
 * Kenapa suspend WAJIB ada, bukan fitur tambahan: tanpa suspend, domain
 * aktif yang tidak ditagih terus berjalan. 1.000 domain seperti itu memakan
 * Rp 188 juta per tahun — lebih besar dari seluruh laba add-on. Add-on yang
 * tidak bisa menunda dirinya sendiri berubah dari pendapatan menjadi beban.
 *
 * JALURAN: `vercel.json` mendaftarkan cron harian. Kalau `CRON_SECRET` belum
 * diisi, route tetap jalan di lokal; di produksi Vercel mengirim header
 * `Authorization: Bearer <CRON_SECRET>` dan route menolak tanpa itu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Asal aplikasi dari Host request, dengan `x-forwarded-proto` diprioritaskan. */
function originRequest(request: Request): string {
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return fallback.replace(/\/+$/, "");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  /*
   * Asal aplikasi diteruskan ke fungsi penerbit tagihan, bukan dibaca di sana
   * lewat `headers()`. Alasannya ada di `createSubscriptionRenewal`: fungsi
   * yang diam-diam butuh request yang sedang berjalan tidak bisa diuji, dan
   * pesan kesalahannya tidak menyiratkan apa pun soal penyebabnya.
   *
   * `NEXT_PUBLIC_APP_URL` TIDAK dipakai sebagai sumber utama: ia di-inline
   * saat build, jadi satu build untuk lokal dan Vercel akan mengarahkan orang
   * ke domain yang tidak melayani tagihannya. Host request adalah satu-satunya
   * yang benar.
   */
  const origin = originRequest(request);
  const hasil = {
    // Invoice yang benar-benar terbit.
    langganan: 0,
    domain: 0,
    // Yang sudah punya tagihan hidup. NORMAL, bukan kegagalan — dipisahkan
    // supaya angka di sini tidak dipakai sebagai alarm.
    dilewati: 0,
    suspended: 0,
    // Yang benar-benar bermasalah. Kalau ini bukan nol, ada yang perlu
    // dilihat orang.
    gagal: 0,
  };

  /*
   * ---------------------------------------------------------------
   * 1. SUSPEND: periode domain habis lebih dari 3 bulan lalu.
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
   * 2. RENEWAL DOMAIN
   * ---------------------------------------------------------------
   */
  const kandidatDomain = await db
    .select({ id: tenants.id, expiresAt: tenants.customDomainExpiresAt })
    .from(tenants)
    .where(
      and(
        eq(tenants.customDomainStatus, "active"),
        isNotNull(tenants.customDomainExpiresAt),
        lte(tenants.customDomainExpiresAt, batas(now)),
      ),
    );

  for (const t of kandidatDomain) {
    // Yang sudah lewat 3 bulan sudah disuspend di langkah 1, jadi di sini
    // hanya periode yang masih dalam masa toleransi.
    if (!shouldIssueRenewal(now, t.expiresAt)) continue;
    if (shouldSuspendDomain(now, t.expiresAt)) continue;

    const result = await jalankan(() => createDomainRenewal(t.id, now, origin));
    await catatRenewal(t.id, "domain", result);
    if (result.ok) hasil.domain += 1;
    else if (result.reason === "sudah_ada") hasil.dilewati += 1;
    else hasil.gagal += 1;
  }

  /*
   * ---------------------------------------------------------------
   * 3. RENEWAL LANGGANAN
   * ---------------------------------------------------------------
   *
   * Tanpa ini, MRR hanya bisa turun: langganan berakhir pada tanggalnya dan
   * tidak ada yang pernah menerbitkan tagihan berikutnya. Klaim
   * "perpanjangan otomatis" di halaman harga jadi tidak berlaku untuk
   * pelanggan yang sudah ada.
   *
   * Hanya tenant `active` yang ikut. Tenant `pending` — yang tagihan
   * pendaftarannya belum dibayar — akan mendapat dua invoice untuk hal yang
   * sama, dan unique index `period_end` sekarang menolaknya (dengan benar),
   * artinya tagihan perpanjangannya hilang tanpa penjelasan.
   */
  const kandidatLangganan = await db
    .select({ id: tenants.id, expiresAt: tenants.subscriptionExpiresAt })
    .from(tenants)
    .where(
      and(
        eq(tenants.subscriptionStatus, "active"),
        isNotNull(tenants.subscriptionExpiresAt),
        lte(tenants.subscriptionExpiresAt, batas(now)),
      ),
    );

  for (const t of kandidatLangganan) {
    if (!shouldIssueRenewal(now, t.expiresAt)) continue;

    const result = await jalankan(() =>
      createSubscriptionRenewal(t.id, now, origin),
    );
    await catatRenewal(t.id, "subscription", result);
    if (result.ok) hasil.langganan += 1;
    else if (result.reason === "sudah_ada") hasil.dilewati += 1;
    else if (result.reason === "belum_lunas") hasil.dilewati += 1;
    else hasil.gagal += 1;
  }

  return NextResponse.json({ ok: true, ...hasil, at: now.toISOString() });
}

/**
 * Batas atas jendela perpanjangan, dalam bentuk yang bisa dipakai `lte`.
 *
 * 30 hari sebelum periode habis. Angkanya TIDAK ditulis di sini:
 * `RENEWAL_LEAD_DAYS` di `src/lib/renewal.ts` adalah satu-satunya
 * sumbernya, karena nilai yang sama dipakai untuk menghitung "jatuh tempo
 * dalam N hari" yang tampil di halaman tagihan -- dan dua angka yang
 * berbeda di dua tempat akan menampilkan tanggal yang tidak cocok dengan
 * tagihan yang benar-benar terbit.
 */
function batas(now: Date): Date {
  const b = new Date(now);
  b.setUTCDate(b.getUTCDate() + RENEWAL_LEAD_DAYS);
  return b;
}

/**
 * Jalankan satu pekerjaan tanpa membiarkan exception-nya menghentikan loop.
 *
 * INI BUKAN defensif yang berlebihan — ini yang mencegah kegagalan satu
 * tenant menjadi kegagalan seribu tenant.
 *
 * `createDomainRenewal` versi pertama melempar apa adanya ketika unique
 * index menolak insert kedua. Karena cron berjalan harian dengan jendela
 * 30 hari, panggilan kedua itu PASTI terjadi pada setiap tenant — jadi
 * tenant pertama yang terkena akan melempar, `GET` berakhir dengan 500, dan
 * semua tenant setelahnya di list itu tidak pernah ditagih. Yang terlihat
 * hanyalah satu baris di log cron, dan tidak ada yang mengaitkan
 * tagihan yang hilang dengan penyebabnya.
 */
async function jalankan<T>(fn: () => Promise<T>): Promise<
  T | { ok: false; reason: string; error: string }
> {
  try {
    return await fn();
  } catch (error) {
    const pesan = (error as Error).message.slice(0, 300);
    console.error("Pekerjaan perpanjangan melempar exception:", pesan);
    return { ok: false, reason: "exception", error: pesan };
  }
}

/** Tulis jejak audit untuk setiap percobaan, berhasil maupun tidak. */
async function catatRenewal(
  tenantId: string,
  jenis: "domain" | "subscription",
  result:
    | { ok: true }
    | { ok: false; reason?: string; error: string },
): Promise<void> {
  if (result.ok) {
    await db.insert(integrationAuditLogs).values({
      tenantId,
      service: "midtrans",
      action:
        jenis === "domain" ? "domain_renewal_invoice" : "subscription_renewal_invoice",
      status: "success",
    });
    return;
  }

  // "Sudah ada" dicatat sebagai sukses dengan alasan, bukan kegagalan.
  // Kalau tidak, log akan berisi ratusan baris "gagal" setiap hari yang
  // semuanya kondisi normal — dan alarm yang selalu berbunyi tidak pernah
  // didengarkan.
  await db.insert(integrationAuditLogs).values({
    tenantId,
    service: "midtrans",
    action:
      jenis === "domain" ? "domain_renewal_invoice" : "subscription_renewal_invoice",
    status: result.reason === "sudah_ada" ? "success" : "failed",
    requestMeta: result.reason ? { reason: result.reason } : undefined,
    errorMessage: result.reason === "sudah_ada" ? null : result.error,
  });
}
