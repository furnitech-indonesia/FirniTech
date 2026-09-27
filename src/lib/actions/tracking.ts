"use server";

import { parseForm } from "@/lib/schemas/primitives";
import { trackingLookupSchema } from "@/lib/schemas/tracking";
import { findOrderForTracking, type TrackingOrder } from "@/lib/orders-public";
import type { FormState } from "@/components/form-state";

/**
 * Pencarian pesanan untuk halaman lacak (Sprint 5 bagian 4).
 *
 * TIDAK memakai `requireTenantWrite` / `requireSession`. Halaman ini publik:
 * pembeli tidak punya akun, dan itu memang fiturnya — supaya orang bisa
 * melihat progres pesanannya tanpa daftar dulu. Justru itu yang membuat
 * verifikasinya wajib, dan itu semua dijelaskan di src/lib/orders-public.ts.
 */

export type TrackingState = FormState & {
  order?: TrackingOrder;
};

export async function lookupOrder(
  _prev: TrackingState,
  formData: FormData,
): Promise<TrackingState> {
  const parsed = parseForm(trackingLookupSchema, formData);
  if (!parsed.success) {
    return {
      error: "Periksa kembali kode pesanan dan nomor WhatsApp Anda.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const order = await findOrderForTracking(parsed.data.orderCode, parsed.data.phone);

  /*
   * PESANNYA SAMA untuk "kode tidak ada" dan "nomor salah".
   *
   * Kalau dibedakan, halaman ini berubah jadi alat untuk menebak keberadaan
   * pesanan orang: siapa pun yang punya daftar kode bisa memeriksa satu per satu
   * dan mengetahui siapa yang sedang memesan. Karena itu `findOrderForTracking`
   * juga mengembalikan `null` untuk keduanya, dan di sini tidak ada elseif
   * yang membocorkan perbedaan itu.
   */
  if (!order) {
    return {
      error:
        "Kode pesanan atau nomor WhatsApp tidak cocok dengan pesanan mana pun. Periksa kembali, terutama nomor yang dipakai saat memesan.",
    };
  }

  return { order };
}
