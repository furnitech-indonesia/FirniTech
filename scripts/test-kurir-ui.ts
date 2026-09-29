/**
 * Uji visual halaman kurir (Sprint 6, bukti penerimaan).
 *
 * Berkas ini ada karena `scripts/test-kurir.ts` tidak bisa melihat apa pun
 * yang benar-benar terjadi di layar. Yang diuji di sini justru hal-hal itu:
 *
 *   - Kolom tanda tangan benar-benar menerima gerakan jari dan menghasilkan
 *     gambar, bukan sekadar elemen `<canvas>` yang ada di DOM. Membaca source
 *     code membuktikan `onPointerDown` terpasang; tidak membuktikan satu
 *     garis pun tergambar, dan `toDataURL` yang mengembalikan string kosong
 *     lolos dari pemeriksaan source mana pun.
 *   - Tinggi target sentuh >= 44px di 375px, karena kurir memakai HP dengan
 *     satu tangan sambil memegang paket.
 *   - Tidak ada geser horizontal, dan tidak ada satu pun nominal rupiah yang
 *     bocor ke layar yang dilihat kurir.
 *
 * Fikstur dibuat sendiri lalu dibersihkan di `finally`. Jalankan:
 *   npm run test:kurir-ui   (server harus sudah jalan)
 */
import "dotenv/config";

import { chromium, type Browser, type Page } from "playwright";
import { eq } from "drizzle-orm";

import { db, sqlClient as sql } from "../src/db/client";
import {
  deliveryProofs,
  orders,
  saasInvoices,
  tenants,
  users,
} from "../src/db/schema";
import { createSupabaseAdmin } from "../src/lib/supabase/admin";

const PASSWORD = "KurirUjiVisual-2026!";
const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const SUFFIX = Date.now();

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

type Made = { userId: string; email: string };

/**
 * Akun kurir yang bisa login.
 *
 * Baris `users` disisipkan manual dengan id dari `auth.users`, persis seperti
 * `provisionOwner`: trigger `handle_new_user` selalu menyisipkan
 * `tenant_id` NULL, jadi tidak bisa dipakai untuk akun yang sudah terikat
 * toko. Placeholder dibuang dulu karena `user_email_idx` unik pada
 * lower(email).
 */
async function makeCourier(tenantId: string, label: string): Promise<Made> {
  return makeUser(tenantId, label, "kurir");
}

/** Akun yang bisa login, dengan role yang diminta. */
async function makeUser(
  tenantId: string,
  label: string,
  role: "kurir" | "owner",
): Promise<Made> {
  const email = `kurir.${label}.${SUFFIX}@uji.test`;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Kurir ${label}` },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (!data?.user) throw new Error(`gagal membuat auth user ${email}`);

  await db.delete(users).where(eq(users.email, email));
  await db.insert(users).values({
    id: data.user.id,
    tenantId,
    email,
    fullName: `${role === "owner" ? "Owner" : "Kurir"} ${label}`,
    phone: `62812000${String(SUFFIX).slice(-6)}`,
    role,
  });
  return { userId: data.user.id, email };
}

/** Tanggal `YYYY-MM-DD` relatif terhadap hari ini, untuk kolom `date`. */
function hariIShift(hari: number): string {
  return new Date(Date.now() + 86_400_000 * hari)
    .toISOString()
    .slice(0, 10);
}

/** Tunggu `<html data-sw-ready>`: tanpa itu klik terjadi sebelum hydrasi. */
async function waitForHydration(page: Page) {
  await page.waitForSelector("html[data-sw-ready]", { timeout: 15_000 });
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /masuk/i }).last().click();
  try {
    await page.waitForURL(/\/kurir|\/dashboard/, { timeout: 20_000 });
  } catch {
    // Login gagal tanpa penjelasan yang bisa dibaca = tidak berguna untuk
    // siapa pun yang menjalankan skrip ini. Cetak pesan di layar, karena
    // "waitForURL timeout" sendiri tidak mengatakan apakah emailnya salah,
    // passwordnya salah, atau trigger signup menolak.
    const alert = await page.locator('[role="alert"]').allInnerTexts();
    console.error("Login gagal. Pesan di layar:", alert.join(" | ") || "(tidak ada)");
    await page.screenshot({ path: "screenshots/kurir-login-gagal.png", fullPage: true });
    throw new Error("login gagal");
  }
}

async function main() {
  const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    console.error(
      "Server belum jalan di " +
        BASE +
        ". Tanpa pemeriksaan ini halaman fallback ter-render dan hasilnya\n" +
        "terbaca sebagai '0 langkah terlihat' — itu terbaca sebagai bug wizard yang tidak pernah diuji.",
    );
    process.exit(1);
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: `Uji Kurir UI ${SUFFIX}`,
      slug: `uji-kurir-ui-${SUFFIX}`,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error("gagal membuat tenant");

  const courier = await makeCourier(tenant.id, "ui");
  // Owner toko yang sama, untuk memeriksa sisi back-office. Tanpa akun ini,
  // "bukti bisa dilihat pengrajin" hanya akan dibuktikan sebagai klaim di
  // dalam komentar kode.
  const owner = await makeUser(tenant.id, "ui-owner", "owner");

  /*
   * Dua invoice untuk tenant ini: satu lunas, satu masih menunggu.
   *
   * Tanpa keduanya, halaman tagihan merender keadaan kosong, dan pemeriksaan
   * "riwayat punya padanan kartu di mobile" punya dua jalan keluar yang sama
   * buruk: ia gagal terus pada fikstur yang tidak pernah berubah, atau ia
   * ditulis longgar sampai selalu lulus tanpa pernah melihat tabelnya.
   * Yang diuji justru jalur yang paling mungkin salah -- riwayat yang nyata.
   */
  await db.insert(saasInvoices).values([
    {
      tenantId: tenant.id,
      plan: "pro",
      period: "monthly",
      amount: 500_000,
      midtransAmount: 500_000,
      status: "paid",
      paidAt: new Date(Date.now() - 86_400_000 * 20),
      periodStart: hariIShift(-40),
      periodEnd: hariIShift(-10),
    },
    {
      tenantId: tenant.id,
      plan: "pro",
      period: "monthly",
      amount: 500_000,
      midtransAmount: 500_000,
      status: "pending",
      isRenewal: true,
      periodStart: hariIShift(10),
      periodEnd: hariIShift(40),
    },
  ]);

  const [order] = await db
    .insert(orders)
    .values({
      tenantId: tenant.id,
      orderCode: `KURUI-${SUFFIX}`,
      customerName: "Pembeli Uji Visual",
      customerPhone: "6281234567890",
      customerAddress: "Jl. Cakrawaru No. 77, RT 04 RW 09",
      destinationCity: "Kabupaten Bandung",
      itemsSubtotal: 2_750_000,
      shippingFee: 35_000,
      totalAmount: 2_785_000,
      netTenantAmount: 2_780_560,
      orderStatus: "ready_to_ship",
      assignedCourierId: courier.userId,
    })
    .returning({ id: orders.id });
  if (!order) throw new Error("gagal membuat pesanan");

  const browser: Browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    await login(page, courier.email);
    await waitForHydration(page);
    check(
      "kurir mendarat di /kurir, bukan /dashboard",
      page.url().includes("/kurir"),
      page.url(),
    );

    // 1. Kiriman yang ditugaskan terlihat.
    const card = page.locator("li", { hasText: `KURUI-${SUFFIX}` });
    check("kiriman yang ditugaskan terlihat", (await card.count()) === 1, `${await card.count()} kartu`);

    // 2. TIDAK ada nominal rupiah di layar kurir.
    //    Dicari sebagai POLA, bukan sebagai angka: `net_tenant_amount` di
    //    fikstur sengaja dibuat berbeda dari total, jadi kalau salah satu
    //    tampil, nilai yang spesifik itu yang terbaca — bukan kebetulan cocok.
    const bodyText = (await page.locator("main").innerText()).replace(/[\u00a0 ]/g, "");
    const rupiah = bodyText.match(/Rp[\d.]+/g) ?? [];
    check(
      "TIDAK ada nominal rupiah di layar kurir",
      rupiah.length === 0,
      rupiah.length ? rupiah.join(", ") : "tidak ada",
    );
    check(
      "margin toko (2.780.560) tidak bocor",
      !bodyText.includes("2780560"),
      "tidak ditemukan",
    );

    // 3. Nomor HP dipotong empat digit.
    check(
      "nomor HP hanya empat digit terakhir",
      bodyText.includes("…7890") && !bodyText.includes("6281234567890"),
      bodyText.includes("…7890") ? "…7890" : "tidak ditemukan",
    );

    // 4. Tidak ada geser horizontal.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check("tidak ada geser horizontal di 375px", overflow <= 0, `overflow ${overflow}px`);

    // 5. Target sentuh >= 44px.
    const small = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("button, a, input, [role=button]"),
      );
      return nodes
        .filter((n) => {
          const r = n.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
        })
        .map((n) => `${n.tagName}:${(n.textContent ?? "").trim().slice(0, 20)}=${Math.round(n.getBoundingClientRect().height)}px`);
    });
    check("semua target sentuh >= 44px", small.length === 0, small.join(", ") || "semua_ok");

    // 6. Buka panel bukti.
    await card.getByRole("button", { name: /Catat barang diterima/i }).click();
    const pad = page.locator('canvas[aria-label="Area menggambar tanda tangan"]');
    check("panel bukti terbuka dengan kolom tanda tangan", (await pad.count()) === 1, `${await pad.count()} canvas`);

    // 7. Tanda tangan BENAR-BENAR menggambar.
    //    Ini bagian yang paling tidak bisa dibuktikan dari source code: canvas
    //    ada, handler-nya terpasang, dan hasilnya tetap kosong kalau
    //    `touch-action` atau koordinat pointer-nya salah.
    const box = await pad.boundingBox();
    if (!box) throw new Error("canvas tidak punya bounding box");
    const before = await pad.screenshot();
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      await page.mouse.move(box.x + 30 + i * 12, box.y + box.height / 2 + (i % 2 === 0 ? -14 : 14));
    }
    await page.mouse.up();
    const after = await pad.screenshot();
    check(
      "canvas tanda tangan benar-benar menghasilkan gambar",
      !before.equals(after),
      before.equals(after) ? "tidak ada yang tergambar" : `${before.length} -> ${after.length} byte`,
    );

    // 8. Hidden input terisi data URL PNG yang sah.
    const signature = await page.locator('input[name="signature"]').inputValue();
    check(
      "input tanda tangan berisi data URL PNG",
      signature.startsWith("data:image/png;base64,") && signature.length > 500,
      `${signature.slice(0, 32)}… (${signature.length} karakter)`,
    );

    // 9. Tombol hapus membersihkan.
    await page.getByRole("button", { name: "Hapus" }).click();
    const cleared = await page.locator('input[name="signature"]').inputValue();
    check("tombol Hapus membersihkan tanda tangan", cleared === "", `"${cleared.slice(0, 20)}"`);

    // 10. Unggah foto barang (fixture PNG kecil).
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await card.locator('input[type="file"][name="photo"]').setInputFiles({
      name: "bukti.png",
      mimeType: "image/png",
      buffer: png,
    });
    await card.locator('input[name="signerName"]').fill("Bu Tuti (tetangga)");
    // Tanda tangan kedua supaya field tidak kosong.
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + box.height / 2 - 10);
    await page.mouse.move(box.x + 200, box.y + box.height / 2 + 8);
    await page.mouse.up();

    await card.getByRole("button", { name: /Kirim bukti/i }).click();
    await page.waitForTimeout(2500);

    // 11. Bukti benar-benar tersimpan di database, dengan order_id yang benar.
    const [saved] = await db
      .select()
      .from(deliveryProofs)
      .where(eq(deliveryProofs.orderId, order.id));
    check(
      "bukti tersimpan di database dengan order yang benar",
      Boolean(saved),
      saved ? `signer=${saved.signerName}, courier=${saved.courierId === courier.userId}` : "tidak ada baris",
    );
    check(
      "nama yang menerima BUKAN diisi otomatis dengan nama pembeli",
      saved?.signerName === "Bu Tuti (tetangga)",
      saved?.signerName ?? "-",
    );
    check(
      "kedua path bukti menunjuk ke bucket privat, bukan URL",
      Boolean(saved?.photoPath) &&
        saved.photoPath.startsWith(`${tenant.id}/`) &&
        !saved.photoPath.startsWith("http"),
      saved?.photoPath ?? "-",
    );

    // 12. Status pesanan bergerak ke completed.
    const [afterSubmit] = await db
      .select({ orderStatus: orders.orderStatus })
      .from(orders)
      .where(eq(orders.id, order.id));
    check(
      "status pesanan menjadi completed",
      afterSubmit?.orderStatus === "completed",
      afterSubmit?.orderStatus ?? "-",
    );

    // 13. Bukti kedua dari UI yang sama harus ditolak, dan pesannya jujur.
    //     Diuji lewat HTTP karena formnya sudah tertutup setelah sukses.
    const reject = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/delivery_proofs`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenant_id: tenant.id }),
      },
    );
    check("anon tetap tidak bisa menulis bukti", reject.status >= 400, `status ${reject.status}`);

    /*
     * SISI BACK-OFFICE.
     *
     * Bukti yang tersimpan tapi tidak pernah bisa dilihat orang tidak
     * berguna: pengrajin butuh memeriksanya kalau ada yang menyangkut
     * pembayaran. Dan yang diuji di sini bukan "tag img ada" — `alt` dan
     * atribut src bisa saja benar sementara berkasnya 403, karena
     * signed URL-nya kedaluwarsa atau bucketnya salah.
     */
    const ownerContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const ownerPage = await ownerContext.newPage();
    const ownerFailed: string[] = [];
    ownerPage.on("response", (res) => {
      if (res.status() >= 400) ownerFailed.push(`${res.status()} ${res.url()}`);
    });

    await login(ownerPage, owner.email);
    await ownerPage.goto(`${BASE}/dashboard/pesanan/${order.id}`, {
      waitUntil: "networkidle",
    });
    await ownerPage.waitForTimeout(1200);
    const ownerText = await ownerPage.locator("main").innerText();

    check(
      "back-office menampilkan bagian bukti penerimaan",
      /Bukti barang diterima/.test(ownerText),
      ownerText.split("\n").find((l) => /Bukti/.test(l)) ?? "-",
    );
    check(
      "back-office menyebut nama yang benar-benar menerima",
      ownerText.includes("Bu Tuti (tetangga)"),
      "Bu Tuti (tetangga)",
    );
    check(
      "back-office menyebut bahwa pencairan sudah dipicu",
      /pencairan untuk pesanan ini sudah dipicu/i.test(ownerText),
      "pesan pencairan",
    );
    check(
      "back-office TIDAK menawarkan tombol ubah atau hapus bukti",
      !/hapus bukti|ubah bukti|hapus tanda tangan/i.test(ownerText),
      "tidak ada",
    );

    const proofImages = ownerPage.locator(
      'img[alt*="Foto barang diterima"], img[alt*="Tanda tangan"]',
    );
    const loaded = await proofImages.evaluateAll((nodes) =>
      nodes.map((n) => ({
        alt: (n as HTMLImageElement).alt,
        w: (n as HTMLImageElement).naturalWidth,
      })),
    );
    check(
      "foto dan tanda tangan benar-benar TERMUAT (naturalWidth > 0)",
      loaded.length === 2 && loaded.every((i) => i.w > 0),
      loaded.map((i) => `${i.alt}=${i.w}px`).join(" | ") || "tidak ada img",
    );
    check(
      "signed URL bukti tidak menghasilkan 403",
      ownerFailed.every((r) => !/storage|delivery-proofs/.test(r)),
      ownerFailed.slice(0, 3).join(" | ") || "bersih",
    );
    await ownerPage.screenshot({ path: "screenshots/bukti-penerimaan-375.png", fullPage: true });

    /*
     * Halaman tagihan (Sprint 6).
     *
     * Yang diperiksa di sini hanya apa yang HANYA bisa dilihat lewat render:
     * scroll horizontal di 375px, target sentuh, dan tagihan yang muncul
     * sebagai kartu, bukan tabel. Tabel riwayat punya empat kolom, dan di
     * 375px kolom yang keluar dari layar justru NOMINALNYA.
     */
    await ownerPage.goto(`${BASE}/dashboard/tagihan`, { waitUntil: "networkidle" });
    await ownerPage.waitForTimeout(800);
    const tagihan = await ownerPage.evaluate(() => {
      const main = document.querySelector("main");
      const overflow =
        document.documentElement.scrollWidth - window.innerWidth;
      const terlaluPendek = [...main!.querySelectorAll("a, button")]
        .map((el) => ({
          teks: (el.textContent ?? "").trim().slice(0, 40),
          h: Math.round(el.getBoundingClientRect().height),
        }))
        .filter((x) => x.h > 0 && x.h < 44);

      /*
       * "Terlihat" berarti MELEBAR DI LAYAR, bukan sekadar ada di DOM.
       *
       * Versi pertama pemeriksaan ini memakai `querySelector("ul li")` dan
       * selalu lulus, termasuk saat kelas `md:hidden` dihapus -- karena
       * `querySelector` tidak tahu apa-apa soal `display`. Itu tes yang
       * tidak menguji apa pun, dan inesperada: ia terlihat bukti bahwa
       * riwayat punya padanan kartu padahal yang dicek hanya keberadaan
       * elemen.
       *
       * Dihitung inline, bukan lewat fungsi pembantu. Kode di dalam
       * `page.evaluate` diserialisasi jadi teks lalu dijalankan di browser,
       * dan transformasi `tsx` menyisipkan pemanggil `__name` pada setiap
       * fungsi bernama -- yang tidak ada di browser, jadi hasilnya
       * `__name is not defined` sebelum satu pun sempat diuji.
       */
      const kartu = main!.querySelector("ul li.rounded-xl");
      const tabel = main!.querySelector("table");
      const kotakKartu = kartu ? kartu.getBoundingClientRect() : null;
      const kotakTabel = tabel ? tabel.getBoundingClientRect() : null;

      return {
        overflow,
        terlaluPendek,
        kartuTerlihat: Boolean(
          kotakKartu && kotakKartu.width > 0 && kotakKartu.height > 0,
        ),
        kartuJumlah: main!.querySelectorAll("ul li.rounded-xl").length,
        tabelTerlihat: Boolean(
          kotakTabel && kotakTabel.width > 0 && kotakTabel.height > 0,
        ),
        teks: main!.innerText.replace(/\s+/g, " ").trim(),
      };
    });

    check(
      "halaman tagihan memuat judul yang benar",
      /Tagihan/.test(tagihan.teks),
      tagihan.teks.slice(0, 80),
    );
    check(
      "halaman tagihan tidak scroll horizontal di 375px",
      tagihan.overflow <= 0,
      `luar ${tagihan.overflow}px`,
    );
    check(
      "semua target sentuh halaman tagihan minimal 44px",
      tagihan.terlaluPendek.length === 0,
      tagihan.terlaluPendek.map((x) => `${x.teks}=${x.h}px`).join(" | ") || "semua ok",
    );
    check(
      "di 375px yang tampil KARTU riwayat, bukan tabel",
      tagihan.kartuTerlihat && tagihan.kartuJumlah === 2 && !tagihan.tabelTerlihat,
      tagihan.tabelTerlihat
        ? "tabel masih tampil — 4 kolom tidak muat di 375px"
        : `${tagihan.kartuJumlah} kartu, tabel ${
            tagihan.tabelTerlihat ? "tampil" : "tersembunyi"
          }`,
    );
    await ownerPage.screenshot({ path: "screenshots/tagihan-375.png", fullPage: true });

    /*
     * Arah yang sama, di lebar desktop.
     *
     * Tanpa ini, kelas `md:hidden` pada daftar kartu bisa dihapus tanpa
     * satu pun pemeriksaan gagal -- persis yang terjadi saat pemeriksaan ini
     * pertama ditulis. Dua tampilan sekaligus bukan kerusakan yang terlihat
     * dari kode, tapi pengrajin di laptop melihat riwayat tagihannya dua
     * kali.
     */
    await ownerPage.setViewportSize({ width: 1024, height: 900 });
    await ownerPage.waitForTimeout(400);
    const desktop = await ownerPage.evaluate(() => {
      const main = document.querySelector("main");
      const kartu = main!.querySelector("ul li.rounded-xl");
      const tabel = main!.querySelector("table");
      const kotakKartu = kartu ? kartu.getBoundingClientRect() : null;
      const kotakTabel = tabel ? tabel.getBoundingClientRect() : null;
      return {
        kartuTerlihat: Boolean(
          kotakKartu && kotakKartu.width > 0 && kotakKartu.height > 0,
        ),
        tabelTerlihat: Boolean(
          kotakTabel && kotakTabel.width > 0 && kotakTabel.height > 0,
        ),
      };
    });
    check(
      "di 1024px yang tampil TABEL riwayat, bukan kartu",
      desktop.tabelTerlihat && !desktop.kartuTerlihat,
      `tabel ${desktop.tabelTerlihat ? "tampil" : "tersembunyi"}, kartu ${
        desktop.kartuTerlihat ? "tampil" : "tersembunyi"
      }`,
    );
    await ownerPage.setViewportSize({ width: 375, height: 812 });

    await ownerContext.close();

    check("tidak ada error konsol", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | ") || "bersih");
    check(
      "tidak ada aset 404",
      failedRequests.length === 0,
      failedRequests.slice(0, 3).join(" | ") || "bersih",
    );

    await page.screenshot({ path: `screenshots/kurir-375.png`, fullPage: true });
    await context.close();
  } finally {
    await browser.close();
    await cleanup(tenant.id, [courier.userId, owner.userId]);
  }
}

async function cleanup(tenantId: string, userIds: string[]) {
  // Audit log harus dihapus eksplisit: `integration_audit_logs.tenant_id`
  // memakai `onDelete: "set null"`, jadi baris audit tidak ikut terhapus
  // bersama tenant dan setiap menjalankan skrip ini mencampur sampah test ke
  // tabel yang dibaca super admin.
  await sql`delete from integration_audit_logs where tenant_id = ${tenantId}`;
  await db.delete(orders).where(eq(orders.tenantId, tenantId));
  await db.delete(users).where(eq(users.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  for (const id of userIds) {
    await createSupabaseAdmin()
      .auth.admin.deleteUser(id)
      .catch(() => undefined);
  }
  await sql.end();
}

main()
  .then(() => {
    const total = failures === 0 ? "semua" : `${failures} gagal`;
    console.log(`\n${total} pemeriksaan halaman kurir selesai.\n`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error("Uji halaman kurir gagal:", err);
    process.exit(1);
  });
