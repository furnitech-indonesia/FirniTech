"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import {
  parseInt10,
  parseOptionalInt,
  parseRupiah,
  requiredStr,
  slugify,
  str,
} from "@/lib/parse";
import { createProductImageSignedUrl, uploadProductImage } from "@/lib/storage";

/**
 * Katalog produk & variasi (ROADMAP Sprint 3).
 *
 * Dua aturan yang berlaku di SELURUH file ini:
 *   1. `tenantId` selalu dari `requireTenantWrite`, TIDAK PERNAH dari FormData.
 *   2. Baris yang di-update/di-hapus diverifikasi ulang tenantId-nya, karena
 *      knowing an id alone tidak cukup — tanpa cek ini user bisa mengedit
 *      produk tenant lain hanya dengan menebak UUID.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;

export type ProductFormState = { error?: string; message?: string };

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

      const name = requiredStr(formData, "name");
      let slug = slugify(str(formData, "slug") || name);
      if (!slug) return { error: "Slug tidak valid." };

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
        const path = await uploadProductImage({
          tenantId: actor.tenantId,
          productSlug: slug,
          file,
        });
        images = [path];
      }

      await db
        .insert(products)
        .values({
          tenantId: actor.tenantId,
          name,
          slug,
          description: str(formData, "description") || null,
          lengthCm: parseInt10(formData.get("lengthCm"), { min: 1 }),
          widthCm: parseInt10(formData.get("widthCm"), { min: 1 }),
          heightCm: parseInt10(formData.get("heightCm"), { min: 1 }),
          woodType: requiredStr(formData, "woodType"),
          finishingType: requiredStr(formData, "finishingType"),
          basePrice: parseRupiah(formData.get("basePrice")),
          isPublished: formData.get("isPublished") !== null,
          images,
        });

      revalidate();
      return { message: `Produk "${name}" tersimpan.` };
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
      const id = requiredStr(formData, "id");

      // Verifikasi kepemilikan sebelum update.
      const [owned] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, actor.tenantId)))
        .limit(1);
      if (!owned) return { error: "Produk tidak ditemukan." };

      const slug = slugify(str(formData, "slug") || requiredStr(formData, "name"));
      if (!slug) return { error: "Slug tidak valid." };

      await db
        .update(products)
        .set({
          name: requiredStr(formData, "name"),
          slug,
          description: str(formData, "description") || null,
          lengthCm: parseInt10(formData.get("lengthCm"), { min: 1 }),
          widthCm: parseInt10(formData.get("widthCm"), { min: 1 }),
          heightCm: parseInt10(formData.get("heightCm"), { min: 1 }),
          woodType: requiredStr(formData, "woodType"),
          finishingType: requiredStr(formData, "finishingType"),
          basePrice: parseRupiah(formData.get("basePrice")),
          isPublished: formData.get("isPublished") !== null,
        })
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
      const id = requiredStr(formData, "id");

      const deleted = await db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.tenantId, actor.tenantId)))
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
      const productId = requiredStr(formData, "productId");

      const [owned] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (!owned) return { error: "Produk tidak ditemukan." };

      const price = parseRupiah(formData.get("price"));

      await db.insert(productVariants).values({
        productId,
        name: requiredStr(formData, "name"),
        sku: str(formData, "sku") || null,
        lengthCm: parseOptionalInt(formData.get("lengthCm")),
        widthCm: parseOptionalInt(formData.get("widthCm")),
        heightCm: parseOptionalInt(formData.get("heightCm")),
        woodType: str(formData, "woodType") || null,
        finishingType: str(formData, "finishingType") || null,
        // Harga 0 berarti "pakai harga dasar", jadi simpan null.
        price: price > 0 ? price : null,
      });

      revalidatePath("/dashboard/produk");
      revalidatePath(`/dashboard/produk/${productId}`);
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
      const variantId = requiredStr(formData, "variantId");
      const productId = requiredStr(formData, "productId");

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

/** Signed URL untuk foto produk (bucket privat). Dipakai Server Component. */
export async function getProductImageUrl(path: string): Promise<string | null> {
  return createProductImageSignedUrl(path);
}
