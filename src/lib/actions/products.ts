"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseForm } from "@/lib/schemas/primitives";
import {
  deleteVariantSchema,
  productIdSchema,
  productSchema,
  variantSchema,
} from "@/lib/schemas/product";
import { slugify } from "@/lib/parse";
import { uploadProductImage } from "@/lib/storage";

/**
 * Katalog produk & variasi (ROADMAP Sprint 3).
 *
 * Empat aturan berlaku di seluruh file ini:
 *   1. `tenantId` selalu dari `requireTenantWrite`, TIDAK PERNAH dari FormData.
 *   2. Baris yang di-update/di-hapus diverifikasi ulang tenantId-nya —
 *      knowing an UUID saja tidak cukup.
 *   3. Otorisasi (guard) SELALU lebih dulu, baru validasi skema. Kalau validasi
 *      didahulukan, server membocorkan bentuk data yang diterima ke pemanggil
 *      yang tidak berhak.
 *   4. Upload file tervalidasi terpisah di src/lib/storage.ts.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;

export type ProductFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function revalidate(tenantSlugHint?: string) {
  revalidatePath("/dashboard/produk");
  if (tenantSlugHint) revalidatePath(`/t/${tenantSlugHint}`);
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return guard<ProductFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(productSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const data = parsed.data;

      // Slug dari input, atau diturunkan dari nama.
      let slug = data.slug ?? slugify(data.name);
      if (!slug) return { error: "Slug tidak valid.", fieldErrors: { name: "Slug tidak valid." } };

      // Slug unik per tenant; kalau bentrok, tambahkan sufiks acak.
      const [clash] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.tenantId, actor.tenantId), eq(products.slug, slug)))
        .limit(1);
      if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      // Foto opsional: satu file per submit (multi-upload menyusul).
      const file = formData.get("image");
      let images: string[] = [];
      if (file instanceof File && file.size > 0) {
        images = [
          await uploadProductImage({
            tenantId: actor.tenantId,
            productSlug: slug,
            file,
          }),
        ];
      }

      await db.insert(products).values({
        tenantId: actor.tenantId,
        name: data.name,
        slug,
        description: data.description,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        woodType: data.woodType,
        finishingType: data.finishingType,
        basePrice: data.basePrice,
        isPublished: data.isPublished,
        images,
      });

      revalidate();
      return { message: `Produk "${data.name}" tersimpan.` };
    },
    (error) => ({ error }),
  );
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return guard<ProductFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(productSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { id, ...data } = parsed.data;

      // Verifikasi kepemilikan sebelum update.
      const [owned] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, actor.tenantId)))
        .limit(1);
      if (!owned) return { error: "Produk tidak ditemukan." };

      await db
        .update(products)
        .set({ ...data, slug: data.slug ?? slugify(data.name) })
        .where(eq(products.id, id));

      revalidate();
      return { message: "Produk diperbarui." };
    },
    (error) => ({ error }),
  );
}

export async function deleteProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return guard<ProductFormState>(
    async () => {
      const actor = await requireTenantWrite(["owner"]); // hapus = owner saja

      const parsed = parseForm(productIdSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }

      const deleted = await db
        .delete(products)
        .where(
          and(
            eq(products.id, parsed.data.id),
            eq(products.tenantId, actor.tenantId),
          ),
        )
        .returning({ id: products.id });

      if (deleted.length === 0) {
        return { error: "Produk tidak ditemukan." };
      }

      // Variasi ikut terhapus via cascade; order_items tidak (set null) agar
      // histori pesanan tetap utuh.
      revalidate();
      return { message: "Produk dihapus." };
    },
    (error) => ({ error }),
  );
}

export async function createVariant(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return guard<ProductFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(variantSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const data = parsed.data;

      const [owned] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(eq(products.id, data.productId), eq(products.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!owned) return { error: "Produk tidak ditemukan." };

      await db.insert(productVariants).values({
        productId: data.productId,
        name: data.name,
        sku: data.sku,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        woodType: data.woodType,
        finishingType: data.finishingType,
        // null = pakai harga dasar produk.
        price: data.price,
      });

      revalidatePath("/dashboard/produk");
      revalidatePath(`/dashboard/produk/${data.productId}`);
      return { message: "Variasi ditambahkan." };
    },
    (error) => ({ error }),
  );
}

export async function deleteVariant(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return guard<ProductFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(deleteVariantSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { variantId, productId } = parsed.data;

      const [owned] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(eq(products.id, productId), eq(products.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!owned) return { error: "Produk tidak ditemukan." };

      await db
        .delete(productVariants)
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(productVariants.productId, productId),
          ),
        );

      revalidatePath(`/dashboard/produk/${productId}`);
      return { message: "Variasi dihapus." };
    },
    (error) => ({ error }),
  );
}
