/**
 * Uji pengaturan platform (Sprint 6).
 *
 * Yang diuji, dan kenapa masing-masing penting:
 *
 *  1. **Tarif default = 0, dan angka di database TIDAK mengubah apa pun
 *     kalau tidak ada override.** Ini yang membuat "cukup baca dari kode"
 *     tetap benar untuk database yang belum pernah diisi.
 *  2. **Override benar-benar dipakai runtime.** Ini yang tidak bisa dibuktikan
 *     dari membaca kode — harus dilihat bahwa `effectivePlatformFeeRate()`
 *     dan `platformFeeForRuntime()` berubah setelah barisnya ditulis.
 *  3. **Rumus kode dan rumus database menghasilkan angka IDENTIK** untuk
 *     tarif yang sama. Kalau tidak, pengrajin yang menghitung ulang
 *     biayanya di kalkulator akan menemukan selisih yang tidak bisa dijelaskan.
 *  4. **Harga tahunan tetap mengikuti diskon 5%** meski harga bulanan di-
 *     override. Kalau tidak, diskon berhenti berlaku diam-diam.
 *  5. **Invoice yang sudah terbit mengunci nominalnya.** Ini aturan yang
 *     diminta pemilik produk, dan tidak ada yang bisa membuktikannya kecuali
 *     dengan menulis invoice, mengubah tarif, lalu membacanya lagi.
 *  6. **Batas CHECK di database** menolak tarif di luar 0..10000.
 *
 * Jalankan: npm run test:settings
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { platformSettings, saasInvoices, tenants } from "../src/db/schema";
import {
  craftsmanCreditForWithRate,
  platformFeeFor,
  platformFeeForWithRate,
  PLATFORM_FEE_RATE_DEFAULT,
} from "../src/lib/fees";
import {
  craftsmanCreditForRuntime,
  effectivePlatformFeeRate,
  loadEffectivePlans,
  platformFeeForRuntime,
  platformFeeRateFromBps,
} from "../src/lib/platform-settings";
import { PLANS, priceYearly } from "../src/lib/plans";

const SUFFIX = Date.now();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT!;

/**
 * Keadaan pengaturan SEBELUM skrip ini jalan, disimpan untuk dikembalikan
 * di `finally`.
 *
 * Diperlukan karena skrip ini mengubah tarif GLOBAL: meninggalkannya berubah
 * akan membuat suite lain menghitung angka yang salah tanpa memberitahu siapa
 * pun. Dan `finally`-nya wajib — tanpa itu, eksekusi yang gagal di tengah
 * meninggalkan tarif 150 bps yang akan diam-diam mengubah semua tagihan
 * setelahnya.
 */
let originalSettings: typeof platformSettings.$inferSelect | undefined;

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

/** Kembalikan pengaturan ke keadaan semula setelah tes. */
async function setSettings(row: typeof platformSettings.$inferInsert) {
  await db
    .insert(platformSettings)
    .values({ id: 1, ...row })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: row as Partial<typeof platformSettings.$inferInsert>,
    });
}

async function main() {
  const [original] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1));
  originalSettings = original;

  /* ---------- 1. Tidak ada baris = sama dengan default ---------- */
  await db.delete(platformSettings);

  const defaultRate = await effectivePlatformFeeRate();
  check(
    "tanpa baris pengaturan, tarif = default di fees.ts",
    defaultRate === PLATFORM_FEE_RATE_DEFAULT && defaultRate === 0,
    `${defaultRate}`,
  );
  check(
    "tanpa override, fee platform = 0",
    (await platformFeeForRuntime(10_000_000)) === 0,
    `${await platformFeeForRuntime(10_000_000)}`,
  );

  const plansKode = await loadEffectivePlans();
  check(
    "tanpa override, harga paket = harga di plans.ts",
    plansKode.basic.priceMonthly === PLANS.basic.priceMonthly &&
      plansKode.pro.priceMonthly === PLANS.pro.priceMonthly &&
      plansKode.max.priceMonthly === PLANS.max.priceMonthly,
    `basic ${plansKode.basic.priceMonthly}`,
  );
  check(
    "tanpa override, semua paket ditandai 'kode'",
    Object.values(plansKode).every((p) => p.priceSource === "kode"),
    Object.values(plansKode)
      .map((p) => p.priceSource)
      .join(","),
  );

  /* ---------- 2. Overridedipakai runtime ---------- */
  await setSettings({ platformFeeRateBps: 150, planPriceOverrides: null });

  const rate = await effectivePlatformFeeRate();
  check("override 150 bps terbaca sebagai 1,5%", rate === 0.015, `${rate}`);
  check(
    "fee platform 1,5% benar-benar dipakai runtime",
    (await platformFeeForRuntime(10_000_000)) === 150_000,
    `${await platformFeeForRuntime(10_000_000)}`,
  );
  check(
    "kredit pengrajin memakai tarif yang sama",
    (await craftsmanCreditForRuntime(10_000_000)) === 10_000_000 - 150_000 - 4_440,
    `${await craftsmanCreditForRuntime(10_000_000)}`,
  );

  /* ---------- 3. Rumus kode dan rumus database identik ---------- */
  // 7 nilai yang tersebar di rentang yang wajar, termasuk yang kecil di mana
  // pembulatan ke bawah benar-benar terlihat.
  const SAMPLES = [1, 999, 100_000, 1_020_000, 10_000_000, 123_456_789, 500];
  // Semua nilai runtime diambil LEBIH DAHULU, lalu dibandingkan. Menulis
  // `await` di dalam `filter` tidak mungkin — callback-nya sinkron — dan
  // membandingkan Promise dengan angka akan selalu "tidak sama" tanpa error,
  // yang membuat tes ini lulus karena membandingkan hal yang salah.
  const runtimeFees = new Map<number, number>();
  const runtimeCredits = new Map<number, number>();
  for (const total of SAMPLES) {
    runtimeFees.set(total, await platformFeeForRuntime(total));
    runtimeCredits.set(total, await craftsmanCreditForRuntime(total));
  }

  const mismatches = SAMPLES.filter(
    (total) =>
      platformFeeForWithRate(total, rate) !== runtimeFees.get(total) ||
      craftsmanCreditForWithRate(total, rate) !== runtimeCredits.get(total),
  );
  check(
    "rumus kode dan rumus runtime memberikan angka IDENTIK",
    mismatches.length === 0,
    mismatches.length ? `beda di: ${mismatches.join(", ")}` : `${SAMPLES.length} nilai sama`,
  );

  // Dan saat tarifnya balik ke default, jalur runtime harus sama persis
  // dengan jalur kode yang selama ini dipakai seluruh aplikasi.
  await setSettings({ platformFeeRateBps: 0, planPriceOverrides: null });
  const zeroRuntimeFees = new Map<number, number>();
  for (const total of SAMPLES) {
    zeroRuntimeFees.set(total, await platformFeeForRuntime(total));
  }
  const zeroMismatch = SAMPLES.filter(
    (total) => platformFeeFor(total) !== zeroRuntimeFees.get(total),
  );
  check(
    "tarif 0: jalur runtime sama persis dengan jalur kode",
    zeroMismatch.length === 0,
    zeroMismatch.length ? `beda di: ${zeroMismatch.join(", ")}` : "identik",
  );

  /* ---------- 4. Basis points ---------- */
  check("150 bps = 0,015", platformFeeRateFromBps(150) === 0.015, `${platformFeeRateFromBps(150)}`);
  check("10.000 bps = 1 (100%)", platformFeeRateFromBps(10_000) === 1, `${platformFeeRateFromBps(10_000)}`);
  check("0 bps = 0", platformFeeRateFromBps(0) === 0, "0");

  /* ---------- 5. Harga paket: override parsial & diskon ---------- */
  await setSettings({
    platformFeeRateBps: 0,
    planPriceOverrides: { pro: { monthly: 600_000 } },
  });

  const plansOverride = await loadEffectivePlans();
  check(
    "override hanya mengubah paket yang disebut",
    plansOverride.pro.priceMonthly === 600_000 &&
      plansOverride.basic.priceMonthly === PLANS.basic.priceMonthly &&
      plansOverride.max.priceMonthly === PLANS.max.priceMonthly,
    `pro ${plansOverride.pro.priceMonthly}, basic ${plansOverride.basic.priceMonthly}`,
  );
  check(
    "paket dengan override ditandai 'override'",
    plansOverride.pro.priceSource === "override" &&
      plansOverride.basic.priceSource === "kode",
    `pro=${plansOverride.pro.priceSource}, basic=${plansOverride.basic.priceSource}`,
  );
  check(
    "harga tahunan SELALU mengikuti diskon 5% dari bulanan yang berlaku",
    plansOverride.pro.priceYearly === priceYearly(600_000) &&
      plansOverride.pro.priceYearly === Math.round(600_000 * 12 * 0.95),
    `${plansOverride.pro.priceYearly} = ${priceYearly(600_000)}`,
  );
  check(
    "tahunannya override Pro 600.000 ≠ tahunannya bawaan 5.700.000",
    plansOverride.pro.priceYearly !== PLANS.pro.priceYearly,
    `${plansOverride.pro.priceYearly} vs ${PLANS.pro.priceYearly}`,
  );

  /* ---------- 6. CHECK database menolak tarif di luar rentang ---------- */
  const outOfRange = await trySql(
    `update public.platform_settings set platform_fee_rate_bps = 50000 where id = 1`,
  );
  check(
    "CHECK database menolak tarif 500.000%",
    !outOfRange.ok,
    outOfRange.ok ? "DITERIMA" : outOfRange.message.slice(0, 60),
  );
  const negative = await trySql(
    `update public.platform_settings set platform_fee_rate_bps = -1 where id = 1`,
  );
  check(
    "CHECK database menolak tarif negatif",
    !negative.ok,
    negative.ok ? "DITERIMA" : negative.message.slice(0, 60),
  );
  const secondRow = await trySql(
    `insert into public.platform_settings (id, platform_fee_rate_bps) values (2, 0)`,
  );
  check(
    "CHECK database menolak baris kedua (hanya satu baris)",
    !secondRow.ok,
    secondRow.ok ? "DITERIMA" : secondRow.message.slice(0, 60),
  );

  /* ---------- 7. Invoice mengunci nominalnya ---------- */
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: `Uji Settings ${SUFFIX}`,
      slug: `uji-settings-${SUFFIX}`,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error("gagal membuat tenant");

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [invoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: tenant.id,
      plan: "basic",
      period: "monthly",
      // Nominal SAAT INI, sebelum tarif diubah.
      amount: plansKode.basic.priceMonthly,
      midtransAmount: plansKode.basic.priceMonthly,
      status: "pending",
      midtransOrderId: `saas-uji-${SUFFIX}`,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
    })
    .returning({ id: saasInvoices.id, amount: saasInvoices.amount });
  if (!invoice) throw new Error("gagal membuat invoice");

  // Ubah harga paket Basic jadi jauh lebih mahal.
  await setSettings({
    platformFeeRateBps: 0,
    planPriceOverrides: { basic: { monthly: 999_000_000 } },
  });

  const [afterChange] = await db
    .select({ amount: saasInvoices.amount })
    .from(saasInvoices)
    .where(eq(saasInvoices.id, invoice.id));
  check(
    "invoice yang sudah terbit TIDAK ikut berubah saat harga paket diubah",
    afterChange?.amount === invoice.amount &&
      afterChange?.amount === PLANS.basic.priceMonthly,
    `${afterChange?.amount} tetap ${PLANS.basic.priceMonthly}`,
  );

  const plansAfter = await loadEffectivePlans();
  check(
    "harga BERAKTUAL untuk tenant baru memang berubah",
    plansAfter.basic.priceMonthly === 999_000_000,
    `${plansAfter.basic.priceMonthly}`,
  );

  /* ---------- 8.GRANT: anon & authenticated tidak bisa membaca ---------- */
  // `trySql` memakai user postgres yang superuser dan bypass RLS, jadi untuk
  // membuktikan RLS + GRANT harus lewat PostgREST dengan anon key.
  const res = await fetch(
    `${supabaseUrl}/rest/v1/platform_settings?select=platform_fee_rate_bps`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  );
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* biarkan null */
  }
  check(
    "anon TIDAK bisa membaca pengaturan platform",
    res.status >= 400 ||
      (Array.isArray(body) && (body as unknown[]).length === 0),
    `status ${res.status}, ${Array.isArray(body) ? `${(body as unknown[]).length} baris` : "bukan array"}`,
  );

  console.log(
    failures === 0
      ? "\nsemua pemeriksaan pengaturan lulus.\n"
      : `\n${failures} pemeriksaan gagal.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

/*
 * TIDAK ADA mekanisme invalidasi cache di skrip ini, dan itu disengaja.
 * `loadSettingsRow` dibungkus `cache()` dari React, yang berlaku per-render —
 * di luar render (yaitu di skrip test) React tidak menyimpan apa pun, jadi
 * setiap pemanggilan menjalankan query lagi.
 *
 * Kalau suatu saat `cache()` diganti jadi cache modul (misalnya
 * `unstable_cache`), skrip ini akan mulai melaporkan "override tidak dipakai"
 * padahal override-nya ada. Pemeriksaan yang gagal dengan pesan itu adalah
 * gejalanya, dan pesan itu sudah ditulis untuk mengarah ke sini.
 */

async function trySql(statement: string): Promise<{ ok: boolean; message: string }> {
  try {
    await sqlClient.unsafe(statement);
    return { ok: true, message: "" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

main()
  .catch((err) => {
    console.error("Uji pengaturan gagal:", err);
    failures += 1;
  })
  .finally(async () => {
    // Kembalikan pengaturan ke kondisi semula: skrip ini mengubah tarif
    // global, dan meninggalkannya berubah akan membuat suite lain menghitung
    // angka yang salah tanpa memberitahu siapa pun.
    const original = originalSettings;
    if (original) {
      await db
        .insert(platformSettings)
        .values(original)
        .onConflictDoUpdate({
          target: platformSettings.id,
          set: {
            platformFeeRateBps: original.platformFeeRateBps,
            planPriceOverrides: original.planPriceOverrides,
            updatedBy: original.updatedBy,
          },
        });
    } else {
      await db.delete(platformSettings);
    }
    await sqlClient`delete from integration_audit_logs where tenant_id is null and action = 'platform_settings_saved'`;
    await sqlClient`delete from saas_invoices where tenant_id in (select id from public.tenants where slug like ${`uji-settings-%`})`;
    await sqlClient`delete from public.tenants where slug like ${`uji-settings-%`}`;
    await sqlClient.end();
    process.exit(failures === 0 ? 0 : 1);
  });
