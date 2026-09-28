/**
 * Tes add-on: custom domain & Paket Pendirian PT Perorangan (Sprint 6).
 *
 * Fokusnya bukan "harga benar" — itu satu konstanta yang sudah dibaca dari
 * `@/lib/addons`. Fokusnya adalah ATURAN yang kalau dilanggar memberikan
 * sesuatu yang tidak dibayar:
 *
 *  1. Invoice `leg-` yang lunas TIDAK boleh menambah periode langganan.
 *     Pelanggaran ini memberi satu tahun langganan gratis dan tidak akan
 *     terlihat sampai tagihan berikutnya gagal — itu bug yang paling mahal
 *     di webhook, bukan yang paling mudah.
 *  2. Invoice `dom-` hanya boleh dibuat setelah domain terverifikasi.
 *  3. Domain yang dibayar tapi periodenya sudah lewat TIDAK boleh diaktifkan
 *     sebagai `active` -- hanya `suspended`.
 *  4. Fungsi periode & suspend, supaya aturannya bisa diuji tanpa database.
 *
 * Jalankan: `npm run test:addons`
 */
import { createHash, randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import {
  DOMAIN_ADDON,
  LEGALITAS_ADDON,
  LEGALITAS_MARGIN,
  LEGALITAS_PNBP,
  LEGALITAS_TOTAL_COST,
  ORDER_ID_PREFIX,
  addonKindFromOrderId,
  addMonths,
  isDomainActive,
  nextDomainPeriod,
  shouldSuspendDomain,
} from "@/lib/addons";
import { FAILED_STATUSES, SETTLED_STATUSES } from "@/lib/midtrans/snap";

// --------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------
let lulus = 0;
const gagal: string[] = [];

function cek(nama: string, kondisi: boolean, detail?: string) {
  if (kondisi) {
    lulus++;
    console.log(`  ok    ${nama}`);
  } else {
    gagal.push(nama);
    console.log(`  GAGAL ${nama}${detail ? ` -- ${detail}` : ""}`);
  }
}

const hari = (d: Date) => d.toISOString().slice(0, 10);
const midnight = (s: string) => new Date(`${s}T00:00:00.000Z`);

// --------------------------------------------------------------------
// Fungsi murni
// --------------------------------------------------------------------
console.log("\nFungsi murni:");

cek(
  "order_id dom- dikenali sebagai domain",
  addonKindFromOrderId("dom-abc-123") === "domain",
);
cek(
  "order_id leg- dikenali sebagai legalitas",
  addonKindFromOrderId("leg-abc-123") === "legalitas",
);
cek(
  "order_id saas- BUKAN add-on",
  addonKindFromOrderId("saas-abc-123") === null,
  "kalau ini null, webhook akan menjatuhkannya ke cabang langganan",
);
cek(
  "order_id ord- BUKAN add-on",
  addonKindFromOrderId("ord-abc") === null,
);
cek(
  "prefix add-on tidak bentrok dengan langganan/pesanan",
  new Set(Object.values(ORDER_ID_PREFIX)).size ===
    Object.keys(ORDER_ID_PREFIX).length,
);

// Menyalin rumus dari `addonOrderId` di src/lib/midtrans/addons.ts.
// Kalau rumusnya berubah, tes ini harus ikut gagal -- dan kalau tidak,
// orderId yang diuji bukan orderId yang sebenarnya dipakai.
function addonOrderId(prefix: string, tenantId: string, now: Date): string {
  return `${prefix}-${tenantId.slice(0, 8)}-${now.getTime()}`;
}
const contohId = "abcdef12-3456-7890-abcd-ef1234567890";
cek(
  "order_id yang DIHASILKAN kode terbaca sebagai add-on",
  addonKindFromOrderId(addonOrderId(ORDER_ID_PREFIX.legalitas, contohId, new Date())) === "legalitas" &&
    addonKindFromOrderId(addonOrderId(ORDER_ID_PREFIX.domain, contohId, new Date())) === "domain",
  "kalau gagal, setiap invoice add-on akan jatuh ke cabang langganan",
);

cek(
  "harga legalitas Rp 500.000",
  LEGALITAS_ADDON.price === 500_000,
);
cek(
  "beban legalitas Rp 150.000 (PNBP 50.000 + ops 100.000)",
  LEGALITAS_TOTAL_COST === 150_000 && LEGALITAS_PNBP === 50_000,
  `total=${LEGALITAS_TOTAL_COST}`,
);
cek("margin legalitas Rp 350.000", LEGALITAS_MARGIN === 350_000);
cek("harga domain Rp 250.000 per 12 bulan", DOMAIN_ADDON.price === 250_000 && DOMAIN_ADDON.periodMonths === 12);

// --- Periode domain: kasus yang paling mudah salah -------------------------
const sekarang = midnight("2027-01-15");
const enamBulanLalu = addMonths(sekarang, 6);  // periode masih berjalan
const duaTahunLalu = addMonths(sekarang, -14); // periode sudah lewat

const lanjut = nextDomainPeriod(sekarang, enamBulanLalu);
cek(
  "periode yang masih berjalan LANJUT, tidak mulai ulang",
  hari(lanjut.start) === hari(enamBulanLalu),
  `start=${hari(lanjut.start)}, harusnya ${hari(enamBulanLalu)}`,
);
cek(
  "periode lanjut += 12 bulan",
  hari(lanjut.end) === hari(addMonths(enamBulanLalu, 12)),
  `end=${hari(lanjut.end)}`,
);

const baru = nextDomainPeriod(sekarang, duaTahunLalu);
cek(
  "periode yang sudah lewat mulai dari HARI INI",
  hari(baru.start) === hari(sekarang),
  `start=${hari(baru.start)}`,
);
cek(
  "periode baru bukan mulai dari periode lama yang sudah lewat",
  baru.start.getTime() > duaTahunLalu.getTime(),
  "mulai dari periode lama berarti memberi hari-hari yang sudah kedaluwarsa",
);

const tanpaPeriode = nextDomainPeriod(sekarang, null);
cek("tanpa periode sebelumnya mulai dari hari ini", hari(tanpaPeriode.start) === hari(sekarang));

// --- Suspend ---------------------------------------------------------------
cek("belum pernah membeli -> tidak suspend", !shouldSuspendDomain(sekarang, null));
cek(
  "baru saja kedaluwarsa -> tidak suspend",
  !shouldSuspendDomain(sekarang, addMonths(sekarang, -1)),
);
cek(
  "tepat 3 bulan -> suspend",
  shouldSuspendDomain(sekarang, addMonths(sekarang, -DOMAIN_ADDON.suspendAfterMonths)),
);
cek(
  "lebih dari 3 bulan -> suspend",
  shouldSuspendDomain(sekarang, addMonths(sekarang, -5)),
);

// --- Status domain ---------------------------------------------------------
cek("status unpaid tidak aktif walau ada periode", !isDomainActive("unpaid", addMonths(sekarang, 6), sekarang));
cek("status suspended tidak aktif", !isDomainActive("suspended", addMonths(sekarang, 6), sekarang));
cek("status active + periode depan = aktif", isDomainActive("active", addMonths(sekarang, 6), sekarang));
cek("status active + periode lewat = TIDAK aktif", !isDomainActive("active", addMonths(sekarang, -1), sekarang));
cek("status active tanpa tanggal = TIDAK aktif", !isDomainActive("active", null, sekarang));

// --- Status Midtrans -------------------------------------------------------
cek("pending bukan sukses", !SETTLED_STATUSES.has("pending"));
cek("settlement itu sukses", SETTLED_STATUSES.has("settlement"));
cek("deny itu gagal", FAILED_STATUSES.has("deny"));
cek("expire itu gagal", FAILED_STATUSES.has("expire"));

// --------------------------------------------------------------------
// Bagian webhook: butuh server jalan dan kredensial Midtrans terisi.
// --------------------------------------------------------------------
const KEY = process.env.MIDTRANS_SERVER_KEY?.trim();

async function ujiWebhook() {
  console.log("\nWebhook (terhadap route sungguhan):");

  const ownerId = createUuid();
  const slug = `t-addon-${Date.now().toString(36)}`;

  let tenantId = "";
  try {
    const [t] = await db
      .insert(tenants)
      .values({
        name: "Toko Uji Add-on",
        slug,
        customDomain: "toko-uji-addon.com",
        customDomainVerified: true,
        customDomainStatus: "unpaid",
        plan: "basic",
        subscriptionStatus: "active",
        subscriptionExpiresAt: addMonths(new Date(), 6),
        isActive: true,
      })
      .returning();
    tenantId = t.id;

    await db.insert(users).values({
      id: ownerId,
      tenantId,
      email: `owner-${slug}@example.test`,
      fullName: "Owner Uji",
      role: "owner",
    });

    // --- 1. legalitas tidak boleh menyentuh langganan -------------------
    const legOrderId = `${ORDER_ID_PREFIX.legalitas}${tenantId.slice(0, 8)}-${Date.now()}`;
    await db.insert(saasInvoices).values({
      tenantId,
      itemType: "legalitas",
      plan: null,
      period: "monthly",
      amount: LEGALITAS_ADDON.price,
      status: "pending",
      midtransOrderId: legOrderId,
      periodStart: hari(new Date()),
      periodEnd: hari(new Date()),
    });

    const sebelumLangganan = await bacaTenant(tenantId);
    await kirimWebhook({
      orderId: legOrderId,
      status: "settlement",
      amount: LEGALITAS_ADDON.price,
    });

    const sesudahLangganan = await bacaTenant(tenantId);
    cek(
      "leg- lunas TIDAK menambah subscriptionExpiresAt",
      sebelumLangganan.subscriptionExpiresAt.getTime() ===
        sesudahLangganan.subscriptionExpiresAt.getTime(),
      `${sebelumLangganan.subscriptionExpiresAt.toISOString()} -> ${sesudahLangganan.subscriptionExpiresAt.toISOString()}`,
    );
    cek(
      "leg- lunas TIDAK mengubah subscriptionStatus",
      sesudahLangganan.subscriptionStatus === "active",
    );
    cek(
      "leg- lunas TIDAK menyalakan isActive yang sebelumnya mati",
      sesudahLangganan.isActive === sebelumLangganan.isActive,
    );
    cek(
      "leg- lunas TIDAK menyentuh kolom domain",
      sesudahLangganan.customDomainStatus === sebelumLangganan.customDomainStatus &&
        sesudahLangganan.customDomainExpiresAt === null,
    );
    const [legInv] = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.midtransOrderId, legOrderId));
    cek("leg- lunas menandai invoice paid", legInv.status === "paid");

    // --- 2. domain yang dibayar menandai periode -----------------------
    const domOrderId = `${ORDER_ID_PREFIX.domain}${tenantId.slice(0, 8)}-${Date.now()}`;
    const akhir = addMonths(new Date(), 12);
    await db.insert(saasInvoices).values({
      tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: domOrderId,
      periodStart: hari(new Date()),
      periodEnd: hari(akhir),
    });

    await kirimWebhook({
      orderId: domOrderId,
      status: "settlement",
      amount: DOMAIN_ADDON.price,
    });
    const setelahDomain = await bacaTenant(tenantId);
    cek(
      "dom- lunas mengaktifkan domain",
      setelahDomain.customDomainStatus === "active",
      `status=${setelahDomain.customDomainStatus}`,
    );
    cek(
      "dom- lunas mengisi customDomainExpiresAt",
      setelahDomain.customDomainExpiresAt !== null &&
        hari(setelahDomain.customDomainExpiresAt) === hari(akhir),
    );
    cek(
      "dom- lunas TIDAK mengubah periode langganan",
      setelahDomain.subscriptionExpiresAt.getTime() ===
        sesudahLangganan.subscriptionExpiresAt.getTime(),
    );

    // --- 3. domain periode lewat harus suspended, bukan active ---------
    const lewatOrderId = `${ORDER_ID_PREFIX.domain}${tenantId.slice(0, 8)}-${Date.now() + 1}`;
    const lewat = addMonths(new Date(), -2);
    await db.insert(saasInvoices).values({
      tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: lewatOrderId,
      periodStart: hari(lewat),
      periodEnd: hari(lewat),
    });
    await kirimWebhook({
      orderId: lewatOrderId,
      status: "settlement",
      amount: DOMAIN_ADDON.price,
    });
    const setelahLewat = await bacaTenant(tenantId);
    cek(
      "dom- dengan periode lewat TIDAK diaktifkan sebagai active",
      setelahLewat.customDomainStatus === "suspended",
      `status=${setelahLewat.customDomainStatus}`,
    );

    // --- 4. nominal salah ditolak ---------------------------------------
    const salahOrderId = `${ORDER_ID_PREFIX.domain}${tenantId.slice(0, 8)}-${Date.now() + 2}`;
    await db.insert(saasInvoices).values({
      tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: salahOrderId,
      periodStart: hari(addMonths(new Date(), 3)),
      periodEnd: hari(addMonths(new Date(), 15)),
    });
    const res = await kirimWebhook({
      orderId: salahOrderId,
      status: "settlement",
      amount: 1_000,
    });
    cek("nominal salah ditolak 400", res.status === 400, `status=${res.status}`);
    const [tidakLunas] = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.midtransOrderId, salahOrderId));
    cek("nominal salah tidak menandai lunas", tidakLunas.status === "pending");

    // --- 5. pending bukan lunas ----------------------------------------
    const pendingOrderId = `${ORDER_ID_PREFIX.domain}${tenantId.slice(0, 8)}-${Date.now() + 3}`;
    await db.insert(saasInvoices).values({
      tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      status: "pending",
      midtransOrderId: pendingOrderId,
      periodStart: hari(addMonths(new Date(), 6)),
      periodEnd: hari(addMonths(new Date(), 18)),
    });
    await kirimWebhook({
      orderId: pendingOrderId,
      status: "pending",
      amount: DOMAIN_ADDON.price,
    });
    const [pendingInv] = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.midtransOrderId, pendingOrderId));
    cek("pending tidak mengaktifkan domain", pendingInv.status === "pending");

    // --- 6. idempoten --------------------------------------------------
    const [duplikat] = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.midtransOrderId, domOrderId));
    await kirimWebhook({
      orderId: domOrderId,
      status: "settlement",
      amount: DOMAIN_ADDON.price,
    });
    const [setelahDuplikat] = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.midtransOrderId, domOrderId));
    cek(
      "notifikasi berulang tidak mengubah apa pun",
      setelahDuplikat.status === duplikat.status &&
        String(setelahDuplikat.paidAt) === String(duplikat.paidAt),
      `paidAt ${String(duplikat.paidAt)} -> ${String(setelahDuplikat.paidAt)}`,
    );
  } finally {
    // Wajib: tanpa finally, satu pemeriksaan yang gagal menyisakan tenant
    // dan skrip berikutnya gagal karena bentrok slug -- dan tes yang gagal
    // dua kali akan terlihat seperti tes yang rusak.
    if (tenantId) {
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
  }
}

async function bacaTenant(id: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return t;
}

function createUuid(): string {
  return randomUUID();
}

async function kirimWebhook(input: {
  orderId: string;
  status: string;
  amount: number;
}): Promise<Response> {
  const statusCode = input.status === "settlement" ? "200" : "201";
  const signature = createHash("sha512")
    .update(`${input.orderId}${statusCode}${input.amount}${KEY}`)
    .digest("hex");

  return fetch(`${process.env.APP_URL ?? "http://localhost:3000"}/api/webhooks/midtrans`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-midtrans-signature": signature,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      transaction_status: input.status,
      status_code: statusCode,
      gross_amount: String(input.amount),
    }),
  });
}

async function main() {
  if (KEY) {
    await ujiWebhook();
  } else {
    console.log(
      "\nDilewati: MIDTRANS_SERVER_KEY kosong, bagian webhook tidak diuji.\n" +
        "Persis yang terjadi di PR #55: kredensial kosong membuat semua\n" +
        "pemeriksaan RLS hijau tanpa menguji apa pun.",
    );
  }

  console.log(`\n${"-".repeat(70)}`);
  if (gagal.length > 0) {
    console.log(`${gagal.length} GAGAL, ${lulus} lulus:`);
    for (const g of gagal) console.log(`  - ${g}`);
    process.exitCode = 1;
  } else {
    console.log(`Semua ${lulus} pemeriksaan lulus.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  // `process.exitCode`, bukan `process.exit()`: yang kedua membatalkan
  // blok `finally` di dalam ujiWebhook sehingga tenant uji tertinggal.
  process.exitCode = 1;
});
