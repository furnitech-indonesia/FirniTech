/**
 * Seed data awal Sprint 1.
 *
 * Idempoten: aman dijalankan berkali-kali (upsert berdasarkan slug/id).
 * Jalankan: npm run db:seed
 *
 * Catatan: user dibuat di Supabase Auth, bukan di sini. Seed membuat profil
 * public.users untuk user yang SUDAH terdaftar di Auth. Untuk membuat user
 * baru, pakai Supabase Dashboard / Admin API, lalu jalankan seed ulang.
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  products,
  shippingRates,
  tenants,
  users,
  type Tenant,
} from "../src/db/schema";

async function main() {
  // 1. Tenant contoh: Mebel Jaya, subdomain mebeljaya
  const [existing] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "mebeljaya"))
    .limit(1);

  let tenant: Tenant = existing;
  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({
        name: "Mebel Jaya",
        slug: "mebeljaya",
        plan: "pro",
        subscriptionStatus: "active",
        // contoh: aktif sampai 30 hari ke depan
        subscriptionExpiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
        bankName: "BCA",
        bankAccountNumber: "1234567890",
        bankAccountName: "PT Mebel Jaya",
      })
      .returning();
    console.log(`+ tenant dibuat: ${tenant.name} (${tenant.slug})`);
  } else {
    console.log(`= tenant sudah ada: ${tenant.name} (${tenant.slug})`);
  }

  // 2. Produk contoh (harga rupiah penuh, tanpa desimal)
  const sampleProducts = [
    {
      name: "Meja Makan Jati 6 Kursi",
      slug: "meja-makan-jati-6-kursi",
      description: "Kayu jati perhutani, finishing natural matte.",
      lengthCm: 200,
      widthCm: 100,
      heightCm: 75,
      woodType: "Kayu Jati Perhutani",
      finishingType: "Natural Matte",
      basePrice: 12_500_000,
    },
    {
      name: "Sofa Minimalis Kain Linen",
      slug: "sofa-minimalis-linen",
      description: "Kaki kayu jati, bantalan linen import.",
      lengthCm: 180,
      widthCm: 80,
      heightCm: 85,
      woodType: "Kayu Jati",
      finishingType: "Natural Matte",
      basePrice: 8_750_000,
    },
  ];

  for (const p of sampleProducts) {
    const [found] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, p.slug))
      .limit(1);
    if (found) {
      console.log(`= produk sudah ada: ${p.name}`);
      continue;
    }
    await db.insert(products).values({ ...p, tenantId: tenant.id, images: [] });
    console.log(`+ produk: ${p.name}`);
  }

  // 3. Tarif kargo contoh
  const sampleRates = [
    { cityName: "Bandung", provinceName: "Jawa Barat", rateAmount: 450_000 },
    { cityName: "Jakarta", provinceName: "DKI Jakarta", rateAmount: 650_000 },
    { cityName: "Surabaya", provinceName: "Jawa Timur", rateAmount: 700_000 },
  ];
  for (const r of sampleRates) {
    const [found] = await db
      .select({ id: shippingRates.id })
      .from(shippingRates)
      .where(eq(shippingRates.cityName, r.cityName))
      .limit(1);
    if (found) {
      console.log(`= tarif sudah ada: ${r.cityName}`);
      continue;
    }
    await db.insert(shippingRates).values({ ...r, tenantId: tenant.id });
    console.log(`+ tarif: ${r.cityName} Rp${r.rateAmount.toLocaleString("id-ID")}`);
  }

  // 4. Petunjuk: profil user harus dibuat via Supabase Auth
  const profiles = await db.select().from(users);
  console.log(
    `\nProfil di public.users: ${profiles.length}.` +
      (profiles.length === 0
        ? "\n→ Daftarkan user di Supabase Dashboard (Authentication → Users), lalu jalankan seed ulang."
        : ""),
  );

  await sqlClient.end();
  console.log("\nSeed selesai.\n");
}

main().catch(async (err) => {
  console.error("Seed gagal:", err);
  await sqlClient.end().catch(() => {});
  process.exit(1);
});
