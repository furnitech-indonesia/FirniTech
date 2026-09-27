import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { shippingRates } from "@/db/schema";

/**
 * Query tarif ongkir (Sprint 5 bagian 3).
 *
 * Dipisah dari `src/lib/actions/shipping.ts` karena berkas itu
 * `"use server"` dan mengimpor `next/cache` + `next/navigation` — yang hanya
 * jalan di dalam bundler Next. Fungsi-fungsi di sini murni pembacaan data
 * dan tidak butuh salah satu pun, jadi bisa dipakai dari skrip uji dan dari
 * Server Component tanpa menarik konteks router.
 */

export type ShippingRateRow = {
  id: string;
  regencyId: string | null;
  isDefault: boolean;
  cityName: string;
  provinceName: string;
  rateAmount: number;
};

/** Daftar tarif milik tenant, urut berdasarkan nama kota. */
export async function listShippingRates(tenantId: string): Promise<ShippingRateRow[]> {
  return db
    .select({
      id: shippingRates.id,
      regencyId: shippingRates.regencyId,
      isDefault: shippingRates.isDefault,
      cityName: shippingRates.cityName,
      provinceName: shippingRates.provinceName,
      rateAmount: shippingRates.rateAmount,
    })
    .from(shippingRates)
    .where(eq(shippingRates.tenantId, tenantId))
    .orderBy(sql`${shippingRates.cityName} asc`);
}

/**
 * Cari tarif ongkir untuk satu kabupaten/kota.
 *
 * URUTAN PENCOCOKAN — jangan diubah tanpa memikirkan ulang:
 *   1. Tarif khusus dengan `regencyId` yang persis sama.
 *   2. Tarif cadangan tenant (`isDefault = true`).
 *   3. `null` = tidak ada tarif sama sekali.
 *
 * Yang TIDAK ada di sini, dan itu disengaja:
 *
 *   - **Pencocokan berdasarkan nama kota.** "Bandung" bisa berarti Kabupaten
 *     Bandung (32.04) atau Kota Bandung (32.73), dan "Jakarta" tidak ada
 *     sebagai satu kabupaten sama sekali — dia dipecah jadi lima "Kota
 *     Administrasi Jakarta *". Pencocokan teks akan memilih kota yang salah
 *     tanpa error, dan tidak ada yang mengetahuinya sampai pembeli protes.
 *
 *   - **`?? 0` atau tarif terkecil sebagai jaring pengaman.** Pembeli yang
 *     melihat total murah lalu membayar, sementara ongkir sebenarnya tidak
 *     ditagih, adalah kegagalan diam-diam yang paling merusak di checkout.
 *     Kalau tidak ada tarif, pemanggil WAJIB memblokir.
 */
export async function findShippingRate(
  tenantId: string,
  regencyId: string | null,
): Promise<{ rateAmount: number; source: "specific" | "default" } | null> {
  if (regencyId) {
    const [exact] = await db
      .select({ rateAmount: shippingRates.rateAmount })
      .from(shippingRates)
      .where(
        and(
          eq(shippingRates.tenantId, tenantId),
          eq(shippingRates.regencyId, regencyId),
        ),
      )
      .limit(1);
    if (exact) return { rateAmount: exact.rateAmount, source: "specific" };
  }

  const [fallback] = await db
    .select({ rateAmount: shippingRates.rateAmount })
    .from(shippingRates)
    .where(
      and(
        eq(shippingRates.tenantId, tenantId),
        eq(shippingRates.isDefault, true),
      ),
    )
    .limit(1);
  if (fallback) return { rateAmount: fallback.rateAmount, source: "default" };

  return null;
}

/**
 * Berapa tarif yang masih berupa "umum" dan belum dipilih kabupatennya.
 *
 * Hasil backfill, dan sengaja ditampilkan di halaman pengaturan alih-alih
 * disembunyikan. Baris seperti "Bandung" dulu tidak bisa dipetakan ke satu
 * kabupaten, jadi selama belum dipilih ia berlaku untuk SEMUA wilayah — dan
 * kalau tarifnya tidak sesuai, itu rupiah yang keliru ditarik dari pembeli
 * nyata.
 */
export async function needsReviewCount(tenantId: string): Promise<number> {
  const rows = await db
    .select({ id: sql`${shippingRates.id}` })
    .from(shippingRates)
    .where(
      and(
        eq(shippingRates.tenantId, tenantId),
        isNull(shippingRates.regencyId),
        eq(shippingRates.isDefault, false),
      ),
    );
  return rows.length;
}
