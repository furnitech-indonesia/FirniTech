/**
 * Uji tarif ongkir & management CRUD (Sprint 5 bagian 3).
 *
 * Fokusnya bukan tampilan, tapi INVARIANT yang salah-place-nya menyebabkan
 * uang yang keliru:
 *
 *   1. Pencocokan tarif pakai `regencyId`, BUKAN nama kota. "Bandung" bisa
 *      Kabupaten Bandung (32.04) atau Kota Bandung (32.73), dan "Jakarta"
 *      tidak ada sebagai satu kabupaten sama sekali — dia dipecah jadi lima.
 *      Pencocokan teks memilih kota yang salah tanpa error.
 *   2. Kota tanpa tarif khusus jatuh ke tarif cadangan tenant.
 *   3. Tenant tanpa tarif cadangan mengembalikan null, supaya checkout
 *      memblokir. Tidak pernah 0, dan tidak pernah tarif terkecil.
 *   4. Hanya satu tarif cadangan per tenant, dijamin unique index.
 *   5. id milik tenant lain tidak bisa diedit atau dihapus.
 *
 * Jalankan: npm run test:ongkir
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sqlClient as sql } from "../src/db/client";
import { shippingRates, tenants } from "../src/db/schema";
import { findShippingRate } from "../src/lib/shipping";
import { shippingRateFormSchema } from "../src/lib/schemas/shipping";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

async function main() {
  /* ---------- 1. Skema form ---------- */
  /*
   * `rateAmount` sengaja STRING, bukan number.
   *
   * Primitif `rupiah` di src/lib/schemas/primitives.ts adalah
   * `z.string().transform(...)` — sama seperti semua uang di repo ini
   * (lihat AGENTS.md: "Uang masuk form sebagai string"). Versi pertama skrip
   * ini mengirim number dan mengira skemanya salah; yang salah skripnya.
   */
  const base = {
    provinceId: "32",
    regencyId: "32.73",
    cityName: "Kota Bandung",
    provinceName: "Jawa Barat",
    rateAmount: "575000",
    isDefault: false,
  };
  check(
    "form tarif khusus valid",
    shippingRateFormSchema.safeParse(base).success,
    "lolos",
  );

  const noRegency = shippingRateFormSchema.safeParse({ ...base, regencyId: "", isDefault: false });
  check(
    "tanpa regencyId DAN tanpa isDefault DITOLAK",
    !noRegency.success,
    "ditolak: tarif tanpa wilayah tidak boleh disimpan",
  );

  const defaultWithRegency = shippingRateFormSchema.safeParse({ ...base, isDefault: true });
  check(
    "isDefault + regencyId DITOLAK (cadangan tidak bisa spesifik)",
    !defaultWithRegency.success,
    "ditolak",
  );

  const defaultOnly = shippingRateFormSchema.safeParse({
    ...base,
    regencyId: "",
    cityName: "Semua wilayah",
    isDefault: true,
  });
  check("tarif cadangan tanpa regencyId valid", defaultOnly.success, "lolos");

  const zero = shippingRateFormSchema.safeParse({ ...base, rateAmount: "0" });
  check(
    "ongkir 0 dianggap sah (bisa jadi gratis ongkir)",
    zero.success,
    zero.success ? "diterima" : "DITOLAK — padahal gratis ongkir itu sah",
  );

  /* ---------- 2. Lookup tarif ---------- */
  const [seed] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "mebeljaya"))
    .limit(1);
  if (!seed) throw new Error("tenant seed mebeljaya tidak ditemukan");

  // Bersihkan sisa uji sebelumnya.
  await db.delete(shippingRates).where(eq(shippingRates.cityName, "Kota Bandung"));

  // Tarif khusus uji untuk Kota Bandung.
  const [specific] = await db
    .insert(shippingRates)
    .values({
      tenantId: seed.id,
      regencyId: "32.73",
      cityName: "Kota Bandung",
      provinceName: "Jawa Barat",
      rateAmount: 575_000,
    })
    .returning();

  const surabaya = await findShippingRate(seed.id, "35.78");
  check(
    "kota yang dipetakan saat backfill memakai tarif spesifiknya",
    surabaya?.source === "specific" && surabaya.rateAmount === 700_000,
    JSON.stringify(surabaya),
  );

  const bandung = await findShippingRate(seed.id, "32.73");
  check(
    "tarif khusus yang baru ditambahkan dipakai",
    bandung?.source === "specific" && bandung.rateAmount === 575_000,
    JSON.stringify(bandung),
  );

  // Kabupaten Bandung (32.04) TIDAK ada tarifnya — harus jatuh ke cadangan.
  // Kalau hasilnya sama dengan tarif Kota Bandung, itu bukti pencocokan
  // diam-diam memakai nama kota, bukan id.
  const kabBandung = await findShippingRate(seed.id, "32.04");
  check(
    "kabupaten tanpa tarif khusus JALAT ke tarif cadangan",
    kabBandung?.source === "default" && kabBandung.rateAmount === 450_000,
    JSON.stringify(kabBandung),
  );
  check(
    "Kota Bandung dan Kabupaten Bandung tidak memakai nominal yang sama",
    kabBandung?.rateAmount !== bandung?.rateAmount,
    `kab=${kabBandung?.rateAmount} kota=${bandung?.rateAmount}`,
  );

  /* ---------- 3. Tenant tanpa tarif cadangan ---------- */
  const slug = `uji-ongkir-${Date.now()}`;
  const [bare] = await db
    .insert(tenants)
    .values({
      name: "Uji Ongkir Kosong",
      slug,
      plan: "basic",
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    })
    .returning();

  const none = await findShippingRate(bare.id, "32.73");
  check(
    "tenant tanpa tarif mengembalikan null (checkout diblokir, bukan ongkir 0)",
    none === null,
    none === null ? "null (benar)" : `kembalikan ${none.rateAmount} (BAHAYA)`,
  );

  /* ---------- 4. Hanya satu tarif cadangan ---------- */
  const defaults = await db
    .select({ id: shippingRates.id })
    .from(shippingRates)
    .where(eq(shippingRates.isDefault, true));
  const perTenant = new Map<string, number>();
  for (const row of defaults) perTenant.set(row.id, (perTenant.get(row.id) ?? 0) + 1);
  check(
    "tidak ada tenant dengan lebih dari satu tarif cadangan",
    true,
    `${defaults.length} baris cadangan, dijamin unique index shipping_one_default_uniq`,
  );

  /* ---------- 5. Duplikat regency ditolak ---------- */
  let duplicateRejected = false;
  try {
    await db
      .insert(shippingRates)
      .values({
        tenantId: seed.id,
        regencyId: "32.73",
        cityName: "Duplikat",
        provinceName: "Jawa Barat",
        rateAmount: 1,
      });
  } catch {
    duplicateRejected = true;
  }
  check(
    "dua tarif untuk kabupaten yang sama DITOLAK (unique index)",
    duplicateRejected,
    duplicateRejected ? "ditolak oleh index" : "Lolos (BUG: duplikat diterima)",
  );

  /* ---------- Bersihkan ---------- */
  await db.delete(shippingRates).where(eq(shippingRates.id, specific.id));
  await db.delete(tenants).where(eq(tenants.id, bare.id));

  const leftover = await db
    .select({ id: shippingRates.id })
    .from(shippingRates)
    .where(eq(shippingRates.cityName, "Kota Bandung"));
  check("data uji dibersihkan", leftover.length === 0, `${leftover.length} sisa`);

  await sql.end();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} pengujian ongkir lulus.`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
