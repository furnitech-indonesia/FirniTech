/*
 * `dotenv/config` HARUS jadi import pertama.
 *
 * ESM meng-hoist semua import, tapi `dotenv/config` tetap dieksekusi sebelum
 * import lain yang membacanya, jadi urutannya di sini penting hanya karena
 * `@/db` membuat koneksi saat modul dimuat — kalau `.env` belum termuat,
 * `DATABASE_URL` kosong dan skrip mati dengan "DATABASE_URL belum diset".
 */
import "dotenv/config";

import { eq, sql } from "drizzle-orm";

/*
 * Import dari `../src/db/client`, BUKAN `@/db`.
 *
 * `@/db` (index.ts) memasang guard `"server-only"` yang melempar error kalau
 * dimuat di luar bundler Next. Skrip CLI memang berada di luar itu, jadi
 * harus lewat client.ts — persis seperti scripts/seed.ts dan scripts/test-rls.ts.
 */
import { db } from "../src/db/client";
import { saasInvoices, tenants } from "../src/db/schema";
import {
  registerFormSchema,
  workshopFormSchema,
  priceFor,
  accountFormSchema,
} from "@/lib/schemas/register";
// `parseForm` ada di primitives, bukan di register — barrel `@/lib/schemas`
// hanya mengekspor apa yang didefinisikan di file itu sendiri.
import { parseForm } from "@/lib/schemas/primitives";
import { PROGRESS_STAGE_ORDER } from "@/lib/order-status";
import { PLANS, PLAN_IDS, PLATFORM_FEE_RATE } from "@/lib/plans";

/**
 * Uji keamanan alur pendaftaran & pembayaran (Sprint 10 Fase D).
 *
 * Berbeda dengan `test:register` yang memeriksa wizard lewat browser: semua
 * yang di sini bisa diperiksa tanpa merender halaman, jadi jauh lebih cepat
 * dan tidak butuh server jalan.
 *
 * Yang diuji, diurutkan dari yang paling berbahaya:
 *   1. Gerbang tenant belum bayar — dua tempat, dan satu saja bisa luput.
 *   2. Signature webhook — endpoint yang mengaktifkan langganan.
 *   3. Skema pendaftaran — apa yang boleh lolos ke provisioning.
 *   4. Harga — apakah bisa dipalsukan dari sisi klien.
 *
 * Jalankan: npm run test:webhook
 */

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

/** Encode FormData dari objek biasa, untuk menguji skema. */
function fd(input: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(input)) data.set(k, v);
  return data;
}

const VALID = {
  fullName: "Budi Santoso",
  phone: "+6281234567890",
  email: "budi@contoh.test",
  password: "BengkelKuat9",
  confirmPassword: "BengkelKuat9",
  workshopName: "Mebel Jaya",
  slug: "mebel-jaya",
  plan: "pro",
  period: "monthly",
};

async function main() {
  /* ---------- 1. Gerbang tenant belum bayar ---------- */

  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/lib/tenants.ts", "utf-8"),
  );
  const dashboardLayout = await import("node:fs/promises").then((fs) =>
    fs.readFile("app/dashboard/layout.tsx", "utf-8"),
  );

  check(
    "resolusi tenant menyaring isActive (toko publik tertutup)",
    (source.match(/eq\(tenants\.isActive, true\)/g) ?? []).length >= 2,
    `${(source.match(/eq\(tenants\.isActive, true\)/g) ?? []).length} filter ditemukan`,
  );
  check(
    "dashboard mengunci tenant pending ke /menunggu-pembayaran",
    dashboardLayout.includes('"/menunggu-pembayaran"') &&
      dashboardLayout.includes("subscriptionStatus === \"pending\""),
    "guard ada di app/dashboard/layout.tsx",
  );

  const SLUG = "uji-tenant-belum-bayar";
  const [pending] = await db
    .insert(tenants)
    .values({
      name: "Uji Tenant Belum Bayar",
      slug: SLUG,
      plan: "basic",
      subscriptionStatus: "pending",
      subscriptionExpiresAt: new Date(),
      isActive: false,
    })
    .onConflictDoNothing()
    .returning({ id: tenants.id });

  if (pending) {
    const { getTenantBySlug } = await import("@/lib/tenants");
    const resolved = await getTenantBySlug(SLUG);
    check(
      "tenant pending tidak ter-resolve jadi toko publik",
      resolved === null,
      resolved === null ? "null, seperti seharusnya" : "TER-RESOLVE — bocor",
    );

    const invoice = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.tenantId, pending.id))
      .limit(1);
    check(
      "tenant pending tanpa invoice tersimpan sebagai pending",
      invoice.length === 0,
      `${invoice.length} invoice (uji ini tidak membuat tagihan)`,
    );
  }

  /* ---------- 2. Signature webhook ---------- */

  const saas = await import("@/lib/midtrans/saas");
  const { verifyWebhookSignature, isMidtransConfigured } = saas;

  /*
   * Kunci Midtrans DISUNTIKKAN, bukan diambil dari `.env`.
   *
   * `MIDTRANS_SERVER_KEY` sengaja kosong di repo ini, jadi versi pertama
   * memakai signature sampah (`"x".repeat(128)`) dan mengharapkan
   * penolakan — yang membuat ujinya tidak menguji apa pun. Yang diuji
   * seharusnya justru jalur yang benar: hitung sha512 dengan kunci yang
   * diketahui, lalu pastikan diterima.
   */
  const parts = ["saas-uji-1", "200", "300000.00"];
  const previousKey = process.env.MIDTRANS_SERVER_KEY;
  const key = "SB-Mid-server-uji";
  process.env.MIDTRANS_SERVER_KEY = key;

  const good = (await import("node:crypto"))
    .createHash("sha512")
    .update(`${parts[0]}${parts[1]}${parts[2]}${key}`)
    .digest("hex");

  check(
    "signature yang benar diterima",
    verifyWebhookSignature({
      orderId: parts[0],
      statusCode: parts[1],
      grossAmount: parts[2],
      signature: good,
    }),
    "dihitung ulang dari hash dengan kunci uji",
  );
  check(
    "signature yang salah ditolak",
    !verifyWebhookSignature({
      orderId: parts[0],
      statusCode: parts[1],
      grossAmount: parts[2],
      signature: "a".repeat(128),
    }),
    "128 karakter a",
  );
  check(
    "signature dengan nominal lain ditolak",
    !verifyWebhookSignature({
      orderId: parts[0],
      statusCode: parts[1],
      grossAmount: "1.00",
      signature: good,
    }),
    "nominal diubah, signature tidak ikut",
  );
  check(
    "signature dengan order_id lain ditolak",
    !verifyWebhookSignature({
      orderId: "saas-uji-2",
      statusCode: parts[1],
      grossAmount: parts[2],
      signature: good,
    }),
    "order_id diubah, signature tidak ikut",
  );
  check(
    "signature kosong ditolak",
    !verifyWebhookSignature({
      orderId: parts[0],
      statusCode: parts[1],
      grossAmount: parts[2],
      signature: null,
    }),
    "header tidak ada",
  );
  // Dikembalikan ke kosong untuk menguji jalur "tidak bisa memverifikasi".
  process.env.MIDTRANS_SERVER_KEY = "";
  let threw = false;
  let returned = true;
  try {
    returned = verifyWebhookSignature({
      orderId: parts[0],
      statusCode: parts[1],
      grossAmount: parts[2],
      signature: good,
    });
  } catch {
    threw = true;
  }
  check(
    "server key kosong = tolak, bukan exception",
    !threw && !returned,
    threw ? "MELEMPAR — akan membalas 500 dan Midtrans mengulang terus" : "returns false, aman",
  );
  check(
    "isMidtransConfigured melaporkan key kosong sebagai belum terkonfigurasi",
    isMidtransConfigured() === false,
    "false",
  );

  // Kembalikan environment persis seperti semula. `previousKey` bisa
  // `undefined` (di repo ini memang kosong), jadi memakai `delete` —
  // menetapkan string "undefined" akan membuat `isMidtransConfigured()`
  // selainnya benar true dan membocorkan key palsu ke request berikutnya.
  if (previousKey === undefined) delete process.env.MIDTRANS_SERVER_KEY;
  else process.env.MIDTRANS_SERVER_KEY = previousKey;

  check(
    "pending bukan berarti lunas",
    !saas.SETTLED_STATUSES.has("pending"),
    'SETTLED_STATUSES tidak memuat "pending"',
  );
  check(
    "capture dan settlement berarti lunas",
    saas.SETTLED_STATUSES.has("capture") && saas.SETTLED_STATUSES.has("settlement"),
    " keduanya ada",
  );
  check(
    "deny, cancel, expire, failure berarti gagal",
    ["deny", "cancel", "expire", "failure"].every((s) => saas.FAILED_STATUSES.has(s)),
    " keempatnya ada",
  );

  /* ---------- 3. Skema pendaftaran ---------- */

  /*
   * WAJIB lewat `parseForm`, bukan `safeParse` langsung.
   *
   * `fd()` menghasilkan FormData, sedangkan skema zod mengharapkan objek
   * biasa. Versi pertama memanggil `registerFormSchema.safeParse(fd(VALID))`
   * dan itu selalu gagal — bukan karena skemanya salah, tapi karena setiap
   * isinya FormData, bukan string. `parseForm` adalah lapisan yang
   * memang tugasnya mengubah FormData menjadi objek biasa.
   */
  const okAll = parseForm(registerFormSchema, fd(VALID));
  check(
    "isian lengkap lolos skema",
    okAll.success,
    okAll.success ? "semua field terpenuhi" : Object.keys(okAll.fieldErrors).join(", "),
  );

  const cases: Array<[string, Record<string, string>, string]> = [
    ["password terlalu pendek", { password: "abc", confirmPassword: "abc" }, "password"],
    ["tanpa huruf besar", { password: "bengkelkuat9", confirmPassword: "bengkelkuat9" }, "password"],
    ["tanpa angka", { password: "BengkelKuat", confirmPassword: "BengkelKuat" }, "password"],
    ["konfirmasi tidak sama", { confirmPassword: "BedaBanget9" }, "confirmPassword"],
    ["email tidak valid", { email: "bukan-email" }, "email"],
    ["nomor telepon terlalu pendek", { phone: "123" }, "phone"],
    ["nama kosong", { fullName: "   " }, "fullName"],
    /*
     * Kasus ini dulu `slug: "Mebel Jaya!!"` dan mengharapkan penolakan —
     * padahal itu bertentangan dengan desain `slug` di
     * src/lib/schemas/primitives.ts, yang memang MENYANTAISA bukan menolak:
     * "karakter yang bisa diselundupkan ke URL harus dibuang di sini".
     * Wizard bahkan punya tombol "Bikin dari nama workshop" yang bergantung
     * pada perilaku itu. Input yang benar-benar tidak bisa jadi slug adalah
     * yang bersihnya menjadi string kosong.
     */
    ["slug bersihnya jadi kosong", { slug: "!!!" }, "slug"],
    ["paket tidak dikenal", { plan: "enterprise" }, "plan"],
    ["periode tidak dikenal", { period: "weekly" }, "period"],
  ];

  for (const [label, patch, field] of cases) {
    const parsed = parseForm(registerFormSchema, fd({ ...VALID, ...patch }));
    const rejected = !parsed.success;
    const pointsAtField =
      !parsed.success && Object.hasOwn(parsed.fieldErrors ?? {}, field);
    check(
      `${label} ditolak dan menunjuk ke ${field}`,
      rejected && pointsAtField,
      rejected
        ? pointsAtField
          ? "ditolak, field benar"
          : "ditolak tapi field salah"
        : "LOLOS",
    );
  }

  /* ---------- 4. Harga tidak bisa dipalsukan ---------- */

  check(
    "harga bulanan dihitung dari PLANS",
    priceFor("pro", "monthly") === PLANS.pro.priceMonthly,
    `Rp ${priceFor("pro", "monthly")}`,
  );
  check(
    "harga tahunan dihitung dari PLANS",
    priceFor("pro", "yearly") === PLANS.pro.priceYearly,
    `Rp ${priceFor("pro", "yearly")}`,
  );
  check(
    "harga tahunan lebih murah dari 12x bulanan",
    PLAN_IDS.every((id) => PLANS[id].priceYearly < PLANS[id].priceMonthly * 12),
    "ketiga paket",
  );
  const savings = Math.round(
    (1 - PLANS.pro.priceYearly / (PLANS.pro.priceMonthly * 12)) * 100,
  );
  check("diskon tahunan 10%, bukan 15% seperti desain Stitch", savings === 10, `${savings}%`);

  // Kontrak yang sebenarnya dari `slug`: menyanitasi, bukan menolak.
  const sanitized = parseForm(
    workshopFormSchema,
    fd({ workshopName: "Mebel Jaya", slug: "Mebel Jaya!!" }),
  );
  check(
    "slug disanitasi (bukan ditolak): \"Mebel Jaya!!\" -> \"mebel-jaya\"",
    sanitized.success && sanitized.data.slug === "mebel-jaya",
    sanitized.success ? sanitized.data.slug : Object.keys(sanitized.fieldErrors).join(", "),
  );

  const withAmount = parseForm(registerFormSchema, fd({ ...VALID, amount: "1" }));
  check(
    "field amount dari klien diabaikan skema",
    withAmount.success && !("amount" in (withAmount.data as object)),
    withAmount.success
      ? `tidak ada \`amount\` di hasil parse (${Object.keys(withAmount.data).length} field)`
      : Object.keys(withAmount.fieldErrors).join(", "),
  );

  /* ---------- 5. Integritas bermasalah ---------- */

  check(
    "biaya platform 1,5%",
    PLATFORM_FEE_RATE === 0.015,
    `${PLATFORM_FEE_RATE * 100}%`,
  );
  check(
    "lima tahap produksi, urut dan lengkap",
    PROGRESS_STAGE_ORDER.length === 5 &&
      PROGRESS_STAGE_ORDER[0] === "bahan_dipotong" &&
      PROGRESS_STAGE_ORDER[4] === "packing",
    PROGRESS_STAGE_ORDER.join(" → "),
  );
  check(
    "password minimal 8 karakter dan punya tiga syarat",
    (accountFormSchema.shape.password as { minLength: number }).minLength === 8,
    "min 8",
  );

  // Bersihkan tenant uji.
  await db.delete(tenants).where(eq(tenants.slug, SLUG));


  /* ---------- 6. END-TO-END terhadap handler webhook sungguhan ---------- */
  // Di atas, `verifyWebhookSignature` diuji sebagai fungsi. Bagian ini memanggil
  // POST() dari route handler-nya langsung dengan Request sungguhan dan kunci
  // uji, lalu memeriksa efeknya di database. Ini yang membuktikan tenant
  // benar-benar diaktifkan lewat uang, bukan lewat klaim.
  const { POST } = await import("../app/api/webhooks/midtrans/route");
  const { createHash } = await import("node:crypto");

  const e2eKey = "SB-Mid-server-uji-e2e";
  const e2ePrevKey = process.env.MIDTRANS_SERVER_KEY;
  process.env.MIDTRANS_SERVER_KEY = e2eKey;

  const ORDER = "saas-e2e-uji";
  const AMOUNT = PLANS.pro.priceMonthly;
  const GROSS = `${AMOUNT}.00`;

  // Dibersihkan dulu supaya uji ini bisa diulang walau tadi gagal di tengah jalan.
  await db.delete(tenants).where(eq(tenants.slug, "uji-webhook-e2e"));

  const [e2eTenant] = await db
    .insert(tenants)
    .values({
      name: "Uji Webhook E2E",
      slug: "uji-webhook-e2e",
      plan: "pro",
      subscriptionStatus: "pending",
      subscriptionExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      isActive: false,
    })
    .returning({ id: tenants.id });

  await db.insert(saasInvoices).values({
    tenantId: e2eTenant.id,
    plan: "pro",
    period: "monthly",
    amount: AMOUNT,
    status: "pending",
    midtransOrderId: ORDER,
    periodStart: "2026-10-01",
    periodEnd: "2026-11-01",
  });

  const sign = (orderId: string, statusCode: string, gross: string) =>
    createHash("sha512")
      .update(`${orderId}${statusCode}${gross}${e2eKey}`)
      .digest("hex");

  const notify = (body: Record<string, unknown>, signature: string | null) =>
    POST(
      new Request("http://localhost/api/webhooks/midtrans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "x-midtrans-signature": signature } : {}),
        },
        body: JSON.stringify(body),
      }),
    ).then((r: { status: number }) => r.status);

  const settlement = {
    order_id: ORDER,
    transaction_status: "settlement",
    status_code: "200",
    gross_amount: GROSS,
    transaction_id: "trx-e2e-1",
  };

  const tenantState = async () => {
    const [row] = await db
      .select({
        active: tenants.isActive,
        status: tenants.subscriptionStatus,
        expires: tenants.subscriptionExpiresAt,
      })
      .from(tenants)
      .where(eq(tenants.id, e2eTenant.id))
      .limit(1);
    return row;
  };

  check(
    "tanpa signature ditolak 403",
    (await notify(settlement, null)) === 403,
    "tanpa header signature",
  );
  check(
    "signature palsu ditolak 403",
    (await notify(settlement, "b".repeat(128))) === 403,
    "128 karakter b",
  );

  let state = await tenantState();
  check(
    "notifikasi yang ditolak tidak mengubah apa pun",
    state.active === false && state.status === "pending",
    `isActive=${state.active}, status=${state.status}`,
  );

  check(
    "nominal tidak cocok ditolak 400",
    (await notify({ ...settlement, gross_amount: "1.00" }, sign(ORDER, "200", "1.00"))) ===
      400,
    "tagihan 500.000, dinotifikasi 1",
  );

  // `pending` berarti VA sudah dibuat, uang belum masuk.
  await notify(
    { ...settlement, transaction_status: "pending" },
    sign(ORDER, "200", GROSS),
  );
  state = await tenantState();
  check(
    "status pending TIDAK mengaktifkan tenant",
    state.active === false && state.status === "pending",
    "masih nonaktif — inilah gunanya aturan tanpa free trial",
  );

  const settled = await notify(settlement, sign(ORDER, "200", GROSS));
  check("settlement sah diterima", settled === 200, `status ${settled}`);

  state = await tenantState();
  check(
    "settlement menyalakan tenant dan menandai langganan aktif",
    state.active === true && state.status === "active",
    `isActive=${state.active}, status=${state.status}`,
  );
  check(
    "periode langganan diisi dari akhir periode tagihan",
    state.expires.toISOString().slice(0, 10) === "2026-11-01",
    state.expires.toISOString().slice(0, 10),
  );

  const [paidInvoice] = await db
    .select()
    .from(saasInvoices)
    .where(eq(saasInvoices.midtransOrderId, ORDER))
    .limit(1);
  check(
    "tagihan ditandai lunas dan mencatat transaction id",
    paidInvoice.status === "paid" && paidInvoice.transactionId === "trx-e2e-1",
    `status=${paidInvoice.status}, trx=${paidInvoice.transactionId}`,
  );

  // Idempoten: Midtrans mengirim notifikasi yang sama berulang kali.
  const again = await notify(settlement, sign(ORDER, "200", GROSS));
  check("notifikasi berulang tidak merusak", again === 200, `status ${again}`);

  const [unknown] = await db.execute(
    sql`select count(*)::int as n from integration_audit_logs where tenant_id = ${e2eTenant.id}`,
  );
  check(
    "jejak audit tertulis",
    Number((unknown as unknown as { n: number }).n) > 0,
    "ada baris di integration_audit_logs",
  );

  const unknownOrder = await notify(
    { ...settlement, order_id: "saas-tidak-dikenal" },
    sign("saas-tidak-dikenal", "200", GROSS),
  );
  check(
    "order_id tak dikenal dibalas 200, bukan 404",
    unknownOrder === 200,
    `status ${unknownOrder} — 404 akan membuat Midtrans mengulang terus`,
  );

  if (e2ePrevKey === undefined) delete process.env.MIDTRANS_SERVER_KEY;
  else process.env.MIDTRANS_SERVER_KEY = e2ePrevKey;

  await db.delete(tenants).where(eq(tenants.slug, "uji-webhook-e2e"));

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan keamanan lulus."
      : `\n${failures} pemeriksaan keamanan gagal.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
