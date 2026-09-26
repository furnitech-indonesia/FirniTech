import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { orderSourceEnum, orderStatusEnum, paymentStatusEnum } from "./enums";
import { products } from "./catalog";
import { customerAddresses } from "./shipping";
import { tenants, users } from "./tenants";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/* ==========================================
   5. TRANSAKSI & PESANAN
   ========================================== */

/**
 * Pesanan pembeli. Semua kolom uang = rupiah penuh (bigint).
 * Rantai dana: totalAmount → dipotong midtransMdrFee + platformServiceFee (1.5%)
 * → netTenantAmount = sisa yang dicairkan via IRIS.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderCode: text("order_code").notNull(), // e.g., ORD-8821
    /** storefront = dibuat pembeli; manual = dicatat staf (Custom Order Builder). */
    source: orderSourceEnum("source").default("storefront").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Data pelanggan
    // Alamat disimpan di customer_addresses agar bisa dipakai ulang
    // ("kirim lagi ke alamat lama"), lalu tetap DI-SNAPSHOT ke baris di bawah
    // supaya histori order tidak berubah bila pembeli mengedit alamatnya.
    customerAddressId: uuid("customer_address_id").references(
      () => customerAddresses.id,
      { onDelete: "set null" },
    ),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address").notNull(),
    destinationCity: text("destination_city").notNull(),

    // Rincian biaya (rupiah penuh)
    itemsSubtotal: bigint("items_subtotal", { mode: "number" }).notNull(),
    shippingFee: bigint("shipping_fee", { mode: "number" }).notNull(),
    /** All-in total = itemsSubtotal + shippingFee, yang dilihat pembeli. */
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),

    // Potongan fee transaksi
    midtransMdrFee: bigint("midtrans_mdr_fee", { mode: "number" })
      .default(0)
      .notNull(),
    /** Platform Service Fee FurniTech 1.5% dari totalAmount. */
    platformServiceFee: bigint("platform_service_fee", { mode: "number" })
      .default(0)
      .notNull(),
    /** Sisa yang akan dicairkan ke rekening pengrajin via IRIS. */
    netTenantAmount: bigint("net_tenant_amount", { mode: "number" })
      .default(0)
      .notNull(),

    // DP / pelunasan (Sprint 3: Custom Order Builder)
    /** Nominal DP yang sudah dibayar; 0 = belum ada DP. */
    dpAmount: bigint("dp_amount", { mode: "number" }).default(0).notNull(),

    // Integrasi Midtrans (Sprint 5)
    midtransOrderId: text("midtrans_order_id"),
    snapToken: text("snap_token"),
    transactionId: text("transaction_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    // Status
    orderStatus: orderStatusEnum("order_status").default("pending_dp").notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("unpaid")
      .notNull(),

    // Penugasan tukang
    assignedCarpenterId: uuid("assigned_carpenter_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),

    // Resi pengiriman
    cargoName: text("cargo_name"), // e.g., Indah Logistik Kargo
    trackingNumber: text("tracking_number"),

    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("order_tenant_idx").on(table.tenantId),
    index("order_tenant_status_idx").on(table.tenantId, table.orderStatus),
    index("order_customer_addr_idx").on(table.customerAddressId),
    uniqueIndex("order_code_idx").on(table.orderCode),
    uniqueIndex("order_midtrans_idx").on(table.midtransOrderId),
  ],
);

/** Baris item pesanan. productName di-snapshot agar katalog berubah tidak merusak histori. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),

    /** Spesifikasi kustom bila pesanan di luar katalog (Custom Order Builder). */
    customSpecs: jsonb("custom_specs").$type<{
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
      woodType?: string;
      finishingType?: string;
      notes?: string;
    }>(),

    price: bigint("price", { mode: "number" }).notNull(), // rupiah penuh / satuan
    quantity: integer("quantity").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_item_order_idx").on(table.orderId)],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
