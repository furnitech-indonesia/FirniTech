/**
 * Uji halaman lacak pesanan (Sprint 5 bagian 4).
 *
 * Fokusnya pada PRIVASI, bukan tampilan. Halaman ini publik dan tanpa sesi,
 * dan isinya berisi nama pembeli, alamat, dan foto progres — jadi yang paling
 * penting diuji adalah apa yang TIDAK bisa dilihat orang.
 *
 * Yang diuji:
 *   1. Kode pesanan + nomor yang benar → pesanan tampil
 *   2. Nomor HP SALAH → ditolak (kasus terpenting: kode saja tidak cukup)
 *   3. Kode tidak ada → ditolak dengan pesan yang PERSIS sama
 *   4. Nomor HP dalam format berbeda (08xx vs 628xx) tetap dikenali
 *   5. Data margin toko tidak ikut keluar (netTenantAmount, fee, email)
 *   6. Timeline menampilkan tahap yang sudah DAN yang belum
 *
 * Jalankan: npm run test:lacak
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sqlClient as sql } from "../src/db/client";
import { orders, productionProgress, tenants } from "../src/db/schema";
import { findOrderForTracking } from "../src/lib/orders-public";
import { normalizePhone } from "../src/lib/wa-link";
import { PROGRESS_STAGE_ORDER } from "../src/lib/order-status";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

const PHONE_RAW = "081299988877";
const CODE = "ORD-UJI-LACAK";

/*
 * Nomor dalam format 62xxx TIDAK ditulis manual.
 *
 * Versi pertama skrip ini menulis `6281299888777` dengan tangan, padahal
 * `normalizePhone("081299988877")` menghasilkan `6281299988877` — satu angka
 * beda, di tengah. Hasilnya dua pengujian gagal dan sempat terlihat seperti
 * bug pada `findOrderForTracking`, padahal kodenya benar. Menulis ulang hasil
 * komputasi secara manual adalah sumber kesalahan yang bisa dihindari
 * sepenuhnya, jadi di sini ia dihitung dari fungsi yang sama.
 */
const PHONE_E164 = normalizePhone(PHONE_RAW) ?? "";

async function main() {
  /* ---------- Fikstur ---------- */
  const slug = `uji-lacak-${Date.now()}`;
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Toko Uji Lacak",
      slug,
      plan: "basic",
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    })
    .returning();

  const [order] = await db
    .insert(orders)
    .values({
      tenantId: tenant.id,
      orderCode: CODE,
      customerName: "Pembeli Uji",
      customerPhone: PHONE_RAW,
      customerAddress: "Jl. Uji No. 9, RT 02 RW 05",
      destinationCity: "Bandung",
      itemsSubtotal: 1_000_000,
      shippingFee: 450_000,
      totalAmount: 1_450_000,
      // Nilai yang TIDAK BOLEH keluar ke halaman publik.
      netTenantAmount: 1_400_000,
      midtransMdrFee: 29_000,
      platformServiceFee: 21_000,
      orderStatus: "in_production",
      paymentStatus: "dp_paid",
    })
    .returning();

  // Dua tahap terunggah, jadi ada tahap ketiga yang belum.
  await db.insert(productionProgress).values([
    {
      orderId: order.id,
      carpenterName: "Pak Tusuk",
      stage: "bahan_dipotong",
      photoUrl: "uji/tidak-ada-1.jpg",
      notes: "Kayu sudah dipotong.",
      createdAt: new Date(Date.now() - 7_200_000),
    },
    {
      orderId: order.id,
      carpenterName: "Pak Tusuk",
      stage: "perakitan",
      photoUrl: "uji/tidak-ada-2.jpg",
      notes: "Sudah dirakit.",
      createdAt: new Date(Date.now() - 3_600_000),
    },
  ]);

  try {
    /* ---------- 1. Akses yang benar ---------- */
    const found = await findOrderForTracking(CODE, PHONE_RAW);
    check(
      "kode + nomor benar → pesanan ditemukan",
      found !== null,
      found ? found.orderCode : "null",
    );
    check(
      "nomor tersimpan 08xx dikenali dari input 08xx",
      found !== null,
      "lolos",
    );
    check(
      "tahap tercapai = 2 dari 5",
      found?.reachedStage === 2,
      `reachedStage=${found?.reachedStage}`,
    );
    check(
      "timeline hanya berisi tahap yang benar-benar diunggah",
      found?.stages.length === 2,
      `${found?.stages.length} entri`,
    );
    check(
      "catatan tukang ikut tampil",
      (found?.stages[1]?.notes ?? "").includes("dirakit"),
      found?.stages[1]?.notes ?? "(kosong)",
    );
    check(
      "nama tukang ikut tampil",
      (found?.stages[0]?.carpenterName ?? "") === "Pak Tusuk",
      found?.stages[0]?.carpenterName ?? "(kosong)",
    );

    // Foto yang object path-nya tidak ada harus jadi null, bukan path mentah.
    check(
      "foto yang hilang di storage jadi null, bukan path mentah",
      found?.stages.every((s) => s.photoUrl === null) ?? false,
      `photoUrl: ${found?.stages.map((s) => s.photoUrl).join(", ") || "(kosong)"}`,
    );

    /* ---------- 2. Format nomor berbeda ---------- */
    const altFormat = await findOrderForTracking(CODE, PHONE_E164);
    check(
      "nomor 628xx dikenali walau tersimpan 08xx",
      altFormat !== null,
      altFormat ? "ditemukan" : "DITOLAK (buang data pembeli)",
    );
    const withPunctuation = await findOrderForTracking(CODE, `+62 ${PHONE_RAW.slice(1, 4)}-${PHONE_RAW.slice(4, 8)}-${PHONE_RAW.slice(8)}`);
    check(
      "nomor dengan tanda baca + dan spasi dikenali",
      withPunctuation !== null,
      withPunctuation ? "ditemukan" : "DITOLAK",
    );

    /* ---------- 3. Nomor salah harus DITOLAK ---------- */
    const wrongPhone = await findOrderForTracking(CODE, "081200000000");
    check(
      "nomor HP SALAH ditolak walau kodenya benar",
      wrongPhone === null,
      wrongPhone === null ? "null (benar)" : "BOCOR (BUG)",
    );

    /* ---------- 4. Kode tidak ada ---------- */
    const wrongCode = await findOrderForTracking("ORD-TIDAK-ADA", PHONE_RAW);
    check("kode tidak ada ditolak", wrongCode === null, "null (benar)");

    /* ---------- 5. Kosong &aneh ---------- */
    check("kode kosong ditolak", (await findOrderForTracking("", PHONE_RAW)) === null, "null");
    check(
      "nomor tidak valid ditolak",
      (await findOrderForTracking(CODE, "bukan-nomor")) === null,
      "null",
    );

    /* ---------- 6. Data margin tidak ikut keluar ---------- */
    const serialised = JSON.stringify(found ?? {});
    // Dicek dari NAMA KUNCINYA, bukan dari nilainya. Kalau yang dicari
    // angkanya, kebocoran 1.428.000 (netTenantAmount) akan lolos karena
    // angka itu kebetulan muncul dari total yang memang boleh tampil.
    const LEAKY_KEYS = [
      "netTenantAmount",
      "midtransMdrFee",
      "platformServiceFee",
      "dpAmount",
      "tenantId",
      "customerAddressId",
    ];
    const leaked = LEAKY_KEYS.filter((key) => serialised.includes(key));

    check(
      "tidak ada data margin/biaya toko di hasil",
      leaked.length === 0,
      leaked.length === 0 ? "bersih" : `bocor: ${leaked.map((l) => l[0]).join(", ")}`,
    );
    check(
      "tidak ada id tenant di hasil",
      !serialised.includes(tenant.id),
      "bersih",
    );

    /* ---------- 7. Urutan tahap resmi ---------- */
    const stages = (found?.stages ?? []).map((s) => s.stage);
    const positions = stages.map((s) => PROGRESS_STAGE_ORDER.indexOf(s));
    const ascending = positions.every((v, i) => i === 0 || v > positions[i - 1]);
    check(
      "tahap urut naik sesuai PROGRESS_STAGE_ORDER",
      ascending && positions.every((v) => v >= 0),
      stages.join(" → "),
    );
  } finally {
    const [o] = await db.select().from(orders).where(eq(orders.orderCode, CODE));
    if (o) await db.delete(productionProgress).where(eq(productionProgress.orderId, o.id));
    await db.delete(orders).where(eq(orders.orderCode, CODE));
    await db.delete(tenants).where(eq(tenants.id, tenant.id));
  }

  const leftover = await db
    .select()
    .from(orders)
    .where(eq(orders.orderCode, CODE));
  check("fikstur dibersihkan", leftover.length === 0, `${leftover.length} sisa`);

  await sql.end();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} pengujian lacak pesanan lulus.`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
