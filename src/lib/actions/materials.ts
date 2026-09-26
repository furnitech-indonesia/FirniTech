"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { materialAdjustments, materials } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseForm } from "@/lib/schemas/primitives";
import {
  adjustStockSchema,
  createMaterialSchema,
  materialIdSchema,
  updateMaterialSchema,
} from "@/lib/schemas/material";

/**
 * Inventaris bahan baku (ROADMAP Sprint 3) + Low Stock Alert.
 *
 * Aturan stok: kolom `materials.quantity` HANYA boleh berubah lewat penyesuaian
 * yang tercatat di `material_adjustments`. Perubahan langsung tanpa jejak
 * tidak diizinkan di sini — kalau ada, riwayatnya tidak bisa
 * dipertanggungjawabkan saat stock opname.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;

export type MaterialFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function createMaterial(
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  return guard<MaterialFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(createMaterialSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const data = parsed.data;

      const [created] = await db
        .insert(materials)
        .values({
          tenantId: actor.tenantId,
          name: data.name,
          category: data.category,
          unit: data.unit,
          // Kolom numeric di Drizzle bertipe string.
          minStockAlert: String(data.minStockAlert),
          quantity: String(data.quantity),
        })
        .returning({ id: materials.id });

      // Stok awal dicatat sebagai penyesuaian agar quantity selalu punya jejak.
      if (data.quantity !== 0) {
        await db.insert(materialAdjustments).values({
          tenantId: actor.tenantId,
          materialId: created!.id,
          delta: String(data.quantity),
          reason: "pembelian",
          note: "Stok awal saat bahan dibuat",
          createdByUserId: actor.userId,
        });
      }

      revalidatePath("/dashboard/materials");
      return { message: `Bahan "${data.name}" ditambahkan.` };
    },
    (error) => ({ error }),
  );
}

export async function updateMaterial(
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  return guard<MaterialFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(updateMaterialSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { id, ...data } = parsed.data;

      const [owned] = await db
        .select({ id: materials.id })
        .from(materials)
        .where(
          and(eq(materials.id, id), eq(materials.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!owned) return { error: "Bahan tidak ditemukan." };

      await db
        .update(materials)
        .set({
          name: data.name,
          category: data.category,
          unit: data.unit,
          minStockAlert: String(data.minStockAlert),
        })
        .where(eq(materials.id, id));

      revalidatePath("/dashboard/materials");
      return { message: "Bahan diperbarui." };
    },
    (error) => ({ error }),
  );
}

/**
 * Penyesuaian stok (+/-). Memperbarui quantity DAN mencatat adjustment dalam
 * satu transaksi, supaya tidak mungkin keduanya terpisah.
 */
export async function adjustStock(
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  return guard<MaterialFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(adjustStockSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { materialId, delta, reason, note } = parsed.data;

      const [material] = await db
        .select({
          id: materials.id,
          quantity: materials.quantity,
          unit: materials.unit,
        })
        .from(materials)
        .where(
          and(
            eq(materials.id, materialId),
            eq(materials.tenantId, actor.tenantId),
          ),
        )
        .limit(1);

      if (!material) return { error: "Bahan tidak ditemukan." };

      const current = Number(material.quantity);
      const next = current + delta;
      if (next < 0) {
        return {
          error: `Stok tidak boleh minus. Saat ini ${current} ${material.unit}.`,
          fieldErrors: { delta: "Stok akan menjadi negatif." },
        };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(materials)
          .set({ quantity: String(next) })
          .where(eq(materials.id, materialId));

        await tx.insert(materialAdjustments).values({
          tenantId: actor.tenantId,
          materialId,
          delta: String(delta),
          reason,
          note,
          createdByUserId: actor.userId,
        });
      });

      revalidatePath("/dashboard/materials");
      return { message: "Stok diperbarui." };
    },
    (error) => ({ error }),
  );
}

export async function deleteMaterial(
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  return guard<MaterialFormState>(
    async () => {
      const actor = await requireTenantWrite(["owner"]);

      const parsed = parseForm(materialIdSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }

      const deleted = await db
        .delete(materials)
        .where(
          and(
            eq(materials.id, parsed.data.id),
            eq(materials.tenantId, actor.tenantId),
          ),
        )
        .returning({ id: materials.id });

      if (deleted.length === 0) {
        return { error: "Bahan tidak ditemukan." };
      }

      revalidatePath("/dashboard/materials");
      return { message: "Bahan dihapus beserta riwayatnya." };
    },
    (error) => ({ error }),
  );
}

/**
 * Bahan yang menyentuh atau di bawah ambang minimum.
 * Dipakai untuk Low Stock Alert di dashboard.
 */
export async function getLowStockMaterials(tenantId: string) {
  return db
    .select()
    .from(materials)
    .where(
      and(
        eq(materials.tenantId, tenantId),
        lte(sql`${materials.quantity}`, sql`${materials.minStockAlert}`),
      ),
    );
}
