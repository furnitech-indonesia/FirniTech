import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import {
  DOMAIN_ADDON,
  LEGALITAS_ADDON,
  type AddonKind,
} from "@/lib/addons";

/**
 * Harga add-on yang sedang berlaku (migrasi 0024).
 *
 * BERKAS INI `server-only`, dan itu perbedaan yang disengaja dari
 * `src/lib/addons.ts` yang tidak. Berkas itu berisi konstanta yang dibaca
 * klien (halaman harga) dan server, dan keduanya harus mendapat angka yang
 * sama. Berkas ini yang MEMBACA DATABASE, jadi hanya boleh jalan di server.
 *
 * `src/lib/addons.ts` TETAP sumber kebenaran, sama seperti `plans.ts` untuk
 * harga paket. Kalau override tidak ada, semua pembacaan jatuh ke konstanta.
 * Kalau tarifnya hanya ada di database, halaman harga akan menampilkan angka
 * berbeda dari yang benar-benar ditagih -- dan pengrajin yang sudah menghitung
 * ulang akan menemukan selisihnya setelah menekan tombol bayar.
 *
 * Override bersifat PARTIAL per add-on. Yang tidak disebut memakai harga di
 * kode. Kalau override menyimpan seluruh blok, menaikkan harga domain diam-diam
 * juga mengubah harga legalitas -- dan yang kedua itu tidak pernah disetujui.
 */

/** Harga Cloudflare .com per tahun. Satu-satunya sumber angka batas bawah. */
const CLOUDFLARE_COST_TAHUNAN = 188_667;

export const loadAddonOverrides = cache(async () => {
  const [row] = await db
    .select({ overrides: platformSettings.addonPriceOverrides })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  return row?.overrides ?? {};
});

/**
 * Bentuk hasil, bukan `typeof DOMAIN_ADDON` — lihat catatan yang sama di
 * `platform-settings.ts`: `as const` membuat tipenya literal, dan override
 * harga apa pun tidak akan bisa dikompilasi.
 */
export type EffectiveAddonPrice = {
  price: number;
  /** Sumber angkanya, untuk ditampilkan di panel admin. */
  priceSource: "kode" | "override";
};

const DEFAULT_HARGA: Record<AddonKind, number> = {
  domain: DOMAIN_ADDON.price,
  legalitas: LEGALITAS_ADDON.price,
};

/** Override aktif hanya kalau bilangan positif. */
function overrideFor(
  overrides: Partial<Record<AddonKind, number>>,
  kind: AddonKind,
): number | null {
  const value = overrides[kind];
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Harga jual satu add-on yang sedang berlaku.
 *
 * Override yang bernilai 0 atau negatif BUKAN dibaca sebagai "gratis".
 * Itu kondisi yang salah, dan membacanya sebagai harga berarti FurniTech
 * memberi domain tanpa dibayar.
 */
export async function effectiveAddonPrice(
  kind: AddonKind,
): Promise<EffectiveAddonPrice> {
  const overrides = await loadAddonOverrides();
  const override = overrideFor(overrides, kind);
  return {
    price: override ?? DEFAULT_HARGA[kind],
    priceSource: override === null ? "kode" : "override",
  };
}

/** Harga jual saja — bentuk yang dipakai saat membuat invoice. */
export async function effectiveAddonPriceNumber(
  kind: AddonKind,
): Promise<number> {
  return (await effectiveAddonPrice(kind)).price;
}

/**
 * Batas bawah harga domain.
 *
 * Dipisah ke konstanta supaya zod di `actions/settings.ts` dan pesan
 * kesalahannya berasal dari angka yang sama. Kalau keduanya punya angka
 * sendiri, keduanya bisa berbeda — dan tidak ada yang mengetahuinya sampai
 * ada domain yang dijual di bawah biaya.
 *
 * Export karena owner perlu melihat batasnya di halaman pengaturan, bukan
 * hanya membacanya di dalam pesan error.
 */
export const DOMAIN_PRICE_FLOOR = CLOUDFLARE_COST_TAHUNAN;

/**
 * Ringkasan untuk halaman pengaturan super admin.
 *
 * `lockedCosts` ditampilkan TERKUNCI, bukan bisa diubah, untuk alasan yang
 * sama seperti `FEE_MASUK` dan `FEE_PENCAIRAN` di pengaturan tarif: biaya
 * yang terlihat bisa diubah akan dipertanyakan saat tagihan tidak sesuai.
 * PNBP di sini bukan pilihan bisnis — itu tarif negara.
 */
export async function loadAddonSettingsSummary() {
  const overrides = await loadAddonOverrides();
  const domain = overrideFor(overrides, "domain");
  const legalitas = overrideFor(overrides, "legalitas");
  const domainPrice = domain ?? DOMAIN_ADDON.price;

  return {
    domain: {
      price: domainPrice,
      priceSource: domain === null ? ("kode" as const) : ("override" as const),
      floor: DOMAIN_PRICE_FLOOR,
      cost: CLOUDFLARE_COST_TAHUNAN,
      /*
       * Margin per domain per tahun. Dihitung di sini, bukan diketik di
       * markup: begitu owner mengubah harga, angka ini ikut berubah sendiri.
       * Ditampilkan di halaman pengrajin sebagai "bukan biaya tersembunyi" --
       * kalau marginnya negatif, pengrajin berhak tahu sebelum membayar.
       */
      margin: domainPrice - CLOUDFLARE_COST_TAHUNAN,
    },
    legalitas: {
      price: legalitas ?? LEGALITAS_ADDON.price,
      priceSource:
        legalitas === null ? ("kode" as const) : ("override" as const),
    },
    lockedCosts: {
      pnbp: LEGALITAS_ADDON.pnbp,
      ops: LEGALITAS_ADDON.ops,
    },
  };
}
