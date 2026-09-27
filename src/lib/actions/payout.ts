"use server";

import { revalidatePath } from "next/cache";

import { requireTenantWrite } from "@/lib/auth/guard";
import { formatRupiah } from "@/lib/format";
import {
  PAYOUT_BLOCK_MESSAGES,
  previewPayout,
  runPayout,
  type PayoutBlockReason,
} from "@/lib/payouts";

/**
 * Jalankan pencairan untuk tenant yang sedang login.
 *
 * TIDAK ADA parameter tenant dari klien. Satu-satunya cara menjalankan
 * pencairan adalah milik tenant pemanggil — yang diambil dari guard. Action
 * yang menerima `tenantId` dari FormData berarti satu owner bisa mencairkan
 * uang toko orang lain hanya dengan mengetik UUID, jadi tidak ada bentuk
 * seperti itu di berkas ini.
 *
 * AKSES: hanya `owner`. `admin_penjualan` boleh MEMBACA riwayat pencairan,
 * tapi tidak boleh memulainya. Pencairan memindahkan uang keluar, dan itu
 * keputusan owner — sama seperti rekening tujuan yang hanya bisa diisi owner.
 */
export type PayoutState = {
  error?: string;
  message?: string;
  /** Detail per pesanan, supaya owner tahu apa yang sebenarnya dikirim. */
  detail?: { orderCount: number; amount: number };
};

export async function runTenantPayout(
  // Hanya SATU parameter, padahal `useActionState` mengirim dua
  // (`state`, `formData`). Tidak ada input yang perlu dibaca dari form —
  // tenant diambil dari guard, bukan dari klien — jadi parameter kedua
  // sengaja tidak ditulis. Dan menulisnya dengan `FormData` yang tidak
  // dipakai hanya menghasilkan peringatan lint untuk parameter yang memang
  // tidak boleh ada.
  _prev: PayoutState,
): Promise<PayoutState> {
  const actor = await requireTenantWrite(["owner"]);

  const outcome = await runPayout(actor.tenantId);
  revalidatePath("/dashboard/pencairan");

  if (outcome.ok) {
    return {
      message: outcome.alreadySent
        ? `Transfer Rp${formatRupiah(outcome.amount)} untuk ${outcome.orderCount} pesanan sudah pernah dikirim, jadi tidak dikirim ulang.`
        : `Rp${formatRupiah(outcome.amount)} untuk ${outcome.orderCount} pesanan sedang dikirim ke rekening Anda.`,
      detail: { orderCount: outcome.orderCount, amount: outcome.amount },
    };
  }

  if (outcome.reason === "service_error") {
    return { error: outcome.message };
  }

  return { error: PAYOUT_BLOCK_MESSAGES[outcome.reason as PayoutBlockReason] };
}

/**
 * Pratinjau pencairan tanpa mengirim apa pun.
 *
 * Dipakai halaman pencairan supaya owner melihat angkanya SEBELUM menekan
 * tombol. Button pencairan tanpa angka yang terlihat adalah tombol yang
 * Phillip Woolf — tidak ada yang bisa Says how much money is about to leave
 * their account before it does.
 */
export async function payoutPreviewForCurrentTenant() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan"]);
  return previewPayout(actor.tenantId);
}
