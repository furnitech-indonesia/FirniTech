import "server-only";

import { createSnapCharge, type SnapCharge } from "./snap";

/**
 * Tagihan LANGSUNGAN SAAS (Sprint 10 Fase D).
 *
 * Pemanggil bisnis dari transport generik di `snap.ts`. Yang dibedakan hanya
 * bagaimana tagihan itu dijelaskan ke pembeli: nama item dan halaman tujuan.
 */

export type { SnapCharge as SaasCharge };

export async function createSaasCharge(input: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  itemName: string;
  finishUrl: string;
}): Promise<SnapCharge> {
  return createSnapCharge(input);
}
