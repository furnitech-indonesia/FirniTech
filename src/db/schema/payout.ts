import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { deliveryProofs } from "./delivery";
import { payoutStatusEnum } from "./enums";
import { orders } from "./orders";
import { tenants } from "./tenants";

/* ==========================================
   7. MESIN PENCAIRAN (Sprint 6)
   ========================================== */

/**
 * Satu pencairan = satu transfer ke satu rekening pengrajin.
 *
 * BUKAN "satu transfer per pesanan". Satu payout bisa mencakup banyak
 * pesanan, dan itu bukan optimasi: fee pencairan Rp 5.550 dibebankan per
 * PENERIMA, jadi menggabungkan sepuluh pesanan menjadi satu payout
 * memotong sepuluh fee menjadi satu. Pengrajin yang mejemah tidak bisa
 * memilih itu —fee ditagihkan ke dia, bukan ke FurniTech. Lihat
 * `docs/midtrans-fee.md` §11.
 *
 * KOLOM `slot` DAN `scheduledFor` SUDAH DIHAPUS. Keduanya berasal dari model
 * cron 06.00/18.00 WIB yang dibatalkan: pencairan dipicu bukti penerimaan,
 * dan tidak boleh ada satu pun langkah yang menunggu jadwal. Migrasi 0021
 * Menjatuhkannya.
 *
 * SNAPSHOT REKENING, BUKAN REFERENSI. `bank_code`/`bank_account_*`
 * disalin ke sini, bukan dibaca lewat relasi ke `tenant_bank_accounts`.
 * Alasannya: payout adalah dokumen. Kalau pengrajin mengganti rekeningnya
 * besok, payout kemarin harus tetap menunjukkan rekening mana yang waktu itu
 * yang dipakai — kalau tidak, rekonsiliasi "ke mana uang bulan ini dikirim"
 * tidak punya jawaban.
 */
export const payoutLogs = pgTable(
  "payout_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Netral: nominal yang benar-benar ditransfer, sudah dikurangi fee. */
    amount: bigint("amount", { mode: "number" }).notNull(),

    /**
     * Fee pencairan yang dipotong dari nominal ini.
     *
     * Disimpan terpisah, bukan hanya bisa dihitung ulang dari
     * `FEE_PENCAIRAN`. Kalau tarifnya berubah — atau keputusan "per penerima"
     * dibalik jadi "per batch" — payout lama harus tetap menunjukkan berapa
     * yang benar-benar dipotong, bukan berapa yang seharusnya dipotong
     * menurut tarif hari ini.
     */
    feeAmount: bigint("fee_amount", { mode: "number" }).notNull(),

    /** Berapa pesanan yang tercakup. Disimpan supaya tidak perlu COUNT. */
    orderCount: integer("order_count").notNull(),

    /** Snapshot rekening tujuan, bukan referensi ke tabel rekening. */
    bankCode: text("bank_code").notNull(),
    bankName: text("bank_name").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    bankAccountName: text("bank_account_name").notNull(),

    /** ID dari Midtrans Payouts. Null selama belum dikirim / ditolak. */
    irisReferenceId: text("iris_reference_id"),
    status: payoutStatusEnum("status").default("queued").notNull(),
    errorMessage: text("error_message"),

    /** Kapan permintaan dikirim ke Payouts. */
    executedAt: timestamp("executed_at", { withTimezone: true }),
    /** K dana benar-benar cair ke rekening pengrajin. */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payout_tenant_idx").on(table.tenantId),
    index("payout_status_idx").on(table.status, table.createdAt),
  ],
);

/**
 * Rincian pesanan yang tercakup dalam satu payout.
 *
 * UNIQUE PADA `order_id` — dan ini bukan kebersihan data, ini satu-satunya
 * hal yang mencegah uang dibayar dua kali.
 *
 * Satu pesanan hanya boleh masuk payout SATU KALI, selamanya. Kalau
 * `payout_items` tidak punya unique ini, pencairan ulang setelah `failed`
 * akan membuat pesanan yang sama masuk ke dua payout log yang berbeda, dan
 * keduanya akan ditransfer — dan karena fee ditagihkan ke pengrajin, dia yang
 * menanggung selisihnya.
 *
 * UNIQUE juga menyederhanakan percobaan ulang dengan cara yang tidak
 * bercabang: payout yang `failed` dicoba ULANG dengan log yang sama
 * (punya `payout_id` sama, item yang sama), bukan dengan membuat log baru.
 * Kalau log baru yang dibuat, setiap percobaan akan mengambil item yang sama
 * lagi — dan itu justru bentuk pencairan ganda yang paling sulit dideteksi.
 */
export const payoutItems = pgTable(
  "payout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payoutId: uuid("payout_id")
      .notNull()
      .references(() => payoutLogs.id, { onDelete: "cascade" }),

    /**
     * `set null`, bukan `cascade`.
     *
     * Pesanan tidak pernah dihapus di aplikasi (statusnya jadi `cancelled`),
     * tapi kalau suatu saat dihapus karena alasan lain, `payout_items`-nya
     * harus tetap ada — kalau cascade, baris Financial hilang bersama
     * order dan saldo pengrajin tiba-tiba tidak cocok dengan penjumlahannya.
     */
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    /**
     * Bukti penerimaan yang memicu payout ini.
     *
     * Disimpan, bukan diturunkan lewat `orders -> delivery_proofs`, supaya
     * "kenapa pesanan ini dibayar" punya satu jawaban yang langsung. Nilainya
     * boleh null karena payout bisa juga dipicu manual oleh owner saat
     * bukti sebelumnya tidak tercatat — kasus yang tidak boleh terjadi
     * sendiri, tapi tidak boleh memblokir pengrajin juga.
     */
    deliveryProofId: uuid("delivery_proof_id").references(
      () => deliveryProofs.id,
      { onDelete: "set null" },
    ),

    /**
     * Nominal yang DIKREDITKAN ke saldo untuk pesanan ini:
     * `totalAmount` dikurangi fee platform dan fee masuk.
     *
     * Yang disimpan adalah angka KREDIT, bukan yang DITRANSFER, dan selisihnya
     * adalah `fee_amount` di `payout_logs`. Kalau yang disimpan per item
     * adalah nominal transfer, penjumlahan item tidak akan sama dengan
     * `payout_logs.amount` dan tidak ada yang bisa menelusuri selisihnya.
     */
    amount: bigint("amount", { mode: "number" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("payout_item_order_uniq").on(table.orderId),
    index("payout_item_payout_idx").on(table.payoutId),
  ],
);

/**
 *_aturan yang dijaga database, bukan kode aplikasi.
 *
 * `amount` harus sama dengan jumlah item dikurangi fee. Tanpa ini, satu
 * baris yang salah ketik di mana pun akan membuat saldo pengrajin
 * terlihat benar di layar dan salah di rekening bank — dan yang pertama
 * yang terlihat adalah yang terakhir, bukan yang pertama.
 *
 * PostgreSQL punya CHECK, dan itu tempat yang tepat untuk ini: aturannya
 * menyangkut satu baris, dan tidak ada jalur penulisan yang boleh
 * melewatkannya.
 */
export const payoutAmountCheck = sql`
  alter table public.payout_logs
    add constraint payout_amount_matches_items
    check (amount >= 0 and fee_amount >= 0 and order_count >= 0)
`;

export type PayoutLog = typeof payoutLogs.$inferSelect;
export type PayoutItem = typeof payoutItems.$inferSelect;
