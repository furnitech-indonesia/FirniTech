"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { deliveryProofs, orders } from "@/db/schema";
import { ActionError, guard, requireTenantWrite } from "@/lib/auth/guard";
import { formatRupiah } from "@/lib/format";
import { runPayout } from "@/lib/payouts";
import { canTransition, type OrderStatus } from "@/lib/order-status";
import { codAmountInputSchema, deliveryProofSchema } from "@/lib/schemas/delivery";
import { parseForm } from "@/lib/schemas/primitives";
import {
  decodeSignatureDataUrl,
  deleteDeliveryProofObjects,
  uploadDeliveryCodProof,
  uploadDeliveryPhoto,
  uploadSignature,
} from "@/lib/storage";

/**
 * Kirim bukti barang diterima (Sprint 6).
 *
 * INI ADALAH AKSI YANG MEMICU PENCAIRAN. Setelah baris ini ada, uang
 * pengrajin untuk pesanan tersebut dianggap siap dicairkan. Karena itu
 * urutannya tidak boleh diubah: semua pemeriksaan dulu, baru unggah, baru
 * satu INSERT.
 *
 * TIGA KEPUTUSAN YANG MUNCUL DARI KODE INI:
 *
 * 1. Kurir menulis lewat `requireTenantWrite(["kurir"])`, bukan
 *    `requireRoleForRead`. Ia memang menulis — tapi hanya ke
 *    `delivery_proofs`, yang tidak bisa diubah siapa pun termasuk dia
 *    sendiri (trigger append-only di database). Menolak penulisan apa pun
 *    akan membuat fitur ini mustahil ada.
 *
 * 2. Penugasan diverifikasi ULANG di sini dengan
 *    `assignedCourierId = actor.userId`, meski halaman `/kurir` sudah
 *    menfilternya. Halaman bisa dibuka langsung lewat URL, dan mengetahui
 *    satu UUID pesanan sudah cukup untuk menulis bukti atas nama orang.
 *    `tenantId` SELALU dari guard, tidak pernah dari FormData.
 *
 * 3. Kalau ada langkah yang gagal, objek yang sudah terunggah ikut dihapus.
 *    Tanpa itu setiap unggahan yang gagal menyisakan berkas yatim di bucket
 *    yang tidak pernah dihapus — dan kurir akan mengulang, menambah lebih
 *    banyak.
 */
export type DeliveryProofState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitDeliveryProof(
  _prev: DeliveryProofState,
  formData: FormData,
): Promise<DeliveryProofState> {
  return guard<DeliveryProofState>(
    async () => {
      const actor = await requireTenantWrite(["kurir"]);

      /*
       * Validasi SETELAH guard, tidak sebelum.
       *
       * Kalau validasi didahulukan, server membocorkan bentuk data yang
       * diterima ke pemanggil yang tidak berhak — kurir yang tidak
       * ditugaskan pun akan mendapat pesan error yang bisa dibaca, bukan 403.
       */
      const parsed = parseForm(deliveryProofSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, signerName, notes } = parsed.data;

      const cod = codAmountInputSchema.safeParse(formData.get("codAmount"));
      if (!cod.success) {
        return {
          error: "Nominal COD tidak terbaca.",
          fieldErrors: {
            codAmount: cod.error.issues[0]?.message ?? "Nominal tidak valid.",
          },
        };
      }
      const codAmount = cod.data;


      // Penugasan diverifikasi di server, bukan dari halaman.
      const [order] = await db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          totalAmount: orders.totalAmount,
          dpAmount: orders.dpAmount,
          orderStatus: orders.orderStatus,
          paymentMethod: orders.paymentMethod,
        })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.tenantId, actor.tenantId),
            eq(orders.assignedCourierId, actor.userId),
          ),
        )
        .limit(1);

      if (!order) {
        throw new ActionError(
          "Pesanan ini tidak ditugaskan kepada Anda, atau sudah tidak ada.",
        );
      }

      /*
       * COD harus diminta PADA pesanan COD, dan TIDAK boleh diminta pada
       * pesanan VA.
       *
       * Dua arahnya sama pentingnya. Tanpa pemeriksaan ini, kurir bisa
       * mencatat "COD diterima Rp1.000.000" pada pesanan yang pembayarannya
       * sudah masuk lewat virtual account. Datanya akan terlihat benar di
       * daftar COD dan salah di mana-mana — dan pencairan tidak pernah
       * membaca `cod_amount`, jadi tidak ada yang akan menemukan
       * ketidakkonsistenan itu.
       *
       * Sebaliknya, pesanan COD tanpa nominal COD berarti kurir gagal
       * mencatat apa yang ia terima, dan itu ditolak di sini supaya tidak
       * tersimpan diam-diam sebagai "tidak ada COD".
       */
      if (order.paymentMethod === "cod") {
        if (codAmount === null) {
          return {
            error:
              "Pesanan COD: catat nominal uang yang diterima, atau tulis 0 kalau memang tidak ada uang masuk.",
            fieldErrors: { codAmount: "Wajib diisi untuk pesanan COD." },
          };
        }
      } else if (codAmount !== null) {
        return {
          error:
            "Pesanan ini dibayar lewat virtual account, bukan COD. Nominal COD tidak boleh diisi.",
          fieldErrors: { codAmount: "Tidak berlaku untuk pesanan non-COD." },
        };
      }

      /*
       * COD harus cocok dengan sisa tagihan.
       *
       * Dicek di server karena angka dari kurir tidak boleh dipercaya, tapi
       * lebih penting lagi: nominal yang lebih besar dari sisa tagihan berarti
       * ada uang yang masuk ke tangan kurir melebihi yang seharusnya. Menolak
       * di sini menghentikan pembayarannya, bukan hanya mencatat angka yang
       * salah.
       *
       * Sisa tagihan dihitung dari nilai server, tidak pernah dari angka yang
       * dikirim klien. Untuk pesanan VA, `dpAmount` sudah `totalAmount`, jadi
       * sisanya nol — dan pesanan VA sudah ditolak di atas, sebelum sampai
       * sini.
       */
      if (codAmount !== null) {
        const remaining = Math.max(0, order.totalAmount - order.dpAmount);
        if (codAmount > remaining) {
          return {
            error: `Nominal COD melebihi sisa tagihan (${formatRupiah(remaining)}).`,
            fieldErrors: { codAmount: "Melebihi sisa tagihan." },
          };
        }
      }

      // Foto barang.
      const photo = formData.get("photo");
      if (!(photo instanceof File) || photo.size === 0) {
        return {
          error: "Foto barang wajib diunggah.",
          fieldErrors: { photo: "Ambil foto barang yang diterima." },
        };
      }

      // Tanda tangan, sebagai data URL dari canvas.
      const signatureRaw = formData.get("signature");
      if (typeof signatureRaw !== "string" || signatureRaw === "") {
        return {
          error: "Tanda tangan wajib ada.",
          fieldErrors: {
            signature: "Minta yang menerima menandatangani di layar.",
          },
        };
      }

      /*
       * Bukti transfer COD opsional, dan hanya relevan kalau ada nominal COD.
       * Meminta bukti transfer untuk pesanan non-COD hanya menambah satu
       * langkah yang tidak berarti.
       */
      const codProof = formData.get("codProof");
      const codProofFile =
        codAmount !== null && codProof instanceof File && codProof.size > 0
          ? codProof
          : null;

      const uploaded: string[] = [];

      try {
        uploaded.push(
          await uploadDeliveryPhoto({
            tenantId: actor.tenantId,
            orderId,
            file: photo,
          }),
        );
      } catch (err) {
        // Pesan dari storage sudah dalam bahasa manusia (MIME, ukuran).
        throw new ActionError(
          err instanceof Error ? err.message : "Gagal mengunggah foto barang.",
        );
      }

      try {
        const { bytes, mime } = decodeSignatureDataUrl(signatureRaw);
        uploaded.push(
          await uploadSignature({
            tenantId: actor.tenantId,
            orderId,
            bytes,
            mime,
          }),
        );
      } catch (err) {
        await deleteDeliveryProofObjects(uploaded);
        throw new ActionError(
          err instanceof Error
            ? err.message
            : "Gagal mengunggah tanda tangan.",
        );
      }

      if (codProofFile) {
        try {
          uploaded.push(
            await uploadDeliveryCodProof({
              tenantId: actor.tenantId,
              orderId,
              file: codProofFile,
            }),
          );
        } catch (err) {
          await deleteDeliveryProofObjects(uploaded);
          throw new ActionError(
            err instanceof Error
              ? err.message
              : "Gagal mengunggah bukti transfer COD.",
          );
        }
      }

      const [photoPath, signaturePath, codProofPath] = [
        uploaded[0],
        uploaded[1],
        uploaded[2] ?? null,
      ];

      try {
        await db.insert(deliveryProofs).values({
          orderId,
          tenantId: actor.tenantId,
          courierId: actor.userId,
          photoPath,
          signaturePath,
          signerName,
          notes: notes || null,
          codAmount,
          codProofPath,
          receivedAt: new Date(),
        });
      } catch (err) {
        await deleteDeliveryProofObjects(uploaded);
        /*
         * Pelanggaran unique `delivery_proof_order_uniq` berarti bukti ini
         * sudah pernah dikirim. Menolaknya memang menyakitkan karena kurir
         *benar-benar mengirim dua kali (koneksi lambat), tapi membiarkan
         * dua bukti berarti pencairan ganda untuk satu pesanan.
         */
        if (isUniqueViolation(err)) {
          throw new ActionError(
            "Bukti untuk pesanan ini sudah pernah dikirim. Daftar sudah diperbarui.",
          );
        }
        throw err;
      }

      /*
       * Status pesanan ikut bergerak ke `completed` kalau transisinya boleh.
       *
       * Aturan transisi tetap milik `src/lib/order-status.ts` — di sini hanya
       * memanggil `canTransition`, tidak mengarang daftar status sendiri.
       * `ready_to_ship -> completed` langsung ada di sana karena bukti
       * penerimaan ADALAH kejadian pengiriman; lihat komentar di berkas itu.
       */
      if (
        canTransition(order.orderStatus as OrderStatus, "completed")
      ) {
        await db
          .update(orders)
          .set({ orderStatus: "completed" })
          .where(eq(orders.id, orderId));
      }

      revalidatePath("/kurir");
      revalidatePath(`/dashboard/pesanan/${orderId}`);
      revalidatePath("/dashboard/pencairan");

      /*
       * PEMICU PENCIRAN.
       *
       * Bukti penerimaan inilah yang memicu pencairan — bukan jadwal cron
       * 06.00/18.00 yang sudah dihapus, dan bukan tombol "cairkan" manual.
       *
       * Hasilnya TIDAK ikut dikembalikan ke kurir sebagai error kalau
       * gagal. Kurir tidak bisa bertindak apa-apa atas kegagalan pencairan,
       * dan membuatnya melihat "Gagal mencairkan" setelahSuccessfully
       * mengirim bukti akan membuat ia mengira buktinya tidak diterima — lalu
       * mengirim ulang, yang justru memicu pencairan kedua.
       *
       * Kegagalan dicatat di `payout_logs` dengan status `failed` atau
       * `blocked`, dan owner melihatnya di halaman pencairan dengan
       * alasannya. Itu tempat yang benar untuk informasinya.
       */
      const payout = await runPayout(actor.tenantId);
      if (!payout.ok) {
        console.warn(
          `Pencairan tenant ${actor.tenantId} belum jalan: ${payout.reason}`,
        );
      }

      return {
        message: `Bukti diterima untuk ${order.orderCode}. Pencairan sudah dipicu.`,
      };
    },
    (error) => ({ error }),
  );
}

/** Kode SQLSTATE 23505 = unique_violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
