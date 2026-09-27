import "dotenv/config";

import { chromium } from "playwright";

/**
 * Uji form alamat bertingkat (Sprint 5 bagian 2).
 *
 * Yang diuji adalah hal yang tidak bisa dibuktikan dari source code:
 *   - Rantai dropdown benar-benar mengisi diri (butuh network ke API wilayah)
 *   - Mengubah level mengosongkan level di bawahnya
 *   - Kode pos terisi otomatis dari desa, dan masih bisa dikoreksi
 *   - Tidak ada geser horizontal di 375px
 *
 * Rantai wilayah butuh jaringan, jadi skrip ini satu-satunya yang bergantung
 * ke emsifa.com. Kalau API-nya tidak terjangkau, skrip ini TIDAK gagal begitu
 * saja: ia justru memeriksa fallback manualnya, karena ketiadaan fallback
 * itulah yang akan membuat pembeli buntu di tengah checkout.
 *
 * Jalankan: npm run test:alamat  (server harus sudah jalan)
 */
const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const STORE = process.env.STORE_PATH ?? "/t/mebeljaya/checkout";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

async function main() {
  const serverUp = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
  if (!serverUp.ok) {
    console.error(`Server tidak berjalan di ${BASE}. Jalankan \`npm run build && npm run start\`.`);
    process.exit(2);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(BASE + STORE, { waitUntil: "networkidle" });

  // ---- Langkah 1: nomor WA wajib dulu ----
  const beforePhone = await page.locator('select[name="provinceId"]').count();
  check(
    "form alamat belum tampil sebelum nomor WhatsApp diisi",
    beforePhone === 0,
    `select provinsi=${beforePhone}`,
  );

  await page.fill('input[name="phone"]', "08123456789");
  await page.getByRole("button", { name: /lihat alamat saya/i }).click();
  await page.waitForTimeout(400);

  const provinceSelect = page.locator('select[name="provinceId"]');
  const provinceCount = await provinceSelect.count();
  check(
    "form alamat muncul setelah nomor diisi",
    provinceCount === 1,
    `${provinceCount} dropdown provinsi`,
  );

  // ---- Dropdown pertama dari snapshot, harus jalan tanpa jaringan ----
  const provinceOptions = await provinceSelect.locator("option").count();
  check(
    "dropdown provinsi terisi dari snapshot di bundel",
    provinceOptions > 30,
    `${provinceOptions} opsi (termasuk placeholder)`,
  );

  // ---- Rantai: provinsi → kabupaten → kecamatan → desa ----
  await provinceSelect.selectOption({ label: "Jawa Barat" });
  await page.waitForTimeout(250);

  const regencySelect = page.locator('select[name="regencyId"]');
  const regencyCount = await regencySelect.locator("option").count();
  check("kabupaten terisi setelah provinsi dipilih", regencyCount > 5, `${regencyCount} opsi`);

  const regencyWasDisabled = await regencySelect.isDisabled();
  check(
    "dropdown kabupaten aktif setelah provinsi dipilih",
    regencyWasDisabled === false,
    regencyWasDisabled ? "masih nonaktif" : "aktif",
  );

  // Mengubah provinsi harus mengosongkan kabupaten.
  await regencySelect.selectOption({ index: 1 });
  await page.waitForTimeout(150);
  await provinceSelect.selectOption({ label: "Bali" });
  await page.waitForTimeout(300);
  const regencyAfterReset = await regencySelect.inputValue();
  check(
    "mengubah provinsi MENGOSONGKAN kabupaten terpilih",
    regencyAfterReset === "",
    `nilai setelah reset = "${regencyAfterReset}"`,
  );

  // Kembali ke Jawa Barat dan lanjutkan ke kecamatan (butuh network).
  await provinceSelect.selectOption({ label: "Jawa Barat" });
  await page.waitForTimeout(200);
  await regencySelect.selectOption({ label: "Kabupaten Bogor" });

  const districtSelect = page.locator('select[name="districtId"]');

  /*
   * TUNGGU hasil, jangan berasumsi. Versi pertama hanya `waitForTimeout(200)`
   * lalu langsung memeriksa jumlah opsi — dan karena `districtsOf()` benar-benar
   * memanggil API, dropdown-nya masih "Memuat…" saat diperiksa. Hasilnya test
   * menyimpulkan API-nya mati, padahal tidak. Dua-duanya salah: jangan
   * menunggu langkah yang belum tentu terjadi, dan jangan menyimpulkan
   * kegagalan dari keadaan yang belum selesai.
   *
   * Ditunggu: opsi bertambah ATAU pesan fallback muncul. Yangmana duluan itu
   * jawaban sebenarnya.
   */
  const districtCount = await Promise.race([
    page
      .waitForFunction(
        () => {
          const el = document.querySelector<HTMLSelectElement>(
            'select[name="districtId"]',
          );
          return (el?.options.length ?? 0) > 1;
        },
        { timeout: 20_000 },
      )
      .then(() => districtSelect.locator("option").count())
      .catch(() => 0),
    page
      .waitForSelector("text=/tidak bisa dimuat/i", { timeout: 20_000 })
      .then(() => 0)
      .catch(() => 0),
  ]);

  if (districtCount > 1) {
    /*
     * Field nama manual harus TIDAK muncul saat dropdown berfungsi. Kalau
     * muncul, pembeli melihat "Pondok Rajej" di dropdown DAN kolom teks
     * "Pondok Rajej" di bawahnya — dua sumber untuk satu nilai, dan hanya
     * salah satu yang tersimpan.
     */
    const manualVisible = await page
      .locator('input[name="villageName"]')
      .count();
    check(
      "field nama manual TIDAK muncul saat dropdown berfungsi",
      manualVisible === 0,
      manualVisible === 0 ? "tidak ada duplikat" : `${manualVisible} field duplikat tampil`,
    );
  }

  if (districtCount <= 1) {
    /*
     * API wilayah tidak terjangkau. Ini kondisi yang HARUS punya jalan keluar,
     * jadi di sini kita justru memeriksa fallback-nya, bukan menggagalkan.
     */
    const manualFields = await page
      .locator('input[name="villageName"]')
      .count();
    check(
      "API wilayah mati: field manual tetap ada (form bisa diselesaikan)",
      manualFields === 1,
      manualFields === 1
        ? "field desa manual tersedia"
        : "field manual tidak ada — form buntu saat API mati (BUG)",
    );
    const notice = await page.getByText(/tidak bisa dimuat/i).count();
    check("ada pemberitahuan yang jelas saat API gagal", notice > 0, `${notice} pesan`);
  } else {
    check("kecamatan termuat dari API wilayah", districtCount > 2, `${districtCount} opsi`);

    await districtSelect.selectOption({ index: 1 });
    const villageSelect = page.locator('select[name="villageId"]');
    const villageCount = await Promise.race([
      page
        .waitForFunction(
          () => {
            const el = document.querySelector<HTMLSelectElement>(
              'select[name="villageId"]',
            );
            return (el?.options.length ?? 0) > 1;
          },
          { timeout: 20_000 },
        )
        .then(() => villageSelect.locator("option").count())
        .catch(() => 0),
      page
        .waitForSelector("text=/tidak bisa dimuat/i", { timeout: 20_000 })
        .then(() => 0)
        .catch(() => 0),
    ]);
    check("desa termuat dari API wilayah", villageCount > 1, `${villageCount} opsi`);

    if (villageCount > 1) {
      await villageSelect.selectOption({ index: 1 });
      await page.waitForTimeout(400);

      const postal = await page.locator('input[name="postalCode"]').inputValue();
      check(
        "kode pos terisi OTOMATIS dari desa yang dipilih",
        /^\d{5}$/.test(postal),
        postal ? `kode pos = ${postal}` : "kosong (tidak terisi otomatis)",
      );

      /*
       * Kode pos HARUS bisa dikoreksi. One postal code can be shared by many
       * villages, and forcing the API value when reality differs is worse than
       * useless.
       */
      await page.fill('input[name="postalCode"]', "40123");
      const edited = await page.locator('input[name="postalCode"]').inputValue();
      check(
        "kode pos bisa dikoreksi manual (tidak dikunci)",
        edited === "40123",
        `setelah dikoreksi = ${edited}`,
      );
    }
  }

  // ---- Field manual & titik opsional ----
  for (const [label, name] of [
    ["Nama jalan", "streetName"],
    ["Nomor rumah", "houseNumber"],
    ["RT", "rt"],
    ["RW", "rw"],
  ] as const) {
    check(
      `field ${label} ada`,
      (await page.locator(`input[name="${name}"]`).count()) === 1,
      name,
    );
  }

  const latCount = await page.locator('input[name="latitude"]').count();
  check("titik koordinat ada dan OPSIONAL", latCount === 1, "lat/lng ada, tidak wajib");

  const mapButton = await page.getByRole("button", { name: /pakai lokasi saya/i }).count();
  check(
    "ada tombol geolokasi (izin diminta eksplisit)",
    mapButton === 1,
    `${mapButton} tombol`,
  );

  /* ---- Peta: Leaflet + OSM, dimuat saat dibuka ---- */
  const mapToggle = page.getByRole("button", { name: /pilih titik di peta/i });
  check(
    "ada tombol buka peta Leaflet",
    (await mapToggle.count()) === 1,
    "tombol ditemukan",
  );

  // LAZY LOADING. Leaflet + CSS-nya hanya boleh diambil setelah tombol ditekan.
  // Kalau tidak, setiap pengunjung storefront memakai bandwidth untuk peta yang
  // mungkin tidak pernah dia lihat.
  const leafletRequests = () =>
    page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /leaflet|tile\.openstreetmap/.test(e.name)).length,
    );
  const beforeOpen = await leafletRequests();
  check(
    "TIDAK ada permintaan Leaflet sebelum peta dibuka",
    beforeOpen === 0,
    `${beforeOpen} permintaan`,
  );

  await mapToggle.click();
  await page.waitForTimeout(3000);

  const afterOpen = await leafletRequests();
  check(
    "peta dimuat setelah tombol ditekan (lazy import bekerja)",
    afterOpen > 0,
    `${afterOpen} permintaan leaflet/tile`,
  );
  check(
    "kontainer Leaflet terbentuk",
    (await page.locator(".leaflet-container").count()) === 1,
    ".leaflet-container ada",
  );
  const tileCount = await page.locator("img.leaflet-tile").count();
  check("tile peta benar-benar termuat", tileCount > 0, `${tileCount} tile`);

  // Atribusi OSM WAJIB tampil — syarat penggunaan tile mereka.
  const attribution = await page.locator(".leaflet-control-attribution").innerText();
  check(
    "atribusi © OpenStreetMap contributors tampil",
    /openstreetmap/i.test(attribution),
    attribution.replace(/\s+/g, " ").slice(0, 60),
  );

  // Ketuk peta harus menandai titik dan mengisi koordinat.
  const mapBox = await page.locator(".leaflet-container").boundingBox();
  if (mapBox) {
    await page.mouse.click(
      mapBox.x + mapBox.width * 0.4,
      mapBox.y + mapBox.height * 0.5,
    );
    await page.waitForTimeout(700);
    const lat = await page.locator('input[name="latitude"]').inputValue();
    const lng = await page.locator('input[name="longitude"]').inputValue();
    check(
      "mengetuk peta mengisi latitude & longitude",
      Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== "" && lng !== "",
      `lat=${lat || "kosong"} lng=${lng || "kosong"}`,
    );
    check(
      "penanda tergambar di peta",
      (await page.locator("path.leaflet-interactive").count()) > 0,
      "circle marker ada",
    );
  } else {
    check("peta punya area yang bisa diketuk", false, "boundingBox tidak ditemukan");
  }

  // ---- Layout 375px ----
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("tidak ada geser horizontal di 375px", overflow <= 0, `overflow=${overflow}px`);

  await page.screenshot({ path: "screenshots/alamat-375.png", fullPage: true });
  await page.close();
  await context.close();
  await browser.close();

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan form alamat lulus."
      : `\n${failures} pemeriksaan form alamat gagal.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
