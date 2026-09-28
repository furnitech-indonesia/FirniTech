"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { getRequestHost } from "@/lib/tenant-host";

/**
 * Pembelian add-on: custom domain `.com` dan Paket Pendirian PT Perorangan.
 *
 * Dua aturan yang mengikat SELURUH isi berkas ini, dan keduanya berasal dari
 * dokumen proyeksi, bukan dari selera:
 *
 * 1. **Invoice hanya boleh dibuat setelah yang ditagih sudah nyata.** Domain:
 *    `customDomainVerified` harus sudah `true` -- kalau belum, FurniTech
 *    menagih orang yang tokonya belum bisa diakses lewat domain itu.
 *    Legalitas: langganannya harus sudah lunas, karena invoice legalitas
 *    tidak menambah periode langganan dan tidak akan terlihat di back-office
 *    yang belum aktif.
 *
 * 2. **Tidak ada nominal dari klien di seluruh berkas ini.** Harga, tenant,
 *    dan periode semuanya dibaca dari database atau dari `@/lib/addons`.
 *    Kalau harga masuk dari FormData, orang bisa membeli domain seharga satu
 *    rupiah -- dan karena marjinnya Rp 61.333 per invoice, satu saja cukup
 *    untuk menutup seluruh laba add-on dalam 4,2 tahun.
 */

export type PurchaseResult =
  | { ok: true; redirectTo: string; amount: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/* ------------------------------------------------------------------ *
 * Add-on custom domain
 * ------------------------------------------------------------------ */

/**
 * Normalisasi host yang diketik pengguna.
 *
 * Lower-case dan tanpa `www.`, karena `Toko-Mebel.com` dan `tokomebel.com`
 * adalah domain yang sama, dan unique index akan menolak yang kedua kalau
 * yang pertama sudah dipakai -- dengan pesan yang jauh lebih sulit dibaca
 * daripada "domain sudah dipakai".
 */
function normalizeDomainInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]!
    .trim();
}

/**
 * Host milik platform yang tidak boleh dipakai sebagai custom domain.
 *
 * Tanpa ini, tenant bisa mendaftarkan root domain FurniTech sendiri. Efeknya
 * seluruh subdomain yang sudah ada ikut hilang dari routing, karena resolusi
 * host akan menemukan dua tenant untuk satu nama.
 */
function isReservedDomain(domain: string, rootDomain: string | null): boolean {
  if (rootDomain && domain === rootDomain) return true;
  if (domain === "localhost") return true;
  return domain.endsWith(".vercel.app") || domain.endsWith(".vercel-dns.com");
}

/**
 * Hanya `.com` yang ditawarkan.
 *
 * Cloudflare tidak menjual `.id` maupun `.co.id`, jadi tidak ada harga
 * at-cost untuk keduanya -- dan `.id`/`.co.id` juga butuh verifikasi
 * legalitas usaha di Pornas yang belum bisa dilalui sekarang.
 */
const TLD_YANG_DITAWARKAN = ".com";

export async function purchaseDomainAddon(
  _prev: PurchaseResult | null,
  formData: FormData,
): Promise<PurchaseResult> {
  const actor = await requireTenantWrite(["owner"]);

  const input = normalizeDomainInput(String(formData.get("domain") ?? ""));
  if (!input) {
    return {
      ok: false,
      error: "Domain belum diisi.",
      fieldErrors: { domain: "Tulis domain yang ingin dipakai." },
    };
  }
  if (!input.includes(".") || input.includes(" ")) {
    return {
      ok: false,
      error: "Format domain tidak dikenal.",
      fieldErrors: { domain: "Format domain tidak dikenal. Contoh: tokomebel.com" },
    };
  }
  if (!input.endsWith(TLD_YANG_DITAWARKAN)) {
    return {
      ok: false,
      error: "TLD belum didukung.",
      fieldErrors: { domain: `Untuk sekarang hanya ${TLD_YANG_DITAWARKAN} yang bisa dibeli.` },
    };
  }
  if (isReservedDomain(input, process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? null)) {
    return {
      ok: false,
      error: "Domain dipakai platform.",
      fieldErrors: { domain: "Domain ini dipakai platform. Pilih domain lain." },
    };
  }

  const [tenant] = await db
    .select({
      name: tenants.name,
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
    })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  if (!tenant) return { ok: false, error: "Toko tidak ditemukan." };

  // Aturan 1a: jangan menagih domain yang belum terverifikasi. Menagih
  // domain yang belum bisa diakses berarti menagih orang atas sesuatu yang
  // belum berfungsi.
  if (!tenant.customDomainVerified || tenant.customDomain !== input) {
    return {
      ok: false,
      error:
        "Domain ini belum terverifikasi. Atur DNS dulu, tunggu sampai terverifikasi, lalu bayar.",
    };
  }

  const now = new Date();
  if (tenant.customDomainExpiresAt && tenant.customDomainExpiresAt > now) {
    return {
      ok: false,
      error: `Domain ini sudah dibayar sampai ${tenant.customDomainExpiresAt.toLocaleDateString("id-ID")}.`,
    };
  }

  const owner = await ownerContact(actor.tenantId);
  const { createDomainInvoice } = await import("@/lib/midtrans/addons");
  const result = await createDomainInvoice({
    tenantId: actor.tenantId,
    tenantName: tenant.name,
    email: owner.email,
    phone: owner.phone,
    finishUrl: `${await appOrigin()}/dashboard/pengaturan/domain?bayar=1`,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard/pengaturan/domain");
  return { ok: true, redirectTo: result.redirectTo, amount: result.amount };
}

/* ------------------------------------------------------------------ *
 * Add-on Paket Pendirian PT Perorangan
 * ------------------------------------------------------------------ */

/**
 * Legalitas hanya untuk tenant yang langganannya sudah lunas.
 *
 * Bukan aturan technical belaka: invoice legalitas tidak menambah periode
 * langganan, jadi kalau tenantnya masih `pending`, orang itu membayar
 * Rp 500.000 untuk sesuatu yang tidak akan pernah muncul di back-office
 * miliknya.
 */
export async function purchaseLegalitasAddon(
  _prev: PurchaseResult | null,
  _formData: FormData,
): Promise<PurchaseResult> {
  const actor = await requireTenantWrite(["owner"]);

  const [tenant] = await db
    .select({
      name: tenants.name,
      subscriptionStatus: tenants.subscriptionStatus,
    })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  if (!tenant) return { ok: false, error: "Toko tidak ditemukan." };

  if (tenant.subscriptionStatus !== "active") {
    return {
      ok: false,
      error: "Selesaikan pembayaran langganan dulu sebelum membeli paket pendirian.",
    };
  }

  /*
   * Satu kali seumur tenant. Dokumen pendirian tidak perlu diurus ulang,
   * dan membolehinya berulang berarti PNBP Rp 50.000 dibayar dua kali
   * untuk sesuatu yang sama.
   *
   * Rentang status: `pending` dan `paid` sama-sama mengunci. `pending`
   * dihitung karena tagihan yang sudah terbit tapi belum dibayar ITU SUDAH
   * invoice -- membiarkan orang membayar dua kali untuk satu dokumen adalah
   * cara paling langsung kehilangan kepercayaan.
   *
   * Yang TIDAK mengunci: `failed`. Invoice yang ditolak bank atau kedaluwarsa
   * tidak menghasilkan apa pun, jadi mengunci pembelian ulang kalau begitu
   * berarti pemilik toko tidak pernah bisa membeli lagi. Ini yang membuat
   * webhook menandai add-on yang dibayar bareng ikut `failed` saat tagihan
   * langganannya gagal -- kalau dibiarkan `pending`, jalan ini tertutup
   * permanen tanpa ada yang bisa memperbaikinya sendiri.
   *
   * Invoice yang dibayar bareng saat pendaftaran (migrasi 0025) ikut
   * terhitung di sini, jadi paket yang sudah diambil di wizard tidak bisa
   * diambil lagi dari halaman ini.
   */
  const [existing] = await db
    .select({ id: saasInvoices.id })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.tenantId, actor.tenantId),
        eq(saasInvoices.itemType, "legalitas"),
        inArray(saasInvoices.status, ["pending", "paid"]),
      ),
    )
    .orderBy(desc(saasInvoices.createdAt))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: "Paket pendirian sudah pernah dibeli. Hubungi kami kalau perlu bantuan.",
    };
  }

  const owner = await ownerContact(actor.tenantId);
  const { createLegalitasInvoice } = await import("@/lib/midtrans/addons");
  const result = await createLegalitasInvoice({
    tenantId: actor.tenantId,
    tenantName: tenant.name,
    email: owner.email,
    phone: owner.phone,
    finishUrl: `${await appOrigin()}/dashboard/pendirian?bayar=1`,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard/pendirian");
  return { ok: true, redirectTo: result.redirectTo, amount: result.amount };
}

/* ------------------------------------------------------------------ *
 * Helper
 * ------------------------------------------------------------------ */

/**
 * Kontak untuk tagihan: email dan HP owner tenant.
 *
 * `Session` sengaja tidak membawa `phone` -- session itu hasil validasi JWT,
 * dan nomor HP adalah data profil yang bisa berubah. Membacanya dari
 * `users` berarti tagihan selalu going ke nomor yang benar sekarang.
 */
async function ownerContact(tenantId: string): Promise<{
  email: string;
  phone: string | null;
}> {
  const [owner] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "owner")))
    .limit(1);

  if (!owner?.email) {
    // Owner tanpa email berarti data profilnya belum lengkap. Membiarkan
    // tagihan dibuat berarti Midtrans menolaknya nanti, setelah invoice
    // tercatat -- dan itu lebih sulit membersihkannya.
    throw new Error("Email owner belum terisi. Lengkapi profil dulu.");
  }

  return { email: owner.email, phone: owner.phone };
}

/**
 * Origin aplikasi dari Host request, bukan `NEXT_PUBLIC_APP_URL`.
 *
 * `NEXT_PUBLIC_*` di-inline saat build, jadi satu build untuk lokal dan
 * Vercel akan mengarahkan orang ke domain yang tidak melayani tagihannya.
 * Pola yang sama sudah dipakai `createCheckoutOrder`.
 */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const host = getRequestHost(h, fallback);
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
