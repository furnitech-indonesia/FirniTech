"use server";

import { addToCartLine, clearCart, setCartLineQty } from "@/lib/cart";
import { parseForm } from "@/lib/schemas/primitives";
import { z } from "zod";
import type { FormState } from "@/components/form-state";

/**
 * Aksi keranjang pembeli storefront.
 *
 * Nilai harga TIDAK PERNAH dipakai: hanya `productSlug` dan `qty`. Harga, ongkir,
 * dan nama produk semuanya diambil ulang di `createCheckoutOrder`. Cookie
 * keranjang memang boleh diedit orang — lihat catatan panjangnya di
 * src/lib/cart.ts soal kenapa itu tidak masalah.
 */

const addSchema = z.object({
  productSlug: z.string().trim().min(1).max(80),
  qty: z.coerce.number().int().min(1).max(99).default(1),
});

const qtySchema = z.object({
  productSlug: z.string().trim().min(1).max(80),
  qty: z.coerce.number().int().min(0).max(99),
});

export async function addToCart(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(addSchema, formData);
  if (!parsed.success) {
    return { error: "Produk tidak valid.", fieldErrors: parsed.fieldErrors };
  }

  await addToCartLine(parsed.data.productSlug, parsed.data.qty);
  return { message: "Masuk keranjang." };
}

export async function updateCartQty(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(qtySchema, formData);
  if (!parsed.success) {
    return { error: "Jumlah tidak valid.", fieldErrors: parsed.fieldErrors };
  }

  await setCartLineQty(parsed.data.productSlug, parsed.data.qty);
  return { message: "Keranjang diperbarui." };
}

export async function emptyCart(): Promise<void> {
  await clearCart();
}
