/**
 * Seed data contoh untuk Sprint 3.
 *
 * Idempoten: aman dijalankan berkali-kali.
 * Jalankan: npm run db:seed:sprint3
 */
import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  chatMessages,
  conversations,
  materialAdjustments,
  materials,
  orders,
  orderItems,
  products,
  productVariants,
  tenants,
  users,
} from "../src/db/schema";

async function main() {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "mebeljaya"))
    .limit(1);

  if (!tenant) {
    console.error("Tenant mebeljaya belum ada. Jalankan npm run db:seed dulu.");
    await sqlClient.end();
    process.exit(1);
  }

  // ---- Bahan baku ----
  const sampleMaterials = [
    { name: "Papan Kayu Jati 200x20", category: "Kayu", unit: "Pcs", quantity: 40, minStockAlert: 10 },
    { name: "Cat Waterbased Clear", category: "Finishing", unit: "Liter", quantity: 3, minStockAlert: 5 },
    { name: "Engsel Piano 4 inci", category: "Hardware", unit: "Pcs", quantity: 120, minStockAlert: 20 },
    { name: "Busa busa Royale", category: "Busa", unit: "Lembar", quantity: 15, minStockAlert: 10 },
  ];

  for (const m of sampleMaterials) {
    const [found] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(
        and(eq(materials.tenantId, tenant.id), eq(materials.name, m.name)),
      )
      .limit(1);

    if (found) {
      console.log(`= bahan sudah ada: ${m.name}`);
      continue;
    }

    const [created] = await db
      .insert(materials)
      .values({
        tenantId: tenant.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        quantity: String(m.quantity),
        minStockAlert: String(m.minStockAlert),
      })
      .returning({ id: materials.id });

    await db.insert(materialAdjustments).values({
      tenantId: tenant.id,
      materialId: created!.id,
      delta: String(m.quantity),
      reason: "pembelian",
      note: "Stok awal (seed)",
    });
    console.log(
      `+ bahan: ${m.name} (${m.quantity} ${m.unit})` +
        (m.quantity <= m.minStockAlert ? "  ← LOW STOCK" : ""),
    );
  }

  // ---- Variasi produk ----
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, "meja-makan-jati-6-kursi"))
    .limit(1);

  if (product) {
    const [variant] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
      .limit(1);

    if (!variant) {
      await db.insert(productVariants).values([
        {
          productId: product.id,
          name: "Ukuran Jumbo 240 cm",
          lengthCm: 240,
          widthCm: 110,
          heightCm: 75,
          price: 14_500_000,
        },
        {
          productId: product.id,
          name: "Kayu Sono",
          woodType: "Kayu Sono",
          price: 10_000_000,
        },
      ]);
      console.log("+ 2 variasi untuk Meja Makan Jati");
    } else {
      console.log("= variasi sudah ada");
    }
  }

  // ---- Pesanan kustom manual ----
  const [existingOrder] = await db
    .select({ id: orders.id, orderCode: orders.orderCode })
    .from(orders)
    .where(eq(orders.orderCode, "ORD-DEMO01"))
    .limit(1);

  if (!existingOrder) {
    const itemPrice = 9_500_000;
    const quantity = 1;
    const shippingFee = 450_000;
    const itemsSubtotal = itemPrice * quantity;
    const totalAmount = itemsSubtotal + shippingFee;
    const platformServiceFee = Math.round(totalAmount * 0.015);
    const dpAmount = 4_000_000;

    const created = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderCode: "ORD-DEMO01",
          tenantId: tenant.id,
          source: "manual",
          customerName: "Bu Sari",
          customerPhone: "08123456789",
          customerAddress: "Jl. Merdeka No. 12",
          destinationCity: "Bandung",
          itemsSubtotal,
          shippingFee,
          totalAmount,
          midtransMdrFee: 0,
          platformServiceFee,
          netTenantAmount: totalAmount - platformServiceFee,
          dpAmount,
          paymentStatus: "dp_paid",
          orderStatus: "pending_dp",
          notes: "Pesanan custom, minta kaki lebih tebal.",
        })
        .returning();

      await tx.insert(orderItems).values({
        orderId: order!.id,
        productName: "Kursi makan custom 8 kaki",
        customSpecs: {
          lengthCm: 220,
          widthCm: 100,
          heightCm: 80,
          woodType: "Kayu Jati",
          finishingType: "Natural Matte",
          notes: "Kaki lebih tebal 8x8 cm.",
        },
        price: itemPrice,
        quantity,
      });

      return order!;
    });

    console.log(`+ pesanan kustom: ${created.orderCode} (DP ${dpAmount})`);
  } else {
    console.log("= pesanan demo sudah ada");
  }

  // ---- Percakapan CS ----
  const [existingConv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.customerPhone, "08987654321"))
    .limit(1);

  if (!existingConv) {
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "owner@mebeljaya.id"))
      .limit(1);

    await db.transaction(async (tx) => {
      const [conv] = await tx
        .insert(conversations)
        .values({
          tenantId: tenant.id,
          customerName: "Pak Andi",
          customerPhone: "08987654321",
          status: "open",
          unreadCount: 1,
        })
        .returning();

      await tx.insert(chatMessages).values([
        {
          conversationId: conv!.id,
          senderUserId: null,
          body: "Selamat siang, sofa linen masih ada ready?",
        },
        {
          conversationId: conv!.id,
          senderUserId: null,
          body: "Saya mau 2 kursi makan juga",
        },
      ]);
      void owner;
    });

    console.log("+ percakapan CS: Pak Andi (2 pesan belum dibalas)");
  } else {
    console.log("= percakapan demo sudah ada");
  }

  await sqlClient.end();
  console.log("\nSeed Sprint 3 selesai.\n");
}

main().catch(async (err) => {
  console.error("Seed Sprint 3 gagal:", err);
  await sqlClient.end().catch(() => {});
  process.exit(1);
});
