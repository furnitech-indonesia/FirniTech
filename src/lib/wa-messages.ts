import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, tenants } from "@/db/schema";
import { sendWhatsApp } from "@/lib/fonnte";
import { formatRupiah } from "@/lib/format";
import { PROGRESS_STAGE_LABELS, type ProgressStage } from "@/lib/labels";

/**
 * Isi pesan WhatsApp untuk pembeli (PRD §4.3).
 *
 * Dipisah dari `src/lib/fonnte.ts` karena yang di sana adalah Transport
 * (kirim pesan, kuota, audit), sedangkan yang di sini adalah Content. Kalau
 * digabung, setiap kalimat marketing di dalam `fonnte.ts` jadi hal yang harus
 * dibaca orang yang sedang memperbaiki signature webhook.
 *
 * ATURAN: fungsi-fungsi di sini SELALU dipanggil SETELAH aksi bisnis selesai
 * menulis datanya, dan tidak pernah melempar.
 */

export type OrderEvent = "progress_photo" | "payment_confirmed" | "shipped";

type EventInput = {
  tenantId: string;
  orderId: string;
  event: OrderEvent;
  /** Untuk `progress_photo`. */
  stage?: ProgressStage;
  notes?: string | null;
  /** Untuk `payment_confirmed`: nominal yang baru dibayar. */
  amount?: number;
  /** Untuk `shipped`. */
  cargoName?: string | null;
  trackingNumber?: string | null;
};

/**
 * Kirim pemberitahuan ke pembeli tentang satu pesanan.
 *
 * Semua data diambil ulang dari database dengan filter `tenantId`, bukan
 * diteruskan dari FormData pemanggil. Itu bukan paranoia: `customerPhone`
 * adalah kolom yang diisi bebas, dan kalau bisa datang dari klien, satu tenant
 * bisa mengirim WA ke nomor pelanggan tenant lain.
 *
 * Tidak pernah melempar. Kembalinya boolean hanya supaya pemanggil bisa
 * menulis log kalau perlu; mengabaikan hasilnya pun sah.
 */
export async function notifyOrderEvent(input: EventInput): Promise<boolean> {
  try {
    const [row] = await db
      .select({
        orderCode: orders.orderCode,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        totalAmount: orders.totalAmount,
        workshopName: tenants.name,
        slug: tenants.slug,
        plan: tenants.plan,
      })
      .from(orders)
      // `innerJoin` ke tenant sekaligus mengambil plan untuk kuota. Kalau
      // tenant tidak ada, tidak ada pesan yang dikirim — dan itu benar.
      .innerJoin(tenants, eq(tenants.id, orders.tenantId))
      .where(
        and(eq(orders.id, input.orderId), eq(orders.tenantId, input.tenantId)),
      )
      .limit(1);

    if (!row) return false;

    const { message, url } = buildMessage(input, row);

    const result = await sendWhatsApp({
      tenantId: input.tenantId,
      plan: row.plan,
      to: row.customerPhone,
      message,
      event: input.event,
      url,
    });

    return result.delivered;
  } catch (error) {
    // WA adalah pelengkap, bukan syarat. Kalau sampai sini ada yang melempar
    // (query gagal, audit gagal), aksi bisnisnya sudah selesai dan tidak
    // boleh ikut gagal.
    console.error("Gagal menyiapkan notifikasi WhatsApp:", error);
    return false;
  }
}

type MessageRow = {
  orderCode: string;
  customerName: string;
  totalAmount: number;
  workshopName: string;
  slug: string;
};

function buildMessage(
  input: EventInput,
  row: MessageRow,
): { message: string; url: string } {
  // Paginasi publik belum ada (Sprint 5), jadi yang dikirim adalah toko
  // Tenant — halaman yang benar-benar ada. Mengirim tautan ke halaman lacak
  // yang belum dibuat akan menghasilkan 404 di WhatsApp pembeli, dan itu
  // lebih buruk daripada tidak mengirim tautan sama sekali.
  const url = `/t/${row.slug}`;

  switch (input.event) {
    case "progress_photo": {
      const stage = input.stage;
      const stageLabel = stage ? PROGRESS_STAGE_LABELS[stage] : "tahap terbaru";
      return {
        message: [
          `Halo ${row.customerName},`,
          "",
          `Pembaruan progres pesanan ${row.orderCode} dari ${row.workshopName}:`,
          `Tahap: ${stageLabel}`,
          input.notes ? `Catatan: ${input.notes}` : null,
          "",
          "Klik tautan di bawah untuk melihat toko kami.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
        url,
      };
    }

    case "payment_confirmed": {
      const amount = input.amount ?? 0;
      const remaining = Math.max(0, row.totalAmount - amount);
      return {
        message: [
          `Halo ${row.customerName},`,
          "",
          `Pembayaran ${formatRupiah(amount)} untuk pesanan ${row.orderCode} sudah kami terima.`,
          remaining > 0
            ? `Sisa yang perlu dibayar: ${formatRupiah(remaining)}.`
            : "Pesanan sudah lunas. Terima kasih!",
          "",
          `Pesanan Anda diproses oleh ${row.workshopName}.`,
        ].join("\n"),
        url,
      };
    }

    case "shipped": {
      return {
        message: [
          `Halo ${row.customerName},`,
          "",
          `Pesanan ${row.orderCode} dari ${row.workshopName} sudah dikirim.`,
          input.cargoName ? `Kargo: ${input.cargoName}` : null,
          input.trackingNumber ? `Nomor resi: ${input.trackingNumber}` : null,
          "",
          "Lacak kiriman Anda lewat tautan di bawah.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
        url,
      };
    }
  }
}
