import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants } from "@/db/schema";
import { DOMAIN_ADDON } from "@/lib/addons";
import { RENEWAL_LEAD_DAYS, daysUntil } from "@/lib/renewal";

/**
 * Tagihan yang menunggu pembayaran, dan notifikasi thereof (Sprint 6).
 *
 * Kenapa notifikasi ini DI DALAM APLIKASI dan bukan lewat email/WhatsApp:
 *
 * - Tidak ada penyedia email yang dikonfigurasi, tidak ada gateway
 *   WhatsApp (PRD §4 modul 4 melarangnya dengan alasan biaya dan bukti),
 *   dan tidak ada VAPID key untuk push. Menulis kode pengirim yang
 *   kredensialnya kosong berarti menulis sesuatu yang tidak akan pernah
 *   terkirim tapi terlihat selesai.
 * - Notifikasi dalam aplikasi tidak kedaluwarsa. Email tagihan yang
 *   berakhir di spam hilang selamanya; banner di dashboard muncul
 *   setiap kali orang masuk, sampai tagihannya lunas.
 * - Yang dibutuhkan pengrajin bukan kotak masuk -- tempat ia masuk untuk
 *   mengerjakan pekerjaannya.
 *
 * Yang BELUM ada dan sengaja tidak dikarang: kanal keluar dari aplikasi
 * (email/WA/push). Begitu kanal itu ditambahkan, halaman ini tetap
 * menampilkan tagihannya; yang berubah hanya salurannya.
 */

export type PendingInvoice = {
  id: string;
  itemType: "subscription" | "domain" | "legalitas";
  amount: number;
  periodStart: string;
  periodEnd: string;
  isRenewal: boolean;
  createdAt: Date;
  /** Ada kalau charge-nya sudah dibuat dan URL-nya tersimpan. */
  payUrl: string | null;
  /**
   * Berapa hari sejak tagihan ini terbit.
   *
   * Ada karena halaman tagihan butuh membedakan "baru diterbitkan, bayar
   * sekarang" dari "dua minggu lalu belum dibayar" -- dan perbedaan itu
   * mengubah apa yang tertulis, bukan hanyaWarnanya.
   *
   * Penting untuk tagihan cron: Snap punya masa berlaku, dan ketika URL-nya
   * kedaluwarsa tombol "bayar" yang masih terlihat di layar hanya
   * menghasilkan halaman error Midtrans. Menyorot yang sudah tua jauh lebih
   * berguna daripada membiarkan orang mengetahuinya setelah menekan.
   */
  umurHari: number;
};

/** Di atas ini, tagihan dianggap perlu diingat ulang, bukan sekadar menonjol. */
export const UMUR_TAGIHAN_MENARIK = 14;

export type BillingNotice = {
  /** Tagihan yang menunggu. Kosong berarti tidak ada yang perlu człihat. */
  pending: PendingInvoice[];
  /** Total yang harus dilunasi sekarang. */
  totalDue: number;
  /** Berapa hari lagi langganan berakhir, atau null kalau tidak punya. */
  subscriptionDaysLeft: number | null;
  /** Tagihan terbit dalam N hari? */
  renewalSegera: boolean;
};

/** Label jenis tagihan. Satu tempat, supaya tidak ada yang menulis ulang. */
const LABEL_ITEM: Record<PendingInvoice["itemType"], string> = {
  subscription: "Perpanjangan langganan",
  domain: `Perpanjangan domain ${DOMAIN_ADDON.periodMonths} bulan`,
  legalitas: `Paket Pendirian PT Perorangan (sekali bayar)`,
};

export function labelInvoice(itemType: PendingInvoice["itemType"]): string {
  return LABEL_ITEM[itemType];
}

/**
 * Tagihan yang menunggu, untuk satu tenant.
 *
 * `tenantId` SELALU dari parameter, tidak pernah dari FormData atau URL.
 * Klien Drizzle adalah user postgres yang MELEWATI RLS, jadi penyaring
 * `tenant_id` di kueri ini adalah satu-satunya penahan. Tanpa itu, mengubah
 * satu UUID di URL cukup untuk melihat tagihan orang lain.
 */
export async function loadPendingInvoices(
  tenantId: string,
  now: Date = new Date(),
): Promise<PendingInvoice[]> {
  const rows = await db
    .select({
      id: saasInvoices.id,
      itemType: saasInvoices.itemType,
      amount: saasInvoices.amount,
      periodStart: saasInvoices.periodStart,
      periodEnd: saasInvoices.periodEnd,
      isRenewal: saasInvoices.isRenewal,
      createdAt: saasInvoices.createdAt,
      midtransRedirectUrl: saasInvoices.midtransRedirectUrl,
    })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.tenantId, tenantId),
        eq(saasInvoices.status, "pending"),
        // `sql<number>` HANYA cast TypeScript -- postgres.js mengembalikan
        // bigint sebagai STRING, jadi tanpa `Number()` perbandingan
        // `=== 0` bernilai false meski angkanya benar.
        sql`coalesce(${saasInvoices.amount}, 0) > 0`,
      ),
    )
    .orderBy(desc(saasInvoices.createdAt));

  return rows.map((r) => ({
    id: r.id,
    itemType: r.itemType,
    // `amount` sudah `number` (mode: "number"), tapi `coalesce` di kueri
    // bisa mengubah tipe yang dilihat TypeScript. `Number()` menutup
    // kemungkinan itu tanpa merusak kalau ternyata sudah number.
    amount: Number(r.amount),
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    isRenewal: r.isRenewal,
    createdAt: r.createdAt,
    payUrl: r.midtransRedirectUrl,
    umurHari: daysBetween(r.createdAt, now),
  }));
}

/**
 * Selisih hari kalender antara dua momen, tanpa bagian waktu.
 *
 * Dibulatkan ke bawah, bukan ke terdekat: 12 jam berarti "0 hari", dan
 * `Math.round` akan menyebutnya "1 hari" -- sehingga tagihan yang dibuat sore
 * hari akan terlihat berumur sehari pada tengah malam hari yang sama.
 */
function daysBetween(dari: Date, sampai: Date): number {
  const a = Date.UTC(dari.getUTCFullYear(), dari.getUTCMonth(), dari.getUTCDate());
  const b = Date.UTC(
    sampai.getUTCFullYear(),
    sampai.getUTCMonth(),
    sampai.getUTCDate(),
  );
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Ringkasan untuk banner di layout dashboard. */
export async function loadBillingNotice(
  tenantId: string,
  now: Date = new Date(),
): Promise<BillingNotice> {
  const pending = await loadPendingInvoices(tenantId, now);

  const [tenant] = await db
    .select({ expiresAt: tenants.subscriptionExpiresAt })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const subscriptionDaysLeft = daysUntil(now, tenant?.expiresAt ?? null);

  return {
    pending,
    totalDue: pending.reduce((a, b) => a + b.amount, 0),
    subscriptionDaysLeft,
    renewalSegera:
      subscriptionDaysLeft !== null && subscriptionDaysLeft <= RENEWAL_LEAD_DAYS,
  };
}

/** Satu baris riwayat tagihan, apa adanya dari kueri. */
export type InvoiceHistoryRow = {
  id: string;
  itemType: PendingInvoice["itemType"];
  plan: "basic" | "pro" | "max" | null;
  period: "monthly" | "yearly";
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  isRenewal: boolean;
  periodStart: string;
  periodEnd: string;
  paidAt: Date | null;
  createdAt: Date;
  midtransRedirectUrl: string | null;
};

/**
 * Riwayat tagihan untuk halaman /dashboard/tagihan.
 *
 * Include semua jenis. Halaman yang hanya menampilkan yang "menunggu" akan
 * membuat orang mengira FurniTech tidak punya catatan -- dan ketika tagihannya
 * lunas tanpa sengaja, tidak ada tempat untuk memeriksanya.
 */
export async function loadInvoiceHistory(
  tenantId: string,
): Promise<InvoiceHistoryRow[]> {
  return db
    .select({
      id: saasInvoices.id,
      itemType: saasInvoices.itemType,
      plan: saasInvoices.plan,
      period: saasInvoices.period,
      amount: saasInvoices.amount,
      status: saasInvoices.status,
      isRenewal: saasInvoices.isRenewal,
      periodStart: saasInvoices.periodStart,
      periodEnd: saasInvoices.periodEnd,
      paidAt: saasInvoices.paidAt,
      createdAt: saasInvoices.createdAt,
      midtransRedirectUrl: saasInvoices.midtransRedirectUrl,
    })
    .from(saasInvoices)
    .where(eq(saasInvoices.tenantId, tenantId))
    .orderBy(desc(saasInvoices.createdAt));
}

/**
 * Kalimat yang jujur untuk sebuah tagihan.
 *
 * `legalitas` yang `isRenewal` tidak mungkin terjadi (sekali bayar seumur
 * tenant), dan sebaliknya untuk pengrajin yang sudah pernah
 * membayar. Tapi kalau `isRenewal` bohong karena bug, kalimatnya akan
 * menyuruh orang membayar dua kali untuk hal yang sama. Karena itu
 * kondisi tak terduga itu ditangani sebagai "bayar ulang" yang
 * dijelaskan, bukan yang disembunyikan.
 */
export function invoiceHint(invoice: {
  itemType: PendingInvoice["itemType"];
  isRenewal: boolean;
  periodEnd: string;
}): string {
  if (invoice.itemType === "legalitas") {
    return "Sekali bayar seumur tenant. Dokumen yang sudah terbit tidak diurus ulang.";
  }
  if (invoice.isRenewal) {
    return `Perpanjangan sampai ${invoice.periodEnd}. Tidak ada biaya tambahan untuk bayar lebih awal.`;
  }
  return `Berlaku sampai ${invoice.periodEnd}.`;
}
