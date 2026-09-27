import "server-only";

import { createSnapCharge, type SnapCharge } from "./snap";

/**
 * Tagihan PESANAN PEMBELI (Sprint 5).
 *
 * Terpisah dari `saas.ts` karena nama item dan halaman tujuannya berbeda, dan
 * karena nomor order_id-nya punya bentuk yang berbeda juga:
 *
 *   SaaS : "saas-<8 hex userId>-<timestamp>"  → lives di `saas_invoices`
 *   Order: "ord-<12 hex orderId>"             → lives di `orders`
 *
 * webhook-nya harus bisa membedakan keduanya dari `order_id` itu saja,
 * karena notifikasi tidak membawa knowlegya itu.
 */

export type OrderChargeInput = {
  /** `orders.midtrans_order_id`. WAJIB diisi sebelum memanggil ini. */
  orderId: string;
  amount: number;
  customerName: string;
  /** Midtrans butuh email; pembeli storefront belum tentu punya. */
  customerEmail: string;
  customerPhone: string;
  orderCode: string;
  itemSummary: string;
  finishUrl: string;
};

export async function createOrderCharge(
  input: OrderChargeInput,
): Promise<SnapCharge> {
  return createSnapCharge({
    orderId: input.orderId,
    amount: input.amount,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    /*
     * `item_details[0].name` ditagam Midtrans untuk ditampilkan di halaman
     * pembayaran. Maksimumnya 50 karakter dan tidak boleh mengandung newline,
     * jadi ringkasan barang dipotong di sini, bukan di pemanggil.
     */
    itemName: `Pesanan ${input.orderCode} - ${input.itemSummary}`
      .replace(/\s+/g, " ")
      .slice(0, 50),
    finishUrl: input.finishUrl,
  });
}
