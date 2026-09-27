/**
 * Uji mesin notifikasi WhatsApp (Sprint 4).
 *
 * Fokusnya bukan "pesan terkirim" — itu butuh token Fonnte sungguhan dan tidak
 * boleh diuji di sini. Fokusnya dua jebakan yang kalau salah Diam-diam
 * membocorkan uang dan kuota:
 *
 *   1. Normalisasi nomor. Nomor `08xx` yang dikirim apa adanya DITOLAK Fonnte.
 *      Kalau tidak dinormalisasi, semua pesan ke pembeli Indonesia gagal tanpa
 *      error yang jelas.
 *   2. Kuota paket harus ATOMIK. Dibaca dulu lalu ditulis akan raced: dua
 *      request bersamaan sama-sama lolos dan tenant Basic bisa menembus
 *      jatah 100/bulan. Uji ini menjalankan beberapa consumption BERBARENG
 *      lalu memastikan totalnya tidak melewati kuota.
 *
 * Uji memakai tenant sampling yang dibuat lalu dihapus, bukan tenant seed.
 *
 * Jalankan: npm run test:wa
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sqlClient as sql } from "../src/db/client";
import { tenants } from "../src/db/schema";
import {
  consumeQuota,
  currentPeriodStart,
  normalizePhone,
  quotaRemaining,
} from "../src/lib/fonnte";
import { PLANS } from "../src/lib/plans";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

function expectPhone(raw: string, expected: string | null) {
  const got = normalizePhone(raw);
  check(
    `normalizePhone(${JSON.stringify(raw)}) = ${JSON.stringify(expected)}`,
    got === expected,
    got === expected ? String(got) : `dapat ${JSON.stringify(got)}`,
  );
}

async function main() {
  /* ---------- 1. Normalisasi nomor ---------- */
  expectPhone("081234567890", "6281234567890");
  expectPhone("+62 812-3456-7890", "6281234567890");
  expectPhone("6281234567890", "6281234567890");
  expectPhone("(0812) 3456 7890", "6281234567890");
  expectPhone("81234567890", "6281234567890");
  expectPhone("", null);
  expectPhone("   ", null);
  expectPhone("bukan-nomor", null);

  /*
   * Nomor yang tidak bisa dinormalisasi tidak boleh jadi target. Ini yang
   * membuat `sendWhatsApp` menolak lebih dulu, alih-alih mengirim dan
   * menerima error 400 dari Fonnte.
   */
  check(
    "nomor tidak valid tidak pernah jadi target yang dikirim",
    ["bukan-nomor", ""].every((r) => normalizePhone(r) === null),
    "semua ditolak",
  );

  /* ---------- 2. Periode kuota ---------- */
  const period = currentPeriodStart();
  check(
    "periode kuota berformat YYYY-MM-01",
    /^\d{4}-\d{2}-01$/.test(period),
    period,
  );

  /* ---------- 3. Tenant sampling ---------- */
  const slug = `uji-kuota-wa-${Date.now()}`;
  await db.delete(tenants).where(eq(tenants.slug, slug));
  const [probe] = await db
    .insert(tenants)
    .values({
      name: "Uji Kuota WA",
      slug,
      plan: "basic", // 100 WA/bulan
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 30 * 86_400_000),
      isActive: true,
    })
    .returning({ id: tenants.id });

  try {
    const quota = PLANS.basic.monthlyWaQuota;
    check("kuota Basic terbaca dari PLANS", quota === 100, String(quota));

    /* ---- Konsumsi normal ---- */
    const first = await consumeQuota(probe.id, quota);
    check("konsumsi pertama diizinkan dan pemakaian = 1", first.allowed && first.used === 1, JSON.stringify(first));

    const second = await consumeQuota(probe.id, quota);
    check("konsumsi kedua menaikkan counter", second.allowed && second.used === 2, JSON.stringify(second));

    /* ---- Kuota habis harus DITOLAK, bukan menaikkan ---- */
    // Isi sampai batas.
    let last = second;
    for (let i = 2; i < 100; i += 1) {
      last = await consumeQuota(probe.id, quota);
    }
    check("mencapai kuota tepat di 100", last.used === 100, `used=${last.used}`);

    const overflow = await consumeQuota(probe.id, quota);
    check(
      "konsumsi ke-101 DITOLAK (tidak menaikkan counter)",
      overflow.allowed === false && overflow.used === 100,
      JSON.stringify(overflow),
    );

    /* ---- Sisa kuota ---- */
    const remaining = await quotaRemaining(probe.id, "basic");
    check(
      "sisa kuota = 0 setelah jenuh, tidak negatif",
      remaining.used === 100 && remaining.remaining === 0,
      JSON.stringify(remaining),
    );

    /* ---- Paket Max: tanpa batas ---- */
    const maxRemaining = await quotaRemaining(probe.id, "max");
    check(
      "paket Max punya kuota null (unlimited)",
      maxRemaining.quota === null && maxRemaining.remaining === null,
      JSON.stringify(maxRemaining),
    );

    /*
     * Uji yang paling penting: konsumsi BERBARENG.
     *
     * Kalau consumenya "baca lalu tulis" (atau tidak punya `where used_count <
     * quota`), request-request ini akan sama-sama melihat angka yang sama dan
     * semuanya lolos — totalnya naik超过 jatah. Jalankan 30 kali sekaligus
     * dengan kuota 10; hanya boleh 10 yang lolos.
     */
    const raceSlug = `uji-kuota-race-${Date.now()}`;
    const [race] = await db
      .insert(tenants)
      .values({
        name: "Uji Kuota Race",
        slug: raceSlug,
        plan: "basic",
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86_400_000),
        isActive: true,
      })
      .returning({ id: tenants.id });

    try {
      const RACE_QUOTA = 10;
      const ATTEMPTS = 30;
      const outcomes = await Promise.all(
        Array.from({ length: ATTEMPTS }, () => consumeQuota(race.id, RACE_QUOTA)),
      );
      const allowed = outcomes.filter((o) => o.allowed).length;

      check(
        `konsumsi berbareng: ${ATTEMPTS} percobaan dengan kuota ${RACE_QUOTA}`,
        allowed === RACE_QUOTA,
        `${allowed} lolos (harus tepat ${RACE_QUOTA})`,
      );

      const [counter] = await sql`
        select used_count from notification_usage
        where tenant_id = ${race.id} and channel = 'whatsapp'
      `;
      check(
        "counter tidak melewati kuota meski ada 30 permintaan bersamaan",
        Number(counter?.used_count) === RACE_QUOTA,
        `used_count=${counter?.used_count}`,
      );
    } finally {
      await db.delete(tenants).where(eq(tenants.slug, raceSlug));
    }

    /* ---- Isolasi antar tenant ---- */
    const otherSlug = `uji-kuota-lain-${Date.now()}`;
    const [other] = await db
      .insert(tenants)
      .values({
        name: "Uji Kuota Tenant Lain",
        slug: otherSlug,
        plan: "basic",
        subscriptionStatus: "active",
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86_400_000),
        isActive: true,
      })
      .returning({ id: tenants.id });

    try {
      const otherBefore = await quotaRemaining(other.id, "basic");
      check(
        "tenant lain tidak mewarisi pemakaian tenant sebelumnya",
        otherBefore.used === 0,
        `used=${otherBefore.used}`,
      );
    } finally {
      await db.delete(tenants).where(eq(tenants.slug, otherSlug));
    }
  } finally {
    await db.delete(tenants).where(eq(tenants.slug, slug));
  }

  const [leftover] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  check(
    "tenant sampling dibersihkan",
    leftover === undefined,
    leftover ? "MASIH ADA (data tertinggal)" : "hilang (benar)",
  );

  await sql.end();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} pengujian WhatsApp lulus.`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
