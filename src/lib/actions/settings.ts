"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { integrationAuditLogs, platformSettings } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { platformFeeRateFromBps } from "@/lib/platform-settings";
import { DOMAIN_ADDON, LEGALITAS_ADDON } from "@/lib/addons";
import { DOMAIN_PRICE_FLOOR } from "@/lib/addons/settings";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * Simpan pengaturan platform (Sprint 6).
 *
 * AKSES: `requireSuperAdmin`. Bukan `requireTenantWrite` — tabel ini tidak
 * punya `tenant_id` sama sekali, jadi tidak ada tenant yang bisa menulisnya.
 *
 * YANG TIDAK BISA DIUBAH DI SINI, dan itu disengaja: `FEE_MASUK` (Rp 4.440)
 * dan `FEE_PENCAIRAN` (Rp 5.550). Keduanya sudah dikonfirmasi ke Midtrans.
 * Membuatnya bisa diubah berarti tarif yang sedang berjalan bisa bergerak
 * tanpa ada yang memutuskan, dan pengrajin yang sudah menghitung ulang
 * biayanya di kalkulator akan menemukan angka berbeda saat menekan tombol
 * checkout.
 *
 * SATU BARIS. `onConflictDoUpdate` pada `id = 1` membuat setiap penyimpanan
 * memperbarui baris yang sama. Menyisipkan baris baru setiap kali akan
 * membuat tarif aktif jadi "baris terbaru" — yang tidak terdefinisi kalau
 * dua admin menyimpan di detik yang sama.
 */
export type SettingsState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Tarif dalam basis points, bukan persen desimal.
 *
 * 150 = 1,5%. Batas atas 10000 (100%) bukan pilihan: fee di atas total
 * berarti platform owe pengrajin, dan `platform_fee_rate_bps` CHECK di
 * database sudah menolak nilai seperti itu. Schema di sini menolak lebih
 * dulu supaya pesannya bisa dibaca.
 */
const settingsSchema = z.object({
  platformFeeRateBps: z.coerce
    .number()
    .int("Tarif harus bilangan bulat dalam basis points (150 = 1,5%).")
    .min(0, "Tarif tidak boleh negatif.")
    .max(10_000, "Tarif tidak boleh lebih dari 100%."),

  /**
   * Harga bulanan per paket, KOSONG berarti pakai harga di `plans.ts`.
   *
   * Fields-nya `basicPrice`, `proPrice`, `maxPrice` — bukan array — karena
   * `z.object` dengan key literal memberi pesan error yang menyebut paketnya.
   * `basicPrice: "abc"` menghasilkan pesan yang menyebut Basic, sedangkan
   * `prices[0]` menghasilkan "prices.0 tidak valid" yang tidak berguna bagi
   * orang yang sedang mengetik.
   */
  basicPrice: z.coerce
    .number()
    .int("Harga harus rupiah penuh, tanpa titik atau koma.")
    .min(0, "Harga tidak boleh negatif.")
    .max(100_000_000, "Harga terlalu tinggi.")
    .optional(),
  proPrice: z.coerce
    .number()
    .int("Harga harus rupiah penuh, tanpa titik atau koma.")
    .min(0, "Harga tidak boleh negatif.")
    .max(100_000_000, "Harga terlalu tinggi.")
    .optional(),
  maxPrice: z.coerce
    .number()
    .int("Harga harus rupiah penuh, tanpa titik atau koma.")
    .min(0, "Harga tidak boleh negatif.")
    .max(100_000_000, "Harga terlalu tinggi.")
    .optional(),

  /**
   * Harga jual add-on custom domain. KOSONG = pakai harga di `addons.ts`.
   *
   * Batas bawahnya adalah harga cost Cloudflare, dan itu BUKAN angka
   * Dresden: menjual domain di bawah Rp 188.667 berarti memberi rugi pada
   * setiap renewal, dan ruginya baru terlihat di rekonsiliasi tahunan.
   * Batas yang sama ditegakkan lagi di CHECK database, karena setiap jalur
   * penulisan lain bisa melewati zod.
   */
  domainAddonPrice: z.coerce
    .number()
    .int("Harga harus rupiah penuh, tanpa titik atau koma.")
    .min(
      DOMAIN_PRICE_FLOOR,
      `Harga domain tidak boleh di bawah biaya Cloudflare (Rp ${DOMAIN_PRICE_FLOOR.toLocaleString("id-ID")}/tahun).`,
    )
    .max(100_000_000, "Harga terlalu tinggi.")
    .optional(),

  /**
   * Harga jual paket pendirian PT. Tidak ada batas bawah karena tidak ada
   * biaya variabel per-unit yang besar -- biayanya flat (PNBP + ongkos),
   * jadi harga di bawah beban hanya rugi, bukan rugi berulang.
   */
  legalitasAddonPrice: z.coerce
    .number()
    .int("Harga harus rupiah penuh, tanpa titik atau koma.")
    .min(1, "Harga tidak boleh nol.")
    .max(100_000_000, "Harga terlalu tinggi.")
    .optional(),
});

export async function savePlatformSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const actor = await requireSuperAdmin();

  const parsed = settingsSchema.safeParse({
    platformFeeRateBps: formData.get("platformFeeRateBps"),
    basicPrice: emptyToUndefined(formData.get("basicPrice")),
    proPrice: emptyToUndefined(formData.get("proPrice")),
    maxPrice: emptyToUndefined(formData.get("maxPrice")),
    domainAddonPrice: emptyToUndefined(formData.get("domainAddonPrice")),
    legalitasAddonPrice: emptyToUndefined(formData.get("legalitasAddonPrice")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      error: "Periksa kembali isian pengaturan.",
      fieldErrors,
    };
  }

  const {
    platformFeeRateBps,
    basicPrice,
    proPrice,
    maxPrice,
    domainAddonPrice,
    legalitasAddonPrice,
  } = parsed.data;

  /*
   * Override hanya berisi paket yang MEMANG berubah.
   *
   * Paket yang field-nya kosong dihapus dari override, bukan ditulis sebagai
   * harga default. Itu yang membuat override bersifat partial: mengisi kolom
   * "Pro" tidak boleh diam-diam ikut mengubah Basic dan Max, dan penghapusan
   * override harus semudah mengosongkan kolomnya.
   */
  const overrides: Record<string, { monthly: number }> = {};
  const given: Array<[PlanId, number | undefined]> = [
    ["basic", basicPrice],
    ["pro", proPrice],
    ["max", maxPrice],
  ];
  for (const [id, price] of given) {
    if (price !== undefined && price !== PLANS[id].priceMonthly) {
      overrides[id] = { monthly: price };
    }
  }

  const nextOverrides = Object.keys(overrides).length > 0 ? overrides : null;

  /*
   * Override add-on, dengan sifat yang SAMA: hanya add-on yang nilainya
   * benar-benar berubah, dan mengosongkan kolom menghapus override-nya.
   *
   * Dua add-on disimpan sebagai dua kunci terpisah, bukan satu blok yang
   * menimpa keduanya. Kalau satu blok, menaikkan harga domain diam-diam
   * juga mengubah harga legalitas -- dan yang kedua itu tidak pernah
   * disetujui siapa pun.
   */
  const addonOverrides: Partial<Record<"domain" | "legalitas", number>> = {};
  if (
    domainAddonPrice !== undefined &&
    domainAddonPrice !== DOMAIN_ADDON.price
  ) {
    addonOverrides.domain = domainAddonPrice;
  }
  if (
    legalitasAddonPrice !== undefined &&
    legalitasAddonPrice !== LEGALITAS_ADDON.price
  ) {
    addonOverrides.legalitas = legalitasAddonPrice;
  }
  const nextAddonOverrides =
    Object.keys(addonOverrides).length > 0 ? addonOverrides : null;

  const [before] = await db
    .select({
      bps: platformSettings.platformFeeRateBps,
      overrides: platformSettings.planPriceOverrides,
      addonOverrides: platformSettings.addonPriceOverrides,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);

  await db
    .insert(platformSettings)
    .values({
      id: 1,
      platformFeeRateBps,
      planPriceOverrides: nextOverrides,
      addonPriceOverrides: nextAddonOverrides,
      updatedBy: actor.userId,
    })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: {
        platformFeeRateBps,
        planPriceOverrides: nextOverrides,
        addonPriceOverrides: nextAddonOverrides,
        updatedBy: actor.userId,
      },
    });

  /*
   * Audit log. WAJIB: tarif fee menyentuh SETIAP pesanan dan SETIAP pencairan,
   * jadi "kapan tarif berubah dan siapa yang mengubahnya" adalah pertanyaan
   * yang pasti muncul saat ada selisih. Yang dicatat hanya nilai SEBELUM dan
   * SESUDAH — cukup untuk menjelaskan selisihnya tanpa menyalin data yang
   * tidak perlu.
   */
  await db.insert(integrationAuditLogs).values({
    tenantId: null,
    service: "supabase",
    action: "platform_settings_saved",
    status: "success",
    requestMeta: {
      rateBpsBefore: before?.bps ?? 0,
      rateBpsAfter: platformFeeRateBps,
      ratePercentAfter: platformFeeRateFromBps(platformFeeRateBps),
      overridesBefore: before?.overrides ?? null,
      overridesAfter: nextOverrides,
      addonOverridesBefore: before?.addonOverrides ?? null,
      addonOverridesAfter: nextAddonOverrides,
    },
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/");
  revalidatePath("/daftar");

  const changedPlans = Object.keys(overrides);
  const changedAddons = Object.keys(addonOverrides);
  return {
    message:
      `Tarif fee platform ${(platformFeeRateFromBps(platformFeeRateBps) * 100).toLocaleString("id-ID")}%` +
      (changedPlans.length > 0
        ? ` · harga paket diubah: ${changedPlans.join(", ")}`
        : " · harga paket tidak berubah") +
      (changedAddons.length > 0
        ? ` · harga add-on diubah: ${changedAddons.join(", ")}`
        : " · harga add-on tidak berubah"),
  };
}

/** `FormData.get` mengembalikan `""` untuk field kosong; itu berarti "hapus override". */
function emptyToUndefined(
  value: FormDataEntryValue | null,
): number | undefined {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return Number(value);
}
