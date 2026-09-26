import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  conversationStatusEnum,
  materialAdjustmentReasonEnum,
} from "./enums";
import { materials, products } from "./catalog";
import { tenants, users } from "./tenants";

/* ==========================================
   9. VARIASI PRODUK & INVENTARIS
   ========================================== */

/**
 * Variasi mebel (ROADMAP Sprint 3: "Katalog Produk & Variasi Mebel").
 *
 * `products` menyimpan atribut dasar (dimensi, jenis kayu, finishing, harga
 * dasar) yang diperlakukan sebagai varian bawaan. Tabel ini menampung
 * variasi tambahan seperti ukuran jumbo atau pilihan kayu lain, sehingga
 * katalog tetap ringkas tanpa kehilangan detail yang dibutuhkan pembeli.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    name: text("name").notNull(), // e.g., "Ukuran Jumbo", "Kayu Sono"
    sku: text("sku"),

    // Dimensi & material per variasi (cm)
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    woodType: text("wood_type"),
    finishingType: text("finishing_type"),

    /** Harga variasi rupiah penuh. Null = pakai harga dasar produk. */
    price: bigint("price", { mode: "number" }),

    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("variant_product_idx").on(table.productId),
    uniqueIndex("variant_sku_uniq").on(table.productId, table.sku),
  ],
);

/**
 * Riwayat perubahan stok bahan baku.
 *
 * Stok tanpa riwayat tidak dapat dipercaya untuk pembukuan, jadi setiap
 * penyesuaian dicatat. `quantity` pada tabel materials selalu merupakan hasil
 * penjumlahan seluruh adjustment — jangan pernah diubah langsung.
 */
export const materialAdjustments = pgTable(
  "material_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),

    /** Posisi = stok bertambah, negatif = berkurang. */
    delta: numeric("delta", { precision: 12, scale: 3 }).notNull(),
    reason: materialAdjustmentReasonEnum("reason").notNull(),
    note: text("note"),

    /** Siapa yang melakukan penyesuaian (audit). */
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("adjustment_material_idx").on(table.materialId, table.createdAt),
    index("adjustment_tenant_idx").on(table.tenantId, table.createdAt),
  ],
);

/* ==========================================
   10. CUSTOMER SERVICE / LIVE CHAT
   ========================================== */

/** Percakapan per pembeli di satu tenant. Pembeli tidak punya akun, jadi key-nya nomor HP. */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),

    /** Status percakapan untuk triase inbox. */
    status: conversationStatusEnum("status").default("open").notNull(),
    /** Staf yang menangani; null = belum ada yang mengambil. */
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** Penghitung belum dibalas, supaya inbox bisa diurutkan. */
    unreadCount: integer("unread_count").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("conversation_tenant_status_idx").on(table.tenantId, table.status),
    // Satu percakapan aktif per nomor HP per tenant
    uniqueIndex("conversation_tenant_phone_uniq").on(
      table.tenantId,
      table.customerPhone,
    ),
  ],
);

/** Isi percakapan. Pesan pembeli masuk lewat widget storefront (Sprint 5). */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    /** null = dikirim pembeli (anon), terisi = dikirim staf tenant. */
    senderUserId: uuid("sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_message_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
