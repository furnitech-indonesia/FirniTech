import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  uuid,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS (Tipe Data Konstan)
// ==========================================

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "pro",
  "max",
]);

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "owner",
  "admin_penjualan",
  "tukang",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_dp",
  "in_production",
  "quality_control",
  "ready_to_ship",
  "shipped",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "dp_paid",
  "fully_paid",
  "refunded",
]);

export const progressStageEnum = pgEnum("progress_stage", [
  "bahan_dipotong",
  "perakitan",
  "finishing",
  "packing_qc",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "queued",
  "processing",
  "success",
  "failed",
]);

// ==========================================
// 2. TABEL UTAMA SAAS & MULTI-TENANT
// ==========================================

// Tabel Tenant / Toko Pengrajin
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(), // Nama Workshop / Toko
    slug: text("slug").notNull().unique(), // Subdomain bawaan (misal: mebeljaya)
    customDomain: text("custom_domain").unique(), // Custom domain (misal: mebeljaya.com)
    customDomainVerified: boolean("custom_domain_verified").default(false),
    
    // Informasi Pemilik & Bank untuk Payout IRIS
    bankName: text("bank_name").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    bankAccountName: text("bank_account_name").notNull(),
    
    // Langganan SaaS
    plan: subscriptionPlanEnum("plan").default("basic").notNull(),
    subscriptionStatus: text("subscription_status").default("active").notNull(),
    subscriptionExpiresAt: timestamp("subscription_expires_at").notNull(),
    
    // Status Tenant
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("tenant_slug_idx").on(table.slug),
    domainIdx: uniqueIndex("tenant_domain_idx").on(table.customDomain),
  })
);

// Tabel Pengguna (RBAC terhubung ke Supabase Auth & Tenant)
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Match dengan Supabase auth.users.id
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // Nullable untuk Super Admin
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    role: userRoleEnum("role").default("admin_penjualan").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("user_tenant_idx").on(table.tenantId),
  })
);

// ==========================================
// 3. INVENTARIS & KATALOG PRODUK
// ==========================================

// Tabel Material / Bahan Baku (Internal Pengrajin)
export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(), // e.g., Papan Kayu Jati 200x20
    category: text("category").notNull(), // Kayu, Finishing, Hardware, Busa
    quantity: numeric("quantity", { precision: 10, scale: 2 }).default("0").notNull(),
    unit: text("unit").notNull(), // m3, Liter, Pcs, Lembar
    minStockAlert: numeric("min_stock_alert", { precision: 10, scale: 2 }).default("5").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantMaterialIdx: index("material_tenant_idx").on(table.tenantId),
  })
);

// Tabel Katalog Produk Mebel
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    
    // Dimensi Mebel (Panjang x Lebar x Tinggi)
    lengthCm: integer("length_cm").notNull(),
    widthCm: integer("width_cm").notNull(),
    heightCm: integer("height_cm").notNull(),
    
    // Detail Spesifikasi
    woodType: text("wood_type").notNull(), // e.g., Kayu Jati Perhutani
    finishingType: text("finishing_type").notNull(), // e.g., Natural Matte
    
    // Harga dasar (sebelum ongkir kargo)
    basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
    images: jsonb("images").$type<string[]>().notNull(), // Array URL foto produk
    
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantProductIdx: index("product_tenant_idx").on(table.tenantId),
    tenantSlugIdx: uniqueIndex("product_tenant_slug_idx").on(table.tenantId, table.slug),
  })
);

// Tabel Matriks Tarif Kargo per Kota Tujuan
export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    cityName: text("city_name").notNull(), // Nama Kota/Kabupaten
    provinceName: text("province_name").notNull(),
    rateAmount: numeric("rate_amount", { precision: 10, scale: 2 }).notNull(), // Tarif flat kargo
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantCityIdx: index("shipping_tenant_city_idx").on(table.tenantId, table.cityName),
  })
);

// ==========================================
// 4. TRANSAKSI & PESANAN (ORDERS)
// ==========================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderCode: text("order_code").notNull().unique(), // e.g., ORD-8821
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    
    // Data Pelanggan
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address").notNull(),
    destinationCity: text("destination_city").notNull(),
    
    // Rincian Biaya
    itemsSubtotal: numeric("items_subtotal", { precision: 12, scale: 2 }).notNull(),
    shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(), // All-In Total
    
    // Potongan Fee Transaksi
    midtransMdrFee: numeric("midtrans_mdr_fee", { precision: 10, scale: 2 }).default("0"),
    platformServiceFee: numeric("platform_service_fee", { precision: 10, scale: 2 }).default("0"), // 1.5% Fee FurniTech
    netTenantAmount: numeric("net_tenant_amount", { precision: 12, scale: 2 }).default("0"), // Sisa cair via IRIS
    
    // Status
    orderStatus: orderStatusEnum("order_status").default("pending_dp").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    
    // Penugasan Tukang
    assignedCarpenterId: uuid("assigned_carpenter_id").references(() => users.id, { onDelete: "set null" }),
    
    // Resi Pengiriman
    cargoName: text("cargo_name"), // e.g., Indah Logistik Kargo
    trackingNumber: text("tracking_number"),
    
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantOrderIdx: index("order_tenant_idx").on(table.tenantId),
    orderCodeIdx: uniqueIndex("order_code_idx").on(table.orderCode),
  })
);

// Tabel Item Pesanan
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  
  // Custom Specs jika berupa pesanan kustom
  customSpecs: jsonb("custom_specs").$type<{
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    woodType?: string;
    finishingType?: string;
  }>(),
  
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
});

// ==========================================
// 5. PROGRESS TRACKER & PAYOUT IRIS LOGS
// ==========================================

// Tabel Foto Progres Produksi oleh Tukang
export const productionProgress = pgTable(
  "production_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    carpenterId: uuid("carpenter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    stage: progressStageEnum("stage").notNull(),
    photoUrl: text("photo_url").notNull(),
    notes: text("notes"),
    waNotificationSent: boolean("wa_notification_sent").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderProgressIdx: index("progress_order_idx").on(table.orderId),
  })
);

// Tabel Audit Log Payout IRIS (Eksekusi 06.00 & 18.00 WIB)
export const payoutLogs = pgTable(
  "payout_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    bankName: text("bank_name").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    
    irisReferenceId: text("iris_reference_id"), // ID Referensi Midtrans IRIS
    status: payoutStatusEnum("status").default("queued").notNull(),
    errorMessage: text("error_message"),
    
    scheduledTime: text("scheduled_time").notNull(), // "06:00" atau "18:00"
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantPayoutIdx: index("payout_tenant_idx").on(table.tenantId),
  })
);

// ==========================================
// 6. RELATIONSHIPS (RELASI ANTAR TABEL)
// ==========================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  materials: many(materials),
  orders: many(orders),
  payoutLogs: many(payoutLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  assignedOrders: many(orders),
  progressUpdates: many(productionProgress),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  assignedCarpenter: one(users, {
    fields: [orders.assignedCarpenterId],
    references: [users.id],
  }),
  items: many(orderItems),
  progressUpdates: many(productionProgress),
  payoutLogs: many(payoutLogs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const productionProgressRelations = relations(productionProgress, ({ one }) => ({
  order: one(orders, {
    fields: [productionProgress.orderId],
    references: [orders.id],
  }),
  carpenter: one(users, {
    fields: [productionProgress.carpenterId],
    references: [users.id],
  }),
}));
