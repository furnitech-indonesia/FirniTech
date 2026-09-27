"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { shippingRates } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseForm } from "@/lib/schemas/primitives";
import { shippingRateFormSchema } from "@/lib/schemas/shipping";
/*
 * Query (`listShippingRates`, `findShippingRate`, `needsReviewCount`) berada di
 * src/lib/shipping.ts, bukan di sini, dan SENGAJA TIDAK diekspor ulang.
 *
 * Berkas "use server" hanya boleh mengekspor async function. Coba
 * `export { findShippingRate } from "@/lib/shipping"` di sini, dan Turbopack
 * menarik seluruh graf modul ke bundel klien — termasuk drizzle dan
 * next/cache — lalu build gagal dengan "Ecmascript file had an error".
 *
 * `typecheck` tetap lolos, karena yang rusak adalah batas modul runtime, bukan
 * tipenya.
 *
 * Pemanggil mengimpornya langsung dari "@/lib/shipping".
 */
import { revalidatePath } from "next/cache";

/**
 * Manajemen tarif ongkir (Sprint 5 bagian 3).
 *
 * Semua action lewat `requireTenantWrite`, dan `tenantId` SELALU dari guard —
 * tidak pernah dari FormData. Kalau tenantId berasal dari klien, satu tenant
 * bisa menulis atau menghapus tarif milik tenant lain.
 *
 * Role: owner dan admin_penjualan. Tukang TIDAK boleh — tarif ongkir adalah
 * keputusan bisnis, bukan pekerjaan produksi.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;

export type ShippingFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  savedId?: string;
};

export type ShippingRateRow = {
  id: string;
  regencyId: string | null;
  isDefault: boolean;
  cityName: string;
  provinceName: string;
  rateAmount: number;
};

export async function saveShippingRate(
  _prev: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  return guard<ShippingFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(shippingRateFormSchema, formData);
      if (!parsed.success) {
        return {
          error: "Periksa kembali isian tarif.",
          fieldErrors: parsed.fieldErrors,
        };
      }
      const input = parsed.data;
      const id = formData.get("id");

      /*
       * Hanya boleh mengedit tarif milik tenant sendiri. `id` dari FormData
       * tidak dipercaya tanpa Growaman, jadi update di-backoffice memakai
       * `id AND tenantId` di dalam klausa WHERE — kalau id-nya milik tenant
       * lain, affected rows = 0 dan hasilnya "tidak ditemukan".
       */
      const where = id
        ? and(
            eq(shippingRates.id, String(id)),
            eq(shippingRates.tenantId, actor.tenantId),
          )
        : eq(shippingRates.tenantId, actor.tenantId);

      /*
       * Hanya boleh satu tarif cadangan per tenant, dijamin unique index
       * `shipping_one_default_uniq`. Jadi sebelum menyalakan yang baru, yang
       * lama dimatikan dulu — kalau tidak, penyimpanannya gagal dengan
       * pelanggaran unique index dan pengrajin tidak akan pernah bisa mengganti
       * tarif cadangannya.
       */
      if (input.isDefault) {
        await db
          .update(shippingRates)
          .set({ isDefault: false })
          .where(
            and(
              eq(shippingRates.tenantId, actor.tenantId),
              eq(shippingRates.isDefault, true),
            ),
          );
      }

      const values = {
        regencyId: input.regencyId || null,
        isDefault: input.isDefault,
        cityName: input.cityName,
        provinceName: input.provinceName,
        rateAmount: input.rateAmount,
      };

      if (id) {
        const [updated] = await db
          .update(shippingRates)
          .set(values)
          .where(where)
          .returning({ id: shippingRates.id });
        if (!updated) {
          return { error: "Tarif tidak ditemukan." };
        }
        revalidatePath("/dashboard/pengaturan/ongkir");
        return { message: "Tarif diperbarui.", savedId: updated.id };
      }

      const [created] = await db
        .insert(shippingRates)
        .values({ ...values, tenantId: actor.tenantId })
        .returning({ id: shippingRates.id });

      revalidatePath("/dashboard/pengaturan/ongkir");
      return { message: "Tarif disimpan.", savedId: created.id };
    },
    (error) => ({ error }),
  );
}

export async function deleteShippingRate(
  _prev: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  return guard<ShippingFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);
      const id = formData.get("id");
      if (typeof id !== "string" || !id) {
        return { error: "Tarif tidak dikenali." };
      }

      const [deleted] = await db
        .delete(shippingRates)
        .where(
          and(
            eq(shippingRates.id, id),
            eq(shippingRates.tenantId, actor.tenantId),
          ),
        )
        .returning({
          id: shippingRates.id,
          wasDefault: shippingRates.isDefault,
        });

      if (!deleted) return { error: "Tarif tidak ditemukan." };

      /*
       * Menghapus tarif cadangan berarti tenant tidak lagi punya jaring
       * pengaman, dan SETIAP pembeli di luar daftar tarif khusus akan
       * terkunci. Itu bukan kondisi yang boleh dibiarkan diam-diam, jadi
       * pesannya eksplisit.
       */
      revalidatePath("/dashboard/pengaturan/ongkir");
      return {
        message: deleted.wasDefault
          ? "Tarif cadangan dihapus. Tanpa tarif cadangan, pembeli di luar daftar tarif khusus tidak bisa checkout — tambahkan tarif cadangan lagi."
          : "Tarif dihapus.",
      };
    },
    (error) => ({ error }),
  );
}
