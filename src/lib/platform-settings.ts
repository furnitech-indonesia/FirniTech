import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import {
  craftsmanCreditForWithRate,
  FEE_MASUK,
  FEE_PENCAIRAN,
  platformFeeForWithRate,
  PLATFORM_FEE_RATE_DEFAULT,
} from "@/lib/fees";
import { PLANS, priceYearly, type PlanId } from "@/lib/plans";

/**
 * Pembacaan pengaturan platform (Sprint 6).
 *
 * `src/lib/fees.ts` dan `src/lib/plans.ts` TETAP sumber kebenaran; berkas ini
 * hanya membaca PENIMPIS dari `platform_settings`. Kalau tabelnya kosong atau
 * barisnya belum pernah dibuat — database baru, atau seed belum dijalankan —
 * semua pembacaan jatuh ke konstanta di kode.
 *
 * Sifat itu bukan sekadar detail teknis. `fees.ts` sengaja TIDAK memakai
 * `server-only` supaya modal kalkulator di browser dan server membaca angka
 * yang sama. Kalau tarifnya hanya ada di database, modal kalkulator akan
 * menampilkan angka berbeda dari yang benar-benar dipakai saat checkout —
 * dan pengrajin yang sudah menghitung ulang biayanya akan menemukan selisihnya
 * setelah uang diterima. Kode tetap nilai default; database hanya dibaca
 * kalau ada override.
 *
 * KEDUA JALUR (kode dan database) memakai SATU rumus lewat
 * `platformFeeForWithRate`. Dua implementasi rumus yang sama pasti akan
 * menyimpang, dan `test:settings` memeriksa keduanya menghasilkan angka yang
 * identik.
 */

/** Baris pengaturan, atau `null` kalau belum pernah disimpan. */
export const loadSettingsRow = cache(async () => {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  return row ?? null;
});

/**
 * Tarif fee platform yang sedang berlaku, sebagai FRACTION.
 *
 * Dikembalikan sebagai pecahan (0,015) supaya bisa langsung dipakai
 * `platformFeeForWithRate` yang juga menerima pecahan — konversi basis points
 * terjadi tepat sekali, di sini.
 */
export async function effectivePlatformFeeRate(): Promise<number> {
  const row = await loadSettingsRow();
  const bps = row?.platformFeeRateBps ?? 0;
  return platformFeeRateFromBps(bps);
}

/** Basis points → fraction. Satu tempat, supaya tidak ada pembagian ganda. */
export function platformFeeRateFromBps(bps: number): number {
  return bps / 10_000;
}

/**
 * Fee platform untuk satu total pesanan, memakai tarif yang sedang berlaku.
 *
 * Pembulatan ke BAWAH, sama seperti `platformFeeFor` di `fees.ts`.
 * Membulatkan ke atas akan membuat platform menerima sedikit lebih dari
 * tarifnya di ribuan transaksi kecil, dan selisihnya terlihat sebagai
 * keuntungan yang tidak disepakati di rincian biaya.
 */
export async function platformFeeForRuntime(totalAmount: number): Promise<number> {
  return platformFeeForWithRate(totalAmount, await effectivePlatformFeeRate());
}

/**
 * Saldo pengrajin untuk satu pesanan, memakai tarif yang sedang berlaku.
 *
 * MEMANGGIL `craftsmanCreditForWithRate` dari `fees.ts`, bukan menghitung
 * ulang sendiri. Versi pertamanya hanya mengurangi fee platform — fee masuk
 * Rp 4.440 terlewat, dan itu menambah saldo pengrajin Rp 4.440 per pesanan.
 * Di layar itu muncul sebagai "saldo Rp 4.440 lebih banyak dari seharusnya",
 * yang baru ketahuan saat pencairan pertama benar-benar dikirim — dan yang
 * menanggung selisihnya adalah pengrajin, bukan platform.
 *
 * `test:settings` membandingkan fungsi ini dengan `fees.ts` di tujuh nilai
 * berbeda — termasuk yang kecil, tempat selisih fee masuk tidak bisa hilang
 * di pembulatan.
 */
export async function craftsmanCreditForRuntime(
  totalAmount: number,
): Promise<number> {
  return craftsmanCreditForWithRate(
    totalAmount,
    await effectivePlatformFeeRate(),
  );
}

/**
 * Bentuk hasil, bukan `PLANS[PlanId] & {...}`.
 *
 * Alasannya: `PLANS` punya `as const`, jadi `priceMonthly` bertipe literal
 * (`300000`). Kalau tipenya ikut terbawa ke hasil, override harga apa pun
 * tidak bisa dikompilasi — dan perubahan yang paling mungkin terjadi adalah
 * override-nya dihapus supaya typecheck hijau, yang membuat fiturnya tidak
 * pernah dipakai. Bentuk di bawah mengulang hanya field yang berubah, dengan
 * tipe yang longgar secara sadar.
 */
export type EffectivePlan = {
  id: PlanId;
  label: string;
  priceMonthly: number;
  priceYearly: number;
  /** `null` = tanpa batas, jadi bukan angka yang bisa dijumlahkan. */
  maxProducts: number | null;
  maxStaff: number | null;
  features: (typeof PLANS)[PlanId]["features"];
  /** Sumber angkanya, untuk ditampilkan di panel admin. */
  priceSource: "kode" | "override";
};

/**
 * Harga paket yang sedang berlaku, setelah override.
 *
 * Override disimpan PER PAKET dan TIDAK lengkap: paket yang tidak disebut
 * memakai harga dari `plans.ts`. Kalau override menyimpan seluruh blok, maka
 * menaikkan harga satu paket diam-diam juga mengubah harga paket lain yang
 * tidak sengaja ikut ditulis — dan yang kedua itu tidak pernah disetujui.
 *
 * `priceYearly` SELALU dihitung ulang dari bulanan yang berlaku lewat
 * `plans.ts`, tidak pernah diambil apa adanya dari override. Kalau harga
 * tahunan boleh diisi bebas, diskon 5% yang berlaku untuk semua paket
 * berhenti berlaku tanpa ada yang menyadarinya — dan yang mengetahuinya
 * adalah pengrajin yang membayar terlalu banyak selama setahun.
 */
export async function loadEffectivePlans(): Promise<Record<PlanId, EffectivePlan>> {
  const row = await loadSettingsRow();
  const overrides = row?.planPriceOverrides ?? {};

  const result = {} as Record<PlanId, EffectivePlan>;
  for (const id of Object.keys(PLANS) as PlanId[]) {
    const base = PLANS[id];
    const override = overrides[id];
    const monthly =
      typeof override?.monthly === "number" && override.monthly > 0
        ? override.monthly
        : base.priceMonthly;

    result[id] = {
      ...base,
      priceMonthly: monthly,
      priceYearly: priceYearly(monthly),
      priceSource:
        typeof override?.monthly === "number" && override.monthly > 0
          ? "override"
          : "kode",
    };
  }
  return result;
}

/** Harga bulanan satu paket yang sedang berlaku. */
export async function effectivePriceMonthly(
  planId: PlanId,
  period: "monthly" | "yearly",
): Promise<number> {
  const plans = await loadEffectivePlans();
  return period === "yearly"
    ? plans[planId].priceYearly
    : plans[planId].priceMonthly;
}

/**
 * Ringkasan untuk halaman pengaturan super admin.
 *
 * Sengaja menampilkan fee pencairan sebagai angka yang DIKUNCI, bukan yang
 * bisa diubah. Alasannya perlu terlihat di halaman yang sama dengan tarif yang
 * bisa diubah:fee pencairan yang kelihatan bisa diubah akanändert
 * dipertanyakan nanti saat rekening pengrajin gagal cair.
 */
export async function loadSettingsSummary() {
  const row = await loadSettingsRow();
  const rateBps = row?.platformFeeRateBps ?? 0;

  return {
    platformFeeRateBps: rateBps,
    /** True kalau tarifnya masih sama dengan default di `fees.ts`. */
    isDefaultRate: rateBps === PLATFORM_FEE_RATE_DEFAULT * 10_000,
    defaultRateBps: PLATFORM_FEE_RATE_DEFAULT * 10_000,
    planPriceOverrides: row?.planPriceOverrides ?? {},
    lockedFees: {
      masuk: FEE_MASUK,
      pencairan: FEE_PENCAIRAN,
    },
    updatedAt: row?.updatedAt ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}
