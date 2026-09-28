import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./tenants";

/* ==========================================
   10. PENGATURAN PLATFORM (Sprint 6)
   ========================================== */

/**
 * Pengaturan yang boleh diubah super admin tanpa deploy.
 *
 * SATU BARIS SAJA. `singleton` di primary key literal `1` memastikan itu:
 * tanpa batasan itu, "baris terbaru" jadi tidak terdefinisi dan dua admin
 * yang menyimpan di detik yang sama akan menghasilkan dua sumber tarif.
 * `onConflictDoUpdate({ target: id })` di action membuat setiap penyimpanan
 * memperbarui baris yang sama, bukan menyisipkan yang baru.
 *
 * SOAL APA YANG SEBAIKNYA DI SINI:
 *
 * Yang bisa diubah: tarif fee platform, dan harga paket kalau memang perlu.
 * Yang SENGAJA TIDAK bisa diubah dari sini: `FEE_MASUK` dan `FEE_PENCAIRAN`.
 * Keduanya sudah dikonfirmasi ke Midtrans dan berubah hanya kalau Midtrans
 * mengubahnya. Membuat bisa diubahnya berarti tarif yang sedang berjalan bisa
 * bergerak tanpa ada yang memutuskan, dan pengrajin yang sudah melihat
 * angka di kalkulatornya menemukan yang berbeda saat menekan tombol checkout.
 *
 * SATU-SATUNYA sumber kebenaran tetap `src/lib/fees.ts`. Tabel ini adalah
 * PENIMPIS, bukan pengganti: kalau `id = 1` tidak ada (database baru, seed
 * belum dijalankan), semua pembacaan jatuh ke konstanta di sana. Itu
 * penting karena `fees.ts` sengaja tidak memakai `server-only` supaya modal
 * kalkulator di browser dan server membaca angka yang sama — kalau tarifnya
 * hanya ada di database, modal kalkulator akan menampilkan angka yang
 * berbeda dari yang benar-benar dipakai saat checkout.
 */
export const platformSettings = pgTable("platform_settings", {
  /** Selalu 1. Lihat catatan di atas. */
  id: integer("id").primaryKey().default(1),

  /**
   * Fee platform dalam BASIS POINTS, bukan persen desimal.
   *
   * 150 = 1,5%. Desimal disimpan sebagai `150` dan bukan `0.015` karena
   * `0.015` tidak bisa direpresentasikan persis di floating point, dan
   * pembulatan yang muncul dari sana akan terlihat sebagai selisih rupiah
   * pada tagihan yang jauh lebih besar dari selisihnya sendiri.
   *
   * Default 0 — keputusan pemilik produk: FurniTech tidak mengambil
   * persentase dari transaksi, pendapatannya dari langganan.
   */
  platformFeeRateBps: integer("platform_fee_rate_bps").default(0).notNull(),

  /**
   * Override harga paket, atau NULL untuk memakai default `PLANS`.
   *
   * Bentuknya `{ basic: { monthly, yearly }, ... }` dan TIDAK lengkap: paket
   * yang tidak disebut memakai harga dari `src/lib/plans.ts`. Penyimpanan
   * per paket, bukan satu blok yang menimpa semuanya, supaya menaikkan harga
   * satu paket tidak diam-diam mengubah harga paket lain yang tidak
   * sengaja ikut ditulis.
   *
   * NULL adalah keadaan yang paling sering, dan itu benar: harga default
   * ada di kode, yang bisa direview.
   */
  planPriceOverrides: jsonb("plan_price_overrides").$type<
    Partial<Record<string, { monthly?: number; yearly?: number }>>
  >(),

  /**
   * Override harga jual add-on, atau NULL untuk memakai `src/lib/addons.ts`.
   *
   * Bentuk dan sifatnya sama persis dengan `planPriceOverrides` di atas:
   * per item, tidak lengkap, dan yang tidak disebut memakai harga di kode.
   * Menyusun bentuk lain hanya menambah satu tempat yang harus dipahami.
   *
   * YANG TIDAK ADA DI SINI adalah beban add-on. PNBP Rp 50.000 ditetapkan
   * PP 30/2026 pasal 33 -- itu tarif negara, bukan angka bisnis, dan
   * mengubahnya di panel berarti mengarang tarif yang ditampilkan ke
   * pelanggan sebagai "biaya negara".
   *
   * Override tidak retroactive: `saasInvoices.amount` adalah snapshot,
   * jadi invoice yang sudah terbit tetap memakai harga lamanya.
   */
  addonPriceOverrides: jsonb("addon_price_overrides").$type<
    Partial<Record<"domain" | "legalitas", number>>
  >(),

  /** Siapa yang terakhir menyimpan. Untuk rekonsiliasi perubahan tarif. */
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
