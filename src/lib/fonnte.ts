import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { integrationAuditLogs, notificationUsage } from "@/db/schema";
import { PLANS } from "@/lib/plans";

/**
 * Mesin notifikasi WhatsApp lewat Fonnte (PRD §4.3).
 *
 * Aturan paling penting di file ini, dan yang paling sering dianggap detail
 * kecil:
 *
 * **Kegagalan WhatsApp TIDAK BOLEH membatalkan aksi bisnisnya.** Kalau tukang
 * mengunggah foto progres dan Fonnte sedang down, foto HARUS tetap tersimpan.
 * Kalau tidak, satu gangguan pihak ketiga bisa menghentikan seluruh produksi
 * di bengkel. Jadi `sendWhatsApp()` tidak pernah melempar ke pemanggil; ia
 * mencatat hasilnya dan mengembalikan laporan.
 *
 * Urutan di pemanggilnya: aksi bisnis menulis datanya → kirim WA (dibungkus
 * try/catch) → selesai. Tidak ada `await sendWhatsApp()` yang menentukan
 * apakah aksi bisnisnya berhasil.
 *
 * Aturan kedua: `tenantId` dan nomor tujuan SELALU berasal dari baris yang
 * sudah diambil dengan filter `tenantId`, TIDAK PERNAH dari FormData. Kalau
 * nomor bisa datang dari klien, satu tenant bisa mengirim pesan atas nama
 * tenant lain sekaligus memakai kuota tenant lain.
 *
 * Aturan ketiga: kuota dihitung ATOMIK lewat conditional upsert, bukan "baca
 * lalu tulis". Baca-lalu-tulis raced — dua request bersamaan sama-sama membaca
 * "sudah 99", sama-sama lolos, dan tenant Basic bisa mengirim 101 pesan padahal
 * jatah 100. `where used_count < quota` membuat penambahan itu sendiri yang
 * menolak kalau sudah penuh.
 */

/** Device WA Fonnte yang dipakai tenant. */
const DEFAULT_DEVICE = "FurniTech";

export type SendResult = {
  /** Pesan benar-benar terkirim, bukan sekadar dicoba. */
  delivered: boolean;
  /** Alasan kalau gagal. Untuk log dan audit, tidak untuk ditampilkan. */
  reason?: string;
  /** Pemakaian kuota bulan ini setelah percobaan ini. */
  used?: number;
  /** True kalau ditolak karena kuota paket habis. */
  quotaExceeded?: boolean;
};

/**
 * Normalisasi nomor Indonesia ke format Fonnte: `628xxxxxxxxx`.
 *
 * Fonnte menolak nomor yang diawali `0`, dan `+` tidak dipakai di `target`
 * (negaraIso_alpha2 di field terpisah). Data di database bisa datang dari
 * mana saja — form back-office memakai `08xx`, import lama mungkin sudah
 * `628xx` — jadi normalisasinya dikumpulkan di satu tempat.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  // Nomor lokal tanpa 0 di depan, mis. "81234567890" yang salah diisi.
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

/** Awal bulan berjalan sebagai `YYYY-MM-DD`, memakai acuan zona WIB. */
export function currentPeriodStart(now = new Date()): string {
  // Dipakai hanya sebagai label periode, jadi ambil tanggal WIB supaya batas
  // bulan sama dengan yang dilihat orang di Indonesia.
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.toISOString().slice(0, 7)}-01`;
}

/**
 * Naikkan counter kuota dan kembalikan jumlah terpakai SETELAH percobaan ini.
 *
 * `allowed = false` berarti kuota bulan ini sudah habis dan pemanggil tidak
 * boleh mengirim.
 *
 * Satu query, bukan SELECT lalu UPDATE. `on conflict ... do update ... where`
 * menolak penambahan itu sendiri ketika `used_count` sudah menyentuh kuota,
 * jadi dua request bersamaan tidak bisa sama-sama lolos. Kalau tidak begitu,
 * pengecekan kuota hanya hiasan: pengecekan di memori selalu punya celah
 * kecil yang bisa dieksploitasi dengan mengirim beberapa request sekaligus.
 */
export async function consumeQuota(
  tenantId: string,
  quota: number | null,
  periodStart = currentPeriodStart(),
): Promise<{ used: number; allowed: boolean }> {
  const rows = await db.execute(sql`
    insert into notification_usage (tenant_id, channel, period_start, used_count)
    values (${tenantId}, 'whatsapp', ${periodStart}, 1)
    on conflict (tenant_id, channel, period_start) do update
      set used_count = notification_usage.used_count + 1,
          updated_at = now()
      ${quota === null ? sql`` : sql`where notification_usage.used_count < ${quota}`}
    returning used_count
  `);

  const list = rows as unknown as { used_count: number }[];

  if (list.length === 0) {
    // Barisnya ada tapi `where` tidak terpenuhi: kuota sudah habis. Ambil
    // angka yang terpakai supaya laporan ke tenant akurat.
    const [current] = await db
      .select({ used: notificationUsage.usedCount })
      .from(notificationUsage)
      .where(
        and(
          eq(notificationUsage.tenantId, tenantId),
          eq(notificationUsage.channel, "whatsapp"),
          eq(notificationUsage.periodStart, periodStart),
        ),
      )
      .limit(1);
    return { used: current?.used ?? 0, allowed: false };
  }

  return { used: Number(list[0].used_count), allowed: true };
}

/** Sisa kuota bulan ini, untuk ditampilkan di back-office. */
export async function quotaRemaining(
  tenantId: string,
  plan: keyof typeof PLANS,
): Promise<{ used: number; quota: number | null; remaining: number | null }> {
  const quota = PLANS[plan].monthlyWaQuota;

  const [row] = await db
    .select({ used: notificationUsage.usedCount })
    .from(notificationUsage)
    .where(
      and(
        eq(notificationUsage.tenantId, tenantId),
        eq(notificationUsage.channel, "whatsapp"),
        eq(notificationUsage.periodStart, currentPeriodStart()),
      ),
    )
    .limit(1);

  const used = row?.used ?? 0;
  return { used, quota, remaining: quota === null ? null : Math.max(0, quota - used) };
}

export type SendWhatsAppInput = {
  tenantId: string;
  /** Plan tenant, untuk mengecek kuota. */
  plan: keyof typeof PLANS;
  /** Nomor tujuan, format bebas — akan dinormalisasi. */
  to: string;
  message: string;
  /** Label untuk audit log, mis. "progress_photo". */
  event: string;
  /** Link yang ditambahkan Fonnte ke pesan, mis. halaman lacak pesanan. */
  url?: string;
};

/**
 * Kirim satu pesan WhatsApp. Tidak pernah melempar.
 *
 * `to` boleh berisi beberapa nomor yang dipisah koma; Fonnte memproses
 * semuanya dalam satu panggilan.
 */
export async function sendWhatsApp(input: SendWhatsAppInput): Promise<SendResult> {
  const token = process.env.FONNTE_API_TOKEN?.trim();

  const targets = input.to
    .split(",")
    .map((part) => normalizePhone(part))
    .filter((value): value is string => value !== null);

  if (targets.length === 0) {
    await audit(input, "failed", "Nomor tujuan tidak bisa dinormalisasi.");
    return { delivered: false, reason: "invalid_number" };
  }

  /*
   * Kredensial kosong = kondisi yang diketahui di lingkungan pengembangan,
   * bukan kegagalan. Kuota TIDAK dikurangi di sini: tidak ada pesan yang
   * benar-benar terkirim, jadi menghitungnya akan memotong jatah tanpa
   * alasan dan membuat tenant kehabisan kuota padahal tidak mengirim apa pun.
   */
  if (!token) {
    await audit(input, "failed", "FONNTE_API_TOKEN belum diset.");
    return { delivered: false, reason: "not_configured" };
  }

  const quota = PLANS[input.plan].monthlyWaQuota;
  const { used, allowed } = await consumeQuota(input.tenantId, quota);

  if (!allowed) {
    await audit(input, "failed", `Kuota WA bulan ini habis (${quota}).`, { used });
    return { delivered: false, reason: "quota_exceeded", used, quotaExceeded: true };
  }

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: targets,
        message: input.message,
        url: input.url,
        countryCode: "62",
        delay: "0",
        device: DEFAULT_DEVICE,
      }),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as {
      status?: boolean;
      reason?: string;
    } | null;

    if (!response.ok || body?.status !== true) {
      await audit(input, "failed", body?.reason ?? `HTTP ${response.status}`, { used });
      return { delivered: false, reason: body?.reason ?? "http_error", used };
    }

    await audit(input, "success", null, { used });
    return { delivered: true, used };
  } catch (error) {
    // Jaringan mati, DNS gagal, timeout. Tetap tidak melempar: pemanggil
    // sedang menuntaskan aksi bisnis dan tidak boleh gagal karena ini.
    await audit(input, "failed", error instanceof Error ? error.message : "unknown", {
      used,
    });
    return { delivered: false, reason: "network_error", used };
  }
}

/**
 * Catat hasil pengiriman ke `integration_audit_logs`.
 *
 * Kegagalan audit tidak boleh menutupi kegagalannya sendiri. Kalau ini
 * melempar, satu masalah database menjatuhkan seluruh pengiriman notifikasi —
 * hilangnya jejak audit lebih ringan daripada tidak terkirimnya pesan.
 */
async function audit(
  input: SendWhatsAppInput,
  status: "success" | "failed",
  errorMessage: string | null,
  extra?: { used?: number },
): Promise<void> {
  try {
    await db.insert(integrationAuditLogs).values({
      tenantId: input.tenantId,
      service: "fonnte",
      action: input.event,
      status,
      requestMeta: { to: input.to, message: input.message, url: input.url },
      responseMeta: extra ? { used: extra.used } : null,
      errorMessage,
    });
  } catch (error) {
    console.error("Gagal menulis audit Fonnte:", error);
  }
}
