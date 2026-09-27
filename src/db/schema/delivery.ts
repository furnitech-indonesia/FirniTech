import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { orders } from "./orders";
import { tenants, users } from "./tenants";

/* ==========================================
   8. BUKTI PENERIMAAN (Sprint 6)
   ========================================== */

/**
 * Bukti barang diterima: foto barang + tanda tangan yang menerima.
 *
 * INI ADALAH PEMICU PENCAIRAN. Tidak ada tombol "cairkan" — uang pengrajin
 * bergerak karena ada baris di sini. Itu keputusan produk yang disengaja
 * (ROADMAP, bagian "Model Biaya & Payout"): jadwal cron 06.00/18.00 WIB
 * dihapus karena tidak boleh ada satu pun langkah yang menunggu pembeli, dan
 * pembeli tidak punya kewajiban apa pun kepada sistem.
 *
 * TIGA KOLOM YANG BUKAN SEKADAR DATA:
 *
 *  1. `courierId` disimpan, bukan dibaca lewat `orders.assigned_courier_id`.
 *     Penugasan bisa berubah atau dilepas setelah pengiriman, dan kalau
 *     bukti diturunkan dari relasi, bukti lama ikut berubah artinya. Bukti
 *     harus mencatat siapa yang benar-benar mengantar, pada saat ia mengantar.
 *
 *  2. `signerName` terpisah dari `orders.customerName`. Yang menandatangani
 *     belum tentu pembeli — bisa keluarga, tetangga, atau satpam. Mencatat
 *     siapa yang benar-benar menerima adalah satu-satunya cara agar bukti ini
 *     berguna di kemudian hari.
 *
 *  3. `codAmount` nullable dan bertipe `bigint` (rupiah penuh, tanpa
 *     desimal — aturan ini berlaku untuk semua uang di repo ini). NULL berarti
 *     pesanan ini bukan COD. 0 TIDAK boleh dipakai sebagai "tidak ada": nol
 *     adalah nilai sah untuk "diterima tanpa uang masuk", dan
 *     membedakannya dari NULL penting saat rekonsiliasi.
 *
 * KOLOM COD (`codAmount`, `codProofPath`) sengaja ikut di sini dan bukan
 * ditambahkan terpisah, karena keduanya dikurir yang mengisinya di tempat,
 * di saat yang sama. Menambahkan kolomnya belakangan berarti mengubah
 * trigger-trigger yang sudah berjalan.
 *
 * Baris ini APEND-ONLY. Trigger di database menolak UPDATE dan DELETE,
 * karena bukti yang bisa diubah bukan bukti — dan pemicunya pencairan, jadi
 * perubahannya berarti uang bergerak berdasarkan data yang bisa direkayasa.
 */
export const deliveryProofs = pgTable(
  "delivery_proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * UNIQUE: satu bukti per pesanan, bukan beberapa.
     *
     * Alasannya bukan sekadar kebersihan: pencairan memicu dari baris ini,
     * jadi dua bukti untuk satu pesanan berarti pencairan dua kali, atau
     * keadaan di mana yang kedua hanya terpotong sebagian. Uniqueness
     * ditegakkan di database, bukan di action, karena action bisa dipanggil
     * dua kali bersamaan — kurir menekan tombol dua kali karena internet
     * lambat, dan `if (!existing)` di aplikasi tidak menutup race itu.
     */
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Kurir yang benar-benar mengantar, bukan sekadar yang ditugaskan. */
    courierId: uuid("courier_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** Object path di bucket privat `delivery-proofs`, BUKAN URL. */
    photoPath: text("photo_path").notNull(),
    /** Tanda tangan, hasil render canvas di layar HP kurir, disimpan PNG. */
    signaturePath: text("signature_path").notNull(),

    /** Nama yang menandatangani. Tidak diasumsikan sama dengan pembeli. */
    signerName: text("signer_name").notNull(),

    /** Catatan singkat: barang ditolak, alamat tidak ditemukan, dll. */
    notes: text("notes"),

    /**
     * Uang COD yang diterima di tempat. NULL = bukan pesanan COD.
     * Adanya `codProofPath` sudah berarti "sudah difoto", jadi tidak ada
     * kolom boolean untuk itu — dua sumber kebenaran yang bisa berbeda
     * berarti uang hilang tanpa jejak.
     */
    codAmount: bigint("cod_amount", { mode: "number" }),
    codProofPath: text("cod_proof_path"),

    /** Kapan barang diterima menurut kurir. BUKAN waktu unggah. */
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("delivery_proof_order_uniq").on(table.orderId),
    // Halaman /kurir selalu memfilter `courierId`; halaman detail pesanan
    // selalu memfilter `tenantId`.
    index("delivery_proof_courier_idx").on(table.courierId),
    index("delivery_proof_tenant_idx").on(table.tenantId),
  ],
);

export type DeliveryProof = typeof deliveryProofs.$inferSelect;
export type NewDeliveryProof = typeof deliveryProofs.$inferInsert;
