import "dotenv/config";

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { chromium, type Browser } from "playwright";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  customerAddresses,
  integrationAuditLogs,
  orderItems,
  orders,
  products,
  shippingRates,
  tenants,
} from "@/db/schema";
import { buildShippingIndex, lookupShippingRate, shippingFeeFor } from "@/lib/shipping-lookup";

/**
 * Uji checkout & pembayaran Midtrans (Sprint 5 bagian 4).
 *
 * Yang diuji di sini BUKAN "halamannya bisa dibuka" — itu urusan
 * `test:visual`. Yang diuji adalah uang: apakah total yang ditagih sama
 * dengan subtotal barang ditambah ongkir yang benar, apakah manipulasi cookie
 * bisa mengubah harga, dan apakah hanya notifikasi dengan tanda tangan yang
 * benar yang bisa menandai pesanan lunas.
 *
 * Tiga bagian:
 *   A. Aturan lookup ongkir (murni, tanpa database)
 *   B. Fikstur: tenant uji, produk terbit, tarif khusus + cadangan, alamat
 *   C. Alur sungguhan lewat peramban sampai halaman Midtrans, lalu notifikasi
 *      webhook dengan tanda tangan asli
 *
 * Jalankan: npm run test:checkout   (server harus sudah jalan)
 *
 * CATATAN SANDBOX: skrip ini benar-benar memanggil API Midtrans. Kredensial
 * di .env, default `MIDTRANS_IS_SANDBOX=true`, jadi tidak ada uang sungguhan
 * yang berpindah. Kalau nilainya `false`, skrip ini membuat tagihan di
 * produksi — yang tidak bisa dibatalkan.
 */

const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const PRODUCT_SLUG = "kursi-uji-checkout";
const PHONE = "6281299988877";
const EMAIL = "pembeli-uji@example.com";
/** regencyId Kota Bandung, dipakai agar tarif khusus bisa diuji. */
const REGENCY = "32.73";
const PRICE = 1_500_000;
const SPECIFIC_FEE = 250_000;
const DEFAULT_FEE = 300_000;

let failures = 0;
const slug = `uji-checkout-${Date.now()}`;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

async function requireServer(): Promise<void> {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (error) {
    console.error(
      `\nServer tidak berjalan di ${BASE} — ${(error as Error).message}.\n` +
        "Jalankan `npm run build && npm run start` lebih dulu.\n",
    );
    process.exit(2);
  }
}

/* ================= A. Aturan lookup ongkir ================= */

/**
 * Pemeriksaan struktural yang TIDAK bisa dibuktikan dari database.
 *
 * `findShippingRate` mengembalikan `null` dan `createCheckoutOrder` memanggilnya
 * — itu terbukti dari sisi data. Tapi kalau suatu saat ada yang menulis
 * `rate.rateAmount ?? 0` di action itu, semua pemeriksaan di bagian A dan C
 * masih lulus karena database-nya benar; yang salahnya cuma kode. Pemeriksaan
 * sumber menutup celah itu.
 */
function testSourceGuards(): void {
  const source = readSource("src/lib/actions/checkout.ts");
  check(
    "tidak ada jaring pengaman 0 untuk ongkir di pembuatan pesanan",
    !/rateAmount\s*\?\?\s*0/.test(source) && !/shippingFee\s*\?\?\s*0/.test(source),
    "tidak ada `?? 0` untuk ongkir",
  );
  check(
    "harga diambil ulang dari database, bukan dari cookie keranjang",
    source.includes("from(products)") && source.includes("products.basePrice"),
    "subtotal dihitung dari tabel products",
  );
  check(
    "alamat disaring tenantId saat dibaca",
    source.includes("eq(customerAddresses.tenantId, tenant.id)"),
    "syaratnya id DAN tenantId",
  );
  check(
    "keranjang dibaca lewat readCart, bukan dari FormData",
    source.includes("readCart()") && !/formData\.get\("cart"/.test(source),
    "cookie adalah satu-satunya sumber keranjang",
  );
  check(
    "webhook memisahkan tagihan pesanan (ord-) dari tagihan SaaS (saas-)",
    readSource("app/api/webhooks/midtrans/route.ts").includes(
      'orderId.startsWith("ord-")',
    ),
    "cabang pesanan dicek lebih dulu",
  );
}

function testLookupRule() {
  const index = buildShippingIndex([
    { regencyId: REGENCY, isDefault: false, rateAmount: SPECIFIC_FEE },
    { regencyId: null, isDefault: true, rateAmount: DEFAULT_FEE },
  ]);

  const specific = lookupShippingRate(index, REGENCY);
  check(
    "tarif khusus menang atas tarif cadangan",
    specific?.source === "specific" && specific.rateAmount === SPECIFIC_FEE,
    JSON.stringify(specific),
  );

  const fallback = lookupShippingRate(index, "11.11");
  check(
    "kabupaten tanpa tarif khusus jatuh ke cadangan",
    fallback?.source === "default" && fallback.rateAmount === DEFAULT_FEE,
    JSON.stringify(fallback),
  );

  const empty = buildShippingIndex([]);
  const none = lookupShippingRate(empty, REGENCY);
  check(
    "tenant tanpa tarif apa pun menghasilkan null",
    none === null,
    none === null ? "null (benar)" : `mengembalikan ${none.rateAmount} (BAHAYA)`,
  );
  check(
    "tidak ada jalur yang mengembalikan 0 sebagai ongkir",
    shippingFeeFor(empty, REGENCY) === null,
    "null, bukan 0 — pemanggil wajib memblokir",
  );
  check(
    "regencyId null tetap boleh memakai tarif cadangan",
    lookupShippingRate(index, null)?.rateAmount === DEFAULT_FEE,
    "cadangan berlaku juga tanpa regencyId",
  );
}

/* ================= B. Fikstur ================= */

type Fixture = {
  tenantId: string;
  productId: string;
  addressId: string;
  otherTenantId: string;
  otherAddressId: string;
};

async function setup(): Promise<Fixture> {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Uji Checkout",
      slug,
      plan: "basic",
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    })
    .returning();

  const [product] = await db
    .insert(products)
    .values({
      tenantId: tenant.id,
      slug: PRODUCT_SLUG,
      name: "Kursi Uji Checkout",
      category: "Kursi",
      description: "Kursi untuk pengujian checkout.",
      basePrice: PRICE,
      lengthCm: 50,
      widthCm: 50,
      heightCm: 90,
      woodType: "Jati",
      finishingType: "Natural",
      isPublished: true,
      images: [],
    })
    .returning();

  await db.insert(shippingRates).values([
    {
      tenantId: tenant.id,
      regencyId: REGENCY,
      cityName: "Kota Bandung",
      provinceName: "Jawa Barat",
      rateAmount: SPECIFIC_FEE,
    },
    {
      tenantId: tenant.id,
      regencyId: null,
      isDefault: true,
      cityName: "Seluruh Indonesia",
      provinceName: "-",
      rateAmount: DEFAULT_FEE,
    },
  ]);

  const [address] = await db
    .insert(customerAddresses)
    .values({
      tenantId: tenant.id,
      customerPhone: PHONE,
      recipientName: "Budi Uji",
      addressLine: "Jl. Uji Checkout No. 1, RT 01 RW 02",
      streetName: "Jl. Uji Checkout",
      houseNumber: "1",
      rt: "01",
      rw: "02",
      villageName: "Sukasari",
      regencyId: REGENCY,
      regencyName: "Kota Bandung",
      provinceId: "06",
      provinceName: "Jawa Barat",
      cityName: "Kota Bandung",
      postalCode: "40131",
      isDefault: true,
    })
    .returning();

  /*
   * Tenant kedua, hanya untuk menguji bahwa alamatnya tidak bisa dipakai di
   * tenant pertama. Ini yang paling mudah salah: `addressId` datang dari
   * FormData, dan knowing satu UUID cukup untuk menunjuk baris mana pun kalau
   * query-nya hanya menyaring `id`.
   */
  const [otherTenant] = await db
    .insert(tenants)
    .values({
      name: "Uji Checkout Lain",
      slug: `${slug}-lain`,
      plan: "basic",
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    })
    .returning();

  const [otherAddress] = await db
    .insert(customerAddresses)
    .values({
      tenantId: otherTenant.id,
      customerPhone: PHONE,
      recipientName: "Siti Uji",
      addressLine: "Jl. Tenant Lain No. 9",
      streetName: "Jl. Tenant Lain",
      houseNumber: "9",
      villageName: "Coblong",
      regencyId: REGENCY,
      regencyName: "Kota Bandung",
      provinceId: "06",
      provinceName: "Jawa Barat",
      cityName: "Kota Bandung",
      postalCode: "40132",
      isDefault: true,
    })
    .returning();

  return {
    tenantId: tenant.id,
    productId: product.id,
    addressId: address.id,
    otherTenantId: otherTenant.id,
    otherAddressId: otherAddress.id,
  };
}

async function teardown(fixture: Fixture): Promise<void> {
  const found = await db
    .select({ id: orders.id })
    .from(orders)
    .where(inArray(orders.tenantId, [fixture.tenantId, fixture.otherTenantId]));
  if (found.length > 0) {
    await db.delete(orderItems).where(
      inArray(
        orderItems.orderId,
        found.map((row) => row.id),
      ),
    );
    await db.delete(orders).where(
      inArray(
        orders.id,
        found.map((row) => row.id),
      ),
    );
  }
  /*
   * `integration_audit_logs.tenant_id` memakai `onDelete: "set null"`, jadi
   * baris audit TIDAK ikut terhapus bersama tenant. Kalau tidak dihapus di
   * sini, setiap menjalankan skrip ini mencampur sampah uji ke tabel yang
   * dibaca super admin.
   */
  await db
    .delete(integrationAuditLogs)
    .where(inArray(integrationAuditLogs.tenantId, [fixture.tenantId, fixture.otherTenantId]));
  await db.delete(customerAddresses).where(
    inArray(customerAddresses.tenantId, [fixture.tenantId, fixture.otherTenantId]),
  );
  await db.delete(products).where(
    inArray(products.tenantId, [fixture.tenantId, fixture.otherTenantId]),
  );
  await db.delete(shippingRates).where(
    inArray(shippingRates.tenantId, [fixture.tenantId, fixture.otherTenantId]),
  );
  await db
    .delete(tenants)
    .where(inArray(tenants.id, [fixture.tenantId, fixture.otherTenantId]));
}

/* ================= C. Alur sungguhan ================= */

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

async function runBrowserFlow(browser: Browser): Promise<string> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const base = `${BASE}/t/${slug}`;

  // 1. Masuk keranjang dari halaman detail produk.
  await page.goto(`${base}/produk/${PRODUCT_SLUG}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Masukkan keranjang" }).click();
  // ActionForm menulis cookie lalu server action selesai; tunggu header keranjang
  // muncul supaya kita tahu cookie benar-benar tersimpan.
  await page.waitForURL("**/checkout", { timeout: 5000 }).catch(() => undefined);
  await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });

  const body = await page.textContent("body");
  check(
    "keranjang dibaca dari cookie dan subtotal tampil",
    (body?.includes("Kursi Uji Checkout") ?? false) &&
      (body?.includes(rupiah(PRICE)) ?? false),
    "barang & subtotal tampil di halaman checkout",
  );

  // 2. Nomor HP → muat alamat tersimpan.
  await page.fill("#checkout-phone", PHONE);
  await page.getByRole("button", { name: "Lihat alamat saya" }).click();
  await page.waitForSelector('input[name="address"]', { timeout: 15000 });

  const withAddress = await page.textContent("body");
  check(
    "ongkir memakai tarif KHUSUS, bukan cadangan",
    (withAddress?.includes(rupiah(SPECIFIC_FEE)) ?? false) &&
      !(withAddress?.includes(rupiah(DEFAULT_FEE)) ?? false),
    `harus muncul ${rupiah(SPECIFIC_FEE)} (khusus), bukan ${rupiah(DEFAULT_FEE)} (cadangan)`,
  );
  check(
    "total di layar = subtotal + ongkir",
    withAddress?.includes(rupiah(PRICE + SPECIFIC_FEE)) ?? false,
    `harus muncul ${rupiah(PRICE + SPECIFIC_FEE)}`,
  );

  // 3. Bayar.
  await page.fill('input[name="email"]', EMAIL);
  await page.getByRole("button", { name: /^Bayar/ }).click();
  try {
    await page.waitForURL(/midtrans\.com/i, { timeout: 45000 });
  } catch {
    /*
     * Diagnostik, bukan sekadar pesan error. Server Action yang gagal
     * menampilkan pesannya di dalam halaman — tanpa捕捉, timeout-nya cuma
     * bilang "tidak sampai ke Midtrans", yang tidak_identify penyebabnya.
     */
    // Selector-nya `[data-slot="alert"]`, bukan `[role="alert"]`. Next
    // menyisipkan `__next-route-announcer__` yang juga `role="alert"` dan
    // selalu ada — selector yang salah akan membaca elemen kosong dan
    // menyimpulkan tidak ada error.
    const alert = await page
      .locator('[data-slot="alert"]')
      .allTextContents()
      .catch(() => [] as string[]);
    const body = await page.textContent("body");
    const tail = (body ?? "").replace(/\s+/g, " ").slice(-400);
    throw new Error(
      `Tidak sampai ke Midtrans.\n  Alert: ${alert.join(" | ") || "(tidak ada)"}\n` +
        `  URL: ${page.url()}\n  Ekor teks: ${tail}`,
    );
  }
  const finalUrl = page.url();
  check(
    "pembeli diarahkan ke halaman pembayaran Midtrans",
    /midtrans\.com/i.test(finalUrl),
    finalUrl.slice(0, 80),
  );

  /*
   * Keranjang harus kosong setelah pesanan dibuat. Kalau tidak, pembeli
   * menekan sekali lagi dan mendapat dua pesanan untuk barang yang sama.
   */
  const cartCookie = (await context.cookies()).find((c) => c.name === "furni_cart");
  check(
    "keranjang dikosongkan setelah pesanan dibuat",
    !cartCookie || !cartCookie.value,
    cartCookie ? `masih ada: ${cartCookie.value}` : "cookie dihapus",
  );

  await context.close();
  return finalUrl;
}

async function checkDatabase(fixture: Fixture): Promise<string> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.tenantId, fixture.tenantId))
    .limit(1);

  if (!order) throw new Error("pesanan tidak tercatat di database");

  check(
    "total yang ditagih = subtotal + tarif ongkir khusus",
    order.totalAmount === PRICE + SPECIFIC_FEE && order.itemsSubtotal === PRICE,
    `total=${order.totalAmount} subtotal=${order.itemsSubtotal} ongkir=${order.shippingFee}`,
  );
  check(
    "pesanan berlabel source=storefront dan order_id Midtrans berprefiks ord-",
    order.source === "storefront" && order.midtransOrderId?.startsWith("ord-") === true,
    `source=${order.source} midtransOrderId=${order.midtransOrderId}`,
  );
  check(
    "snapToken tersimpan supaya pesanan bisa dilanjutkan dari panel toko",
    Boolean(order.snapToken),
    order.snapToken ? "ada" : "KOSONG (BUG)",
  );
  check(
    "alamat ter-snapshot ke pesanan, bukan hanya ditunjuk",
    order.customerAddress.includes("Jl. Uji Checkout"),
    order.customerAddress.slice(0, 60),
  );

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  check(
    "rincian barang tersimpan dan harganya dari database",
    items.length === 1 && items[0].price === PRICE && items[0].quantity === 1,
    `${items.length} baris, harga=${items[0]?.price}`,
  );

  return order.midtransOrderId as string;
}

/** Notifikasi dengan tanda tangan salah harus ditolak. */
async function checkBadSignature(midtransOrderId: string, total: number): Promise<void> {
  const res = await fetch(`${BASE}/api/webhooks/midtrans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Midtrans-Signature": createHash("sha512")
        .update(`${midtransOrderId}200${total} kunci-palsu`)
        .digest("hex"),
    },
    body: JSON.stringify({
      order_id: midtransOrderId,
      status_code: "200",
      gross_amount: String(total),
    }),
  });
  check(
    "notifikasi dengan tanda tangan palsu ditolak",
    res.status === 403,
    `HTTP ${res.status} (harus 403)`,
  );

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.midtransOrderId, midtransOrderId))
    .limit(1);
  check(
    "pesanan tetap belum lunas setelah tanda tangan palsu",
    order?.paymentStatus !== "fully_paid",
    `paymentStatus=${order?.paymentStatus}`,
  );
}

/** Notifikasi dengan nominal lain harus ditolak walau tanda tangannya benar. */
async function checkAmountMismatch(midtransOrderId: string, realTotal: number): Promise<void> {
  const fakeAmount = 1_000;
  const signature = createHash("sha512")
    .update(
      `${midtransOrderId}200${fakeAmount}.00${process.env.MIDTRANS_SERVER_KEY}`,
    )
    .digest("hex");

  const res = await fetch(`${BASE}/api/webhooks/midtrans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Midtrans-Signature": signature,
    },
    body: JSON.stringify({
      order_id: midtransOrderId,
      status_code: "200",
      gross_amount: `${fakeAmount}.00`,
    }),
  });
  check(
    "notifikasi lunas dengan nominal yang salah ditolak",
    res.status === 400,
    `HTTP ${res.status} (harus 400)`,
  );
  void realTotal;
}

/** Notifikasi lunas dengan tanda tangan benar harus diterima, dan idempoten. */
async function checkSettlement(midtransOrderId: string, total: number): Promise<void> {
  const gross = `${total}.00`;
  const signature = createHash("sha512")
    .update(`${midtransOrderId}200${gross}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");

  const send = () =>
    fetch(`${BASE}/api/webhooks/midtrans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Midtrans-Signature": signature,
      },
      body: JSON.stringify({
        order_id: midtransOrderId,
        status_code: "200",
        gross_amount: gross,
        transaction_id: "uji-transaksi-1",
        transaction_status: "settlement",
        fraud_status: "accept",
      }),
    });

  const first = await send();
  check("notifikasi lunas diterima", first.status === 200, `HTTP ${first.status}`);

  const [afterFirst] = await db
    .select()
    .from(orders)
    .where(eq(orders.midtransOrderId, midtransOrderId))
    .limit(1);
  check(
    "pesanan jadi lunas dan tercatat waktu bayarnya",
    afterFirst?.paymentStatus === "fully_paid" && Boolean(afterFirst?.paidAt),
    `paymentStatus=${afterFirst?.paymentStatus} paidAt=${afterFirst?.paidAt?.toISOString()}`,
  );

  // Midtrans mengirim notifikasi berkali-kali. Kirim ulang, harusnya diam-diam.
  const second = await send();
  const body = (await second.json()) as { already?: boolean };
  check(
    "notifikasi kedua tidak mengubah apa pun (idempoten)",
    second.status === 200 && body.already === true,
    `HTTP ${second.status} already=${String(body.already)}`,
  );
}

/**
 * Alamat milik tenant lain harus ditolak.
 *
 * Dijalankan lewat server action yang sama supaya yang diuji adalah jalur
 * produksi, bukan 쿼eri yang ditiru ulang di skrip.
 */
async function checkCrossTenantAddress(browser: Browser, fixture: Fixture): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const base = `${BASE}/t/${slug}`;

  // Keranjang diisi satu barang, supaya yang diuji benar-benar `addressId`.
  await page.goto(`${base}/produk/${PRODUCT_SLUG}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Masukkan keranjang" }).click();
  await page.waitForTimeout(1000);
  await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
  await page.fill("#checkout-phone", PHONE);
  await page.getByRole("button", { name: "Lihat alamat saya" }).click();
  await page.waitForSelector('input[name="address"]', { timeout: 15000 });


  await page.fill('input[name="email"]', EMAIL);

  /*
   * Alamat milik tenant lain sengaja dipaksakan: nilai `addressId` yang
   * dirender tidak memuat id itu, jadi tidak ada cara lain untuk menyentilnya
   * tanpa memanggil action secara langsung.
   *
   * Yang diubah adalah NILAI input yang sudah ada di dalam form pembayaran,
   * bukan menyisipkan input baru. Versi pertama menyisipkan `input` ke dalam
   * kartu alamat — yang berada di luar `<form>` pembayaran — jadi field-nya
   * tidak pernah terkirim sama sekali, dan pengujian ini "lolos" tanpa
   * menguji apa pun. Dan kalau memang ada dua input bernama sama,
   * `formData.get()` mengambil yang PERTAMA, jadi menyisipkan bukan cara yang
   * benar untuk menguji apa pun juga.
   *
   * PENTING: penyisipan dilakukan SESUDAH email diisi. Mengisi email memicu
   * re-render, dan re-render itu menulis ulang nilai `addressId` dari state
   * React — jadi penyisipan yang dilakukan lebih awal hilang begitu email
   * diisi, dan yang terkirim kembali adalah alamat yang benar.
   */
  const patched = await page.evaluate((foreignId) => {
    const field = document.querySelector<HTMLInputElement>('form input[name="addressId"]');
    if (!field) throw new Error("input addressId di form pembayaran tidak ditemukan");

    /*
     * Input-nya controlled React, jadi `field.value = x` saja TIDAK cukup:
     * React menyimpan nilainya sendiri di state, dan pada render berikutnya
     * ia menimpa kembali nilai DOM dengan nilai state — sehingga yang
     * terkirim adalah alamat yang benar dan pengujian ini lolos tanpa
     * menguji apa pun.
     *
     * Setter NATIF dipakai untuk menulis nilai, lalu event `input`
     * disiarkan supaya `onChange` React ikut jalan. Ini satu-satunya cara
     * mengubah controlled input dari luar React.
     */
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(field, foreignId);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return field.value;
  }, fixture.otherAddressId);

  await page.waitForTimeout(300);
  const stillPatched = await page.inputValue('form input[name="addressId"]');
  check(
    "nilai addressId benar-benar disisipkan (controlled input)",
    stillPatched === fixture.otherAddressId,
    `nilai di form: ${stillPatched.slice(0, 8)}… (sudah disisipkan: ${String(stillPatched === fixture.otherAddressId)})`,
  );
  void patched;
  await page.getByRole("button", { name: /^Bayar/ }).click();
  await page.waitForTimeout(4000);

  const stillHere = page.url().includes("/checkout");
  check(
    "alamat milik tenant lain tidak bisa dipakai untuk membayar",
    stillHere,
    stillHere ? "tetap di checkout (ditolak)" : `melar ke ${page.url()}`,
  );

  /*
   * Pesan yang muncul ikut diperiksa. "Tetap di halaman" saja belum cukup:
   * halaman yang sama juga bisa muncul karena tombolnya tidak functioning,
   * dan itu tetap bug. Yang harus terlihat adalah alasan penolakannya.
   */
  const alerts = await page.locator("[data-slot=alert]").allTextContents();
  check(
    "penolakan disertai pesan yang bisa dibaca pembeli",
    alerts.some((text) => text.includes("Alamat pengiriman tidak ditemukan")),
    alerts.join(" | ") || "(tidak ada alert)",
  );

  const created = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.customerAddressId, fixture.otherAddressId));
  check(
    "tidak ada pesanan yang memakai alamat tenant lain",
    created.length === 0,
    `${created.length} baris (harus 0)`,
  );

  await context.close();
}

/**
 * Keranjang milik satu pembeli TIDAK boleh bocor ke pembeli lain.
 *
 * Regresi untuk bug nyata: `readCart()` pernah mengembalikan objek modul
 * `EMPTY_CART` yang sama untuk semua permintaan tanpa cookie, dan
 * `addToCartLine()` memutasi objek itu. Akibatnya satu proses Next
 * mengumpulkan keranjang SEMUANYA pengunjung tanpa cookie ke dalam satu objek
 * — pengunjung berikutnya menerima barang milik orang lain, termasuk dari toko
 * lain.
 *
 * Yang diuji: dua konteks peramban terpisah (keranjang terpisah), dan
 * konteks kedua harus melihat keranjang kosong meski yang pertama sudah
 * mengisi.
 */
async function checkNoCartLeak(browser: Browser, slugForUrl: string): Promise<void> {
  const first = await browser.newContext();
  const firstPage = await first.newPage();
  await firstPage.goto(`${BASE}/t/${slugForUrl}/produk/${PRODUCT_SLUG}`, {
    waitUntil: "networkidle",
  });
  await firstPage.getByRole("button", { name: "Masukkan keranjang" }).click();
  await firstPage.waitForTimeout(1200);
  await first.close();

  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto(`${BASE}/t/${slugForUrl}/checkout`, { waitUntil: "networkidle" });
  const text = await secondPage.textContent("body");
  const leaked =
    (text?.includes("Kursi Uji Checkout") ?? false) ||
    (text?.includes(PRODUCT_SLUG) ?? false);
  check(
    "keranjang tidak bocor ke pembeli lain yang tidak punya cookie",
    !leaked,
    leaked
      ? "pembeli kedua melihat keranjang milik pembeli pertama (BUG)"
      : "pembeli kedua melihat keranjang kosong",
  );
  await second.close();
}

async function main() {
  await requireServer();
  testLookupRule();
  testSourceGuards();

  if (!process.env.MIDTRANS_SERVER_KEY) {
    console.error("MIDTRANS_SERVER_KEY kosong — isi .env lebih dulu.");
    process.exit(2);
  }

  const fixture = await setup();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();

    // 1. Keranjang tidak boleh bocor antar pembeli.
    await checkNoCartLeak(browser, slug);

    // 2. Alamat tenant lain DITOLAK lebih dulu, jadi tidak ada tagihan sia-sia
    //    yang dibuat untuk pengujian ini.
    await checkCrossTenantAddress(browser, fixture);

    // 3. Alur pembayaran sungguhan.
    await runBrowserFlow(browser);
    const midtransOrderId = await checkDatabase(fixture);
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, midtransOrderId))
      .limit(1);

    await checkBadSignature(midtransOrderId, order.totalAmount);
    await checkAmountMismatch(midtransOrderId, order.totalAmount);
    await checkSettlement(midtransOrderId, order.totalAmount);
  } finally {
    await browser?.close();
    await teardown(fixture);
  }

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan checkout lulus."
      : `\n${failures} pemeriksaan GAGAL.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("Pengujian checkout gagal:", error);
  process.exit(1);
});
