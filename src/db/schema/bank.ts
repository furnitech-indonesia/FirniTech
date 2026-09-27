import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { bankAccountStatusEnum } from "./enums";
import { tenants } from "./tenants";

/* ==========================================
   9. REKENING PENCIRAN PER TENANT (Sprint 6)
   ========================================== */

/**
 * Rekening tujuan payout — SATU BARIS PER TENANT.
 *
 * KENAPA TABEL TERPISAH, BUKAN KOLOM DI `tenants`:
 *
 * Kolomnya sempat ada di `tenants` dan itu salah. Policy `tenants_select` di
 * `drizzle/0001_rls` adalah `id = current_tenant_id()` — tanpa penyaringan
 * role — sehingga siapa pun yang punya `tenantId` bisa membaca baris itu,
 * termasuk akun `kurir`, dan `account_name` bisa berisi nama orang.
 *
 * Dua mekanisme yang biasanya dipakai menutup ini sama-sama tidak bisa:
 *
 *   - **RLS menyaring BARIS.** Baris tenant ini memang "milik" kurir juga,
 *     jadi tidak ada yang bisa disaring.
 *   - **GRANT menyaring KOLOM per peran DATABASE.** Tapi owner, admin
 *     penjualan, dan kurir semuanya memakai peran `authenticated` yang sama;
 *     tidak ada peran database per peran aplikasi.
 *
 * Tabel terpisah dengan policy sendiri adalah satu-satunya cara yang bisa
 * ditegakkan: `tenant_bank_accounts_read` hanya meloloskan `owner` dan
 * `admin_penjualan`, jadi kurir benar-benar tidak bisa membacanya. Dan ini
 * otomatis diuji `test:kurir` lewat JWT kurir sungguhan — bukan dengan
 * membaca teks policy-nya.
 *
 * `tenantId` adalah PRIMARY KEY, bukan uuid terpisah plus unique index. Satu
 * tenant memang hanya boleh punya satu rekening tujuan (PRD §2.C), jadi
 * primary key menyatakan aturan bisnis itu secara langsung — dan `onConflict`
 * jadi idempoten tanpa perlu logika tambahan di pemanggil.
 *
 * TIDAK ada unique index pada `account_number`. Dua toko dengan pemilik yang
 * sama sah-sah saja memakai rekening yang sama, dan melarangnya akan
 * mencegah keadaan yang sah dan tidak berbahaya. Aturan bisnis yang ini
 * belum diputuskan, jadi tidak dikarang di sini.
 *
 * Nomor rekening disimpan TANPA spasi dan tanpa tanda hubung, sudah
 * dinormalisasi di server (`normalizeBankAccount`): nomor yang sama bisa
 * diketik `1234-5678` atau `12345678`, dan menyimpan apa adanya berarti
 * payout yang sama gagal — atau lebih buruk, berhasil ke rekening berbeda,
 * tergantung cara pengrajin mengetiknya.
 */
export const tenantBankAccounts = pgTable("tenant_bank_accounts", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),

  /** Kode bank versi Midtrans, mis. "bca". BUKAN nama bank yang diketik. */
  bankCode: text("bank_code").notNull(),
  /** Label bank untuk ditampilkan, mis. "Bank Central Asia (BCA)". */
  bankName: text("bank_name").notNull(),
  /** Nomor rekening, sudah dinormalisasi menjadi angka saja. */
  accountNumber: text("account_number").notNull(),
  /**
   * Nama pemilik rekening.
   *
   * Setelah verifikasi berhasil, ini berisi NAMA DARI BANK, bukan yang
   * diketik pengrajin — karena nilai inilah yang akan ditampilkan ke
   * pembeli pada COD transfer bank.
   */
  accountName: text("account_name").notNull(),

  status: bankAccountStatusEnum("status").default("unverified").notNull(),
  /** Kapan verifikasi terakhir berhasil. */
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  /**
   * Alasan kalau status `failed`, dalam bahasa manusia.
   *
   * Disimpan supaya pengrajin melihat pesan yang sama setelah halaman
   * di-refresh, dan supaya super admin bisa menindaklanjuti tanpa meminta
   * pengrajin menerjemahkan error.
   */
  validationMessage: text("validation_message"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type TenantBankAccount = typeof tenantBankAccounts.$inferSelect;
export type NewTenantBankAccount = typeof tenantBankAccounts.$inferInsert;
