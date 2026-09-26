"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { materialAdjustments, materials } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseDecimal, requiredStr, str } from "@/lib/parse";

/**
 * Inventaris bahan baku (ROADMAP Sprint 3) + Low Stock Alert.
 *
 * Aturan stok: kolom `materials.quantity` HANYA boleh berubah lewat penyesuaian
 * yang tercatat di `material_adjustments`. Penambahan/pengurangan langsung
 * tanpa jejak tidak diizinkan di sini — kalau ada, riwayatnya tidak bisa
 * dipertanggungjawabkan saat stock opname.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;
const REASONS = [
  "pembelian",
  "pemakaian",
  "rusak",
  "koreksi",
  "retur",
] as const;
type Reason = (typeof REASONS)[number];

export type MaterialFormState = { error?: string; message?: string };

export async function createMaterial(
  _prev: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  return guard<MaterialFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const name = requiredStr(formData, "name");
      const initialQty = parseDecimal(formData.get("quantity"), 0);

      const [created] = await db
        .insert(materials)
        .values({
          tenantId: actor.tenantId,
          name,
          category: requiredStr(formData, "category"),
          unit: requiredStr(formData, "unit"),
          // Kolom numeric di Drizzle bertipe string; kirim sebagai teks.
          minStockAlert: String(parseDecimal(formData.get("minStockAlert"), 5)),
          quantity: String(initialQty),
        })
        .returning({ id: materials.id });

      // Stok awal dicatat sebagai penyesuaian agar quantity selalu punya jejak.
      if (initialQty !== 0) {
        await db.insert(materialAdjustments).values({
          tenantId: actor.tenantId,
          materialId: created!.id,
          delta: String(initialQty),
          reason: "pembelian",
          note: "Stok awal saat bahan dibuat",
          createdByUserId: actor.userId,
        });
      }

      revalidatePath("/dashboard/materials");
      return { message: `Bahan "${name}" ditambahkan.` };
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
      const id = requiredStr(formData, "id");

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
          name: requiredStr(formData, "name"),
          category: requiredStr(formData, "category"),
          unit: requiredStr(formData, "unit"),
          minStockAlert: String(parseDecimal(formData.get("minStockAlert"), 5)),
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
      const materialId = requiredStr(formData, "materialId");
      const reasonRaw = requiredStr(formData, "reason") as Reason;

      if (!REASONS.includes(reasonRaw)) {
        return { error: "Alasan penyesuaian tidak valid." };
      }

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

      // Stok masuk ("+5") dan stok keluar ("-2") memakai satu kolom agar form
      // tetap sederhana.
      const raw = str(formData, "delta");
      const delta = parseDecimal(raw.startsWith("+") ? raw.slice(1) : raw, 0);
      if (delta === 0) return { error: "Jumlah perubahan tidak boleh nol." };

      const current = Number(material.quantity);
      const next = current + delta;
      if (next < 0) {
        return {
          error: `Stok tidak boleh minus. Saat ini ${current} ${material.unit}.`,
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
          reason: reasonRaw,
          note: str(formData, "note") || null,
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
      const id = requiredStr(formData, "id");

      const deleted = await db
        .delete(materials)
        .where(
          and(eq(materials.id, id), eq(materials.tenantId, actor.tenantId)),
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
        lte(
          sql`${materials.quantity}`,
          sql`${materials.minStockAlert}`,
        ),
      ),
    );
}
