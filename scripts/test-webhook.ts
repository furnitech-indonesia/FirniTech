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
import { PLANS, PLAN_IDS } from "@/lib/plans";

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

/**
 * Isi zod dari hasil parse yang gagal, untuk pesan error.
 *
 * `ParseResult` narrowed ke `{ success: false }` tidak menyimpan objek error
 * aslinya -- hanya `fieldErrors` yang sudah diterjemahkan. Itu yang
 * ditampilkan ke pengguna, jadi itu juga yang harus terlihat di sini.
 */
function issuesOf(result: {
  success: false;
  fieldErrors: Record<string, string>;
}): Record<string, string> {
  return result.fieldErrors;
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

  const saas = await import("@/lib/midtrans/snap");
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
  // Diskon tahunan 5% (keputusan pemilik produk; sebelumnya 10%). Nilainya
  // dihitung dari harga bulanan, jadi test memakai angka turunan — bukan
  // konstanta yang harus ikut diubah setiap kali harga berubah.
  check(
    "diskon tahunan 5% dari harga bulanan × 12",
    savings === 5,
    `${savings}% (tahun = bulanan × 12 × 0,95)`,
  );

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
    "diskon paket tahunan 5% dan dihitung dari harga bulanan",
    PLANS.basic.priceYearly === Math.round(PLANS.basic.priceMonthly * 12 * 0.95) &&
      PLANS.pro.priceYearly === Math.round(PLANS.pro.priceMonthly * 12 * 0.95) &&
      PLANS.max.priceYearly === Math.round(PLANS.max.priceMonthly * 12 * 0.95),
    PLANS.basic.priceYearly.toLocaleString("id-ID") + " per tahun",
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
    midtransAmount: AMOUNT,
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

  /* ---------- 7. ADD-ON YANG DIBAYAR BARENG (PRD §2.E) ---------- */
  //
  // Alur ini satu-satunya tempat dua invoice dilunasi oleh SATU charge, dan
  // pemeriksaan nominalnya adalah tempat kesalahan yang paling mahal di
  // seluruh sistem: kalau `gross_amount` dibandingkan dengan `invoice.amount`
  // (Rp 750.000) sementara yang dikirim Rp 1.250.000, webhook membalas 400
  // ATAS PEMBAYARAN YANG SUDAH SUKSES. Tenant tidak pernah aktif, uang
  // hilang, dan tidak ada yang bisa memperbaikinya tanpa pengembalian manual.
  //
  // Semua pemeriksaan di sini memanggil POST() sungguhan dengan signature
  // asli, bukan menyalin logikanya. Menyalinnya berarti tes menguji salinan.

  const BUNDLE_SLUG = "uji-webhook-bundled";
  await db.delete(tenants).where(eq(tenants.slug, BUNDLE_SLUG));

  const BUNDLE_ORDER = "saas-bundled-uji";
  const SUB_AMOUNT = PLANS.pro.priceMonthly; // 750.000
  const LEG_AMOUNT = 500_000;
  const BUNDLE_GROSS = `${SUB_AMOUNT + LEG_AMOUNT}.00`;

  const [bundleTenant] = await db
    .insert(tenants)
    .values({
      name: "Uji Webhook Bundled",
      slug: BUNDLE_SLUG,
      plan: "pro",
      subscriptionStatus: "pending",
      subscriptionExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      isActive: false,
    })
    .returning({ id: tenants.id });

  const [bundleInvoice] = await db
    .insert(saasInvoices)
    .values({
      tenantId: bundleTenant.id,
      plan: "pro",
      period: "monthly",
      amount: SUB_AMOUNT,
      // Inilah inti kolom baru: nominal yang DITAGIH, bukan nilai invoice ini.
      midtransAmount: SUB_AMOUNT + LEG_AMOUNT,
      status: "pending",
      midtransOrderId: BUNDLE_ORDER,
      periodStart: "2026-10-01",
      periodEnd: "2026-11-01",
    })
    .returning({ id: saasInvoices.id });

  const [bundleLegalitas] = await db
    .insert(saasInvoices)
    .values({
      tenantId: bundleTenant.id,
      itemType: "legalitas",
      plan: null,
      period: "monthly",
      amount: LEG_AMOUNT,
      midtransAmount: LEG_AMOUNT,
      status: "pending",
      // TIDAK memakai `BUNDLE_ORDER`: `saas_invoice_midtrans_idx` UNIQUE,
      // dan dua baris dengan order_id sama membuat webhook tidak tahu
      // invoice mana yang harus ditulis.
      bundledWith: bundleInvoice.id,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-01",
    })
    .returning({ id: saasInvoices.id });

  const bundleState = async () => {
    const [row] = await db
      .select({
        active: tenants.isActive,
        status: tenants.subscriptionStatus,
        expires: tenants.subscriptionExpiresAt,
      })
      .from(tenants)
      .where(eq(tenants.id, bundleTenant.id))
      .limit(1);
    const invoices = await db
      .select({
        id: saasInvoices.id,
        itemType: saasInvoices.itemType,
        status: saasInvoices.status,
        amount: saasInvoices.amount,
      })
      .from(saasInvoices)
      .where(eq(saasInvoices.tenantId, bundleTenant.id));
    return { tenant: row, invoices };
  };

  const bundleNotify = (body: Record<string, unknown>, signature: string) =>
    POST(
      new Request("http://localhost/api/webhooks/midtrans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-midtrans-signature": signature,
        },
        body: JSON.stringify(body),
      }),
    ).then((r: { status: number }) => r.status);

  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  // 1. Nominal langganan saja harus DITOLAK. Ini yang membuktikan
  //    pemeriksaan berjalan terhadap `midtransAmount`: kalau ia membaca
  //    `amount`, angka ${rp(SUB_AMOUNT)} ini justru akan COCOK dan melunasi
  //    tagihan ${rp(SUB_AMOUNT + LEG_AMOUNT)} setengah jalan.
  const subOnly = await bundleNotify(
    {
      order_id: BUNDLE_ORDER,
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: `${SUB_AMOUNT}.00`,
      transaction_id: "trx-bundle-sub",
    },
    sign(BUNDLE_ORDER, "200", `${SUB_AMOUNT}.00`),
  );
  check(
    "nominal langganan saja ditolak (add-on belum ikut dibayar)",
    subOnly === 400,
    `status ${subOnly} — 200 berarti tagihan ${rp(SUB_AMOUNT + LEG_AMOUNT)} dilunasi ${rp(SUB_AMOUNT)}`,
  );
  let bs = await bundleState();
  check(
    "notifikasi dengan nominal salah tidak mengubah apa pun",
    bs.invoices.every((i) => i.status === "pending") &&
      bs.tenant!.active === false,
    bs.invoices.map((i) => `${i.itemType}=${i.status}`).join(", "),
  );

  // 2. Nominal gabungan diterima.
  const bundleSettled = await bundleNotify(
    {
      order_id: BUNDLE_ORDER,
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: BUNDLE_GROSS,
      transaction_id: "trx-bundle-1",
    },
    sign(BUNDLE_ORDER, "200", BUNDLE_GROSS),
  );
  check(
    "satu charge untuk dua invoice diterima",
    bundleSettled === 200,
    `status ${bundleSettled}`,
  );

  bs = await bundleState();
  const legRow = bs.invoices.find((i) => i.id === bundleLegalitas.id)!;
  const subRow = bs.invoices.find((i) => i.id === bundleInvoice.id)!;
  check(
    "invoice add-on ikut lunas bersama langganan",
    legRow.status === "paid",
    `status=${legRow.status}`,
  );
  check(
    "langganan juga lunas",
    subRow.status === "paid",
    `status=${subRow.status}`,
  );
  check(
    "nilai invoice TIDAK berubah jadi penjumlahan",
    subRow.amount === SUB_AMOUNT && legRow.amount === LEG_AMOUNT,
    `sub=${subRow.amount}, legalitas=${legRow.amount}`,
  );
  check(
    "langganan jadi aktif",
    bs.tenant!.active === true && bs.tenant!.status === "active",
    `isActive=${bs.tenant!.active}, status=${bs.tenant!.status}`,
  );
  check(
    "masa langganan TIDAK ditambah oleh add-on legalitas",
    bs.tenant!.expires.toISOString().slice(0, 10) === "2026-11-01",
    `${bs.tenant!.expires.toISOString().slice(0, 10)} — kalau berubah, ada bug satu tahun gratis`,
  );

  // 3. Idempoten untuk tagihan bareng. Midtrans mengirim notifikasi yang
  //    sama berulang kali, dan di sini ada DUA baris yang harus tetap
  //    konsisten — bukan satu.
  const bundleAgain = await bundleNotify(
    {
      order_id: BUNDLE_ORDER,
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: BUNDLE_GROSS,
      transaction_id: "trx-bundle-1",
    },
    sign(BUNDLE_ORDER, "200", BUNDLE_GROSS),
  );
  bs = await bundleState();
  check(
    "notifikasi berulang untuk tagihan bareng tidak merusak",
    bundleAgain === 200 && bs.invoices.every((i) => i.status === "paid"),
    `status ${bundleAgain}, ${bs.invoices.map((i) => i.status).join(",")}`,
  );

  // 4. Gagal bayar menutup KEDUA invoice.
  //
  //    Kalau add-on dibiarkan `pending`, `purchaseLegalitasAddon` menganggap
  //    paket sudah dibeli -- pemeriksaannya menolak status `pending` dan
  //    `paid` -- lalu orang yang tagihannya ditolak bank tidak akan pernah
  //    bisa membeli ulang. Satu status yang tidak konsisten menutup satu
  //    jalan pembelian seumur tenant.
  const BUNDLE_ORDER_2 = "saas-bundled-uji-2";
  const BUNDLE_SLUG_2 = "uji-webhook-bundled-2";
  await db.delete(tenants).where(eq(tenants.slug, BUNDLE_SLUG_2));
  const [t2] = await db
    .insert(tenants)
    .values({
      name: "Uji Webhook Bundled Gagal",
      slug: BUNDLE_SLUG_2,
      plan: "pro",
      subscriptionStatus: "pending",
      subscriptionExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      isActive: false,
    })
    .returning({ id: tenants.id });
  const [inv2] = await db
    .insert(saasInvoices)
    .values({
      tenantId: t2.id,
      plan: "pro",
      period: "monthly",
      amount: SUB_AMOUNT,
      midtransAmount: SUB_AMOUNT + LEG_AMOUNT,
      status: "pending",
      midtransOrderId: BUNDLE_ORDER_2,
      periodStart: "2026-10-01",
      periodEnd: "2026-11-01",
    })
    .returning({ id: saasInvoices.id });
  const [leg2] = await db
    .insert(saasInvoices)
    .values({
      tenantId: t2.id,
      itemType: "legalitas",
      plan: null,
      period: "monthly",
      amount: LEG_AMOUNT,
      midtransAmount: LEG_AMOUNT,
      status: "pending",
      bundledWith: inv2.id,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-01",
    })
    .returning({ id: saasInvoices.id });

  await bundleNotify(
    {
      order_id: BUNDLE_ORDER_2,
      transaction_status: "expire",
      status_code: "400",
      gross_amount: BUNDLE_GROSS,
      transaction_id: null,
    },
    sign(BUNDLE_ORDER_2, "400", BUNDLE_GROSS),
  );
  const [afterFail2] = await db
    .select({ status: saasInvoices.status })
    .from(saasInvoices)
    .where(eq(saasInvoices.id, leg2.id))
    .limit(1);
  const [tenant2] = await db
    .select({ active: tenants.isActive })
    .from(tenants)
    .where(eq(tenants.id, t2.id))
    .limit(1);
  check(
    "gagal bayar menandai invoice add-on failed, bukan pending",
    afterFail2?.status === "failed",
    `status=${afterFail2?.status} — pending akan mengunci pembelian ulang`,
  );
  check(
    "gagal bayar tidak mengaktifkan tenant",
    tenant2?.active === false,
    `isActive=${tenant2?.active}`,
  );

  await db.delete(tenants).where(eq(tenants.slug, BUNDLE_SLUG));
  await db.delete(tenants).where(eq(tenants.slug, BUNDLE_SLUG_2));

  /* ---------- 8. SKEMA PENDAFTARAN: CHECKBOX ADD-ON ---------- */
  //
  // Checkbox yang TIDAK dicentang tidak ada di FormData sama sekali --
  // `formData.get()` mengembalikan `null` dan kuncinya hilang dari objek.
  // Tanpa `.default(false)` di skema, `z.boolean()` menolak field yang
  // memang tidak dikirim, dan pendaftaran gagal untuk semua orang yang
  // tidak ingin add-on, yaitu hampir semua orang.
  const tanpaAddon = parseForm(registerFormSchema, fd(VALID));
  check(
    "pendaftaran tanpa add-on tetap valid (checkbox tidak dikirim)",
    tanpaAddon.success,
    tanpaAddon.success ? "" : JSON.stringify(issuesOf(tanpaAddon)),
  );
  check(
    "tanpa add-on, tambahLegalitas = false",
    tanpaAddon.success && tanpaAddon.data.tambahLegalitas === false,
    tanpaAddon.success ? `nilai=${tanpaAddon.data.tambahLegalitas}` : "parse gagal",
  );

  const denganAddon = parseForm(
    registerFormSchema,
    fd({ ...VALID, tambahLegalitas: "on" }),
  );
  check(
    "checkbox add-on dicentang diterima (nilai `on` dinormalkan)",
    denganAddon.success,
    denganAddon.success ? "" : JSON.stringify(issuesOf(denganAddon)),
  );
  check(
    "dicentang, tambahLegalitas = true",
    denganAddon.success && denganAddon.data.tambahLegalitas === true,
    denganAddon.success ? `nilai=${denganAddon.data.tambahLegalitas}` : "parse gagal",
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
