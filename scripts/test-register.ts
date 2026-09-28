import { chromium } from "playwright";

/**
 * Pemeriksaan wizard pendaftaran /daftar (ROADMAP Sprint 10, Fase D).
 *
 * Ini bagian yang dilaporkan user: halaman /login tidak punya tombol daftar,
 * jadi pengunjung yang belum punya akun tiba di situ lalu buntu. Enam
 * pemeriksaan di bawah menjaga agar jalan itu tidak pernah tertutup lagi.
 *
 * SELECTOR LANGKAH: `form section[aria-label]`. Bukan `main section` — di
 * dalam `<main>` ada pembungkus tata letak dan section Base UI untuk toaster
 * yang juga punya `aria-label`, jadi menghitung `main section` ikut menghitung
 * yang bukan langkah wizard. Itu sempat membuat tes ini melaporkan "2 dari 5
 * section terlihat" padahal wizard-nya benar.
 *
 * Yang TIDAK di sini: signature webhook dan gerbang tenant. Itu ada di
 * `npm run test:webhook`.
 *
 * Jalankan: npm run test:register   (server harus sudah jalan)
 */
const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const OUT = "screenshots";

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}


/**
 * Cek server hidup sebelum menjalankan apa pun.
 *
 * Tanpa ini, server yang mati membuat `page.goto` melempar atau — lebih buruk —
 * halaman fallback ter-render dan pemeriksaan melaporkan "0 langkah terlihat",
 * yang terbaca sebagai bug wizard padahal wizard-nya tidak pernah diuji sama
 * sekali. Sudah terjadi: `.next` terhapus, `npm run start` gagal diam-diam,
 * dan hasilnya dilaporkan sebagai kegagalan wizard.
 */
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

async function main() {
  await requireServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Jalur penemuan. Ini inti laporan bug-nya: dari halaman publik harus
  //    ada jalan yang bisa dilalui sampai ke pendaftaran.
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const discovery = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href="/daftar"]')];
    const tooSmall = links.filter((a) => a.getBoundingClientRect().height < 44).length;
    return { count: links.length, tooSmall };
  });
  check(
    "landing punya jalan ke pendaftaran, semua memenuhi target sentuh",
    discovery.count > 0 && discovery.tooSmall === 0,
    `${discovery.count} tautan, ${discovery.tooSmall} terlalu pendek`,
  );

  const primary = page.getByRole("link", { name: /mulai sekarang/i }).first();
  const primaryHref = (await primary.getAttribute("href")) ?? "";
  check(
    "CTA utama landing menuju /daftar",
    primaryHref === "/daftar",
    primaryHref || "(tanpa href)",
  );

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  const onLogin = await page.locator('a[href="/daftar"]').count();
  check(
    "/login punya jalan ke pendaftaran",
    onLogin > 0,
    onLogin > 0 ? "tautan ada" : "buntu: tidak ada jalan dari halaman masuk",
  );

  // 2. Struktur wizard.
  await page.goto(BASE + "/daftar", { waitUntil: "networkidle" });
  const wizard = await page.evaluate(() => {
    const steps = [
      ...document.querySelectorAll<HTMLElement>("form section[aria-label]"),
    ];
    return {
      total: steps.length,
      visible: steps.filter((s) => !s.hasAttribute("hidden")).length,
      first: steps.findIndex((s) => !s.hasAttribute("hidden")) + 1,
    };
  });
  check(
    "wizard punya 4 langkah, hanya satu terlihat",
    wizard.total === 4 && wizard.visible === 1 && wizard.first === 1,
    `${wizard.total} langkah, ${wizard.visible} terlihat, yang aktif ${wizard.first}`,
  );

  // 3. Validasi menahan perpindahan langkah.
  const next = page.getByRole("button", { name: /^Lanjut$/ });
  await next.click();
  await page.waitForTimeout(400);
  const errorCount = await page.locator('[data-slot="field-error"]').count();
  const activeStep = () =>
    page.evaluate(
      () =>
        [
          ...document.querySelectorAll<HTMLElement>("form section[aria-label]"),
        ].findIndex((s) => !s.hasAttribute("hidden")) + 1,
    );

  check(
    "langkah kosong ditolak dengan pesan per field",
    errorCount >= 2,
    `${errorCount} pesan error tampil`,
  );
  check(
    "tombol Lanjut tidak melewati langkah yang belum sah",
    (await activeStep()) === 1,
    `tetap di langkah ${await activeStep()}`,
  );

  await page.screenshot({ path: `${OUT}/daftar-desktop.png` });

  /* ---------- 4. Add-on Paket Pendirian PT di langkah paket ---------- */
  //
  // Bagian ini menguji sesuatu yang TIDAK bisa dijawab dari source code:
  // apakah nilai checkbox benar-benar sampai ke FormData.
  //
  // Checkbox Base UI dirender sebagai `<span role="checkbox">` 16x16px dengan
  // `<input type="checkbox">` native berukuran 1x1px di sebelahnya. Kalau
  // input native itu tidak punya `name`, atau kalau React tidak menyalin
  // state visualnya ke input itu, maka klik berhasil secara visual tapi
  // FormData tetap KOSONG -- server membaca `tambahLegalitas: false`, tidak
  // ada invoice legalitas yang dibuat, dan tidak ada error apa pun yang
  // muncul. Kegagalan itu total dan sunyi.
  await page.fill('input[name="fullName"]', "Budi Santoso");
  await page.fill('input[name="phone"]', "08123456789");
  await page.fill('input[name="email"]', `budi-${Date.now()}@contoh.test`);
  await page.fill('input[name="password"]', "BengkelKuat9");
  await page.fill('input[name="confirmPassword"]', "BengkelKuat9");
  await next.click();
  await page.waitForTimeout(300);
  await page.fill('input[name="workshopName"]', "Mebel Jaya Uji");
  await page.fill('input[name="slug"]', `mebel-jaya-uji-${Date.now()}`);
  await next.click();
  await page.waitForTimeout(400);

  const addonState = () =>
    page.evaluate(() => {
      const fd = new FormData(document.querySelector("form")!);
      const input = document.querySelector<HTMLInputElement>(
        'input[type="checkbox"][name="tambahLegalitas"]',
      );
      return {
        // Yang dilihat server. `null` berarti field tidak ada sama sekali.
        diFormData: fd.has("tambahLegalitas")
          ? String(fd.get("tambahLegalitas"))
          : null,
        // Yang dilihat mata.
        terCentang: document
          .querySelector('[role="checkbox"][id^="base-ui"]')
          ?.getAttribute("aria-checked"),
        // Input native 1x1px adalah SATU-SATUNYA pembawa nilai ke
        // FormData, jadi harus benar-benar ada dan punya `name`.
        inputNative: input
          ? { ada: true, nama: input.getAttribute("name") }
          : { ada: false, nama: null },
      };
    });

  const sebelum = await addonState();
  check(
    "langkah paket menawarkan add-on Paket Pendirian PT",
    sebelum.inputNative.ada && sebelum.inputNative.nama === "tambahLegalitas",
    `input native: ${JSON.stringify(sebelum.inputNative)}`,
  );
  check(
    "add-on tidak tercentang di awal (tidak ada di FormData)",
    sebelum.diFormData === null && sebelum.terCentang === "false",
    `FormData=${sebelum.diFormData ?? "(tidak ada)"}, aria-checked=${sebelum.terCentang}`,
  );

  // Klik lewat span yang dirender, bukan lewat input 1x1px yang mustahil
  // diklik manusia.
  await page.locator('span[role="checkbox"][id^="base-ui"]').click();
  await page.waitForTimeout(250);
  const sesudah = await addonState();
  check(
    "mengklik add-on membuatnya masuk FormData (nilai `on`, bukan boolean)",
    sesudah.diFormData === "on",
    `FormData=${sesudah.diFormData ?? "(tidak ada)"} — kalau null, server tidak akan pernah membuat invoice legalitas`,
  );
  check(
    "state visual dan isi FormData berjalan seiring",
    sesudah.terCentang === "true" && sesudah.diFormData === "on",
    `aria-checked=${sesudah.terCentang}, FormData=${sesudah.diFormData}`,
  );

  // Ringkasan di langkah 4 harus menghitung add-on. Kalau tidak, totalnya
  // menampilkan Rp 750.000 sementara tagihannya Rp 1.250.000 -- dan itu
  // angka yang dilihat orang tepat sebelum ia menyerahkan uang.
  await next.click();
  await page.waitForTimeout(400);
  const ringkasan = await page.evaluate(() => {
    const dl = document.querySelector('form section[data-step="4"] dl');
    return dl?.textContent?.replace(/\s+/g, " ").trim() ?? null;
  });
  const adaBarisLegalitas = ringkasan?.includes("Paket Pendirian PT") ?? false;
  check(
    "ringkasan menampilkan add-on sebagai baris terpisah",
    adaBarisLegalitas,
    adaBarisLegalitas ? "baris ada" : `ringkasan: ${ringkasan}`,
  );
  /*
   * Totalnya dihitung dari teks yang tampil, BUKAN dari angka yang diketik
   * di sini. Versi pertama tes ini mengarang "Rp 1.250.000" karena
   * mengira harga paket Pro Rp 750.000 -- dan tes itu gagal karena asumsinya
   * salah, bukan karena wizard salah. Angka yang benar harus dibaca dari
   * halaman; kalau tidak, tes ini menguji ulang Menghafal yang sama.
   */
  const nominalPaket = Number(
    (await page.evaluate(() => {
      const dl = document.querySelector('form section[data-step="4"] dl');
      const rows = [...(dl?.querySelectorAll("div") ?? [])];
      const baris = rows.find((d) => d.textContent?.includes("Pro · bulanan"));
      const m = baris?.parentElement?.textContent?.match(/Rp\s*([\d.]+)/);
      return m?.[1]?.replace(/\./g, "") ?? null;
    })) ?? "0",
  );
  const nominalAddOn = 500_000;
  const totalHarus = nominalPaket + nominalAddOn;
  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const adaTotalGabung = ringkasan?.includes(fmt(totalHarus)) ?? false;
  check(
    `total ringkasan = paket + add-on (${fmt(totalHarus)})`,
    adaTotalGabung,
    adaTotalGabung
      ? fmt(totalHarus)
      : `ringkasan tidak memuat ${fmt(totalHarus)}: ${ringkasan}`,
  );
  check(
    "add-on tidak masuk MRR: ditampilkan sebagai sekali bayar",
    /sekali bayar/.test(ringkasan ?? ""),
    "label sekali bayar tampil",
  );

  /*
   * Tombol submit harus TEPAT SATU.
   *
   * Ini bug lama yang sudah ada sejak wizard pertama: `ZodForm` merender
   * tombol `submitLabel`-nya sendiri, dan `RegisterForm` menambahkan tombol
   * "Buat akun" kedua secara manual. Hasilnya dua tombol identik berdampingan
   * di langkah terakhir — terlihat di screenshot, tapi tidak pernah
   * dilaporkan karena keduanya "berfungsi".
   *
   * Yang membuatnya berbahaya: yang di-click bisa jadi tombol yang tidak
   * menampilkan status `Memproses…`. Dua aksi yang terlihat sama tapi
   * berbeda perilaku.
   */
  const tombolSubmit = await page.evaluate(() => {
    const form = document.querySelector("form")!;
    const visible = [...form.querySelectorAll('button[type="submit"]')].filter(
      (b) => b.getBoundingClientRect().height > 0,
    );
    return {
      total: visible.length,
      label: visible.map((b) => b.textContent?.trim() ?? ""),
    };
  });
  check(
    "hanya ada SATU tombol submit yang terlihat",
    tombolSubmit.total === 1,
    `${tombolSubmit.total} tombol: ${tombolSubmit.label.join(" | ") || "(tanpa label)"}`,
  );

  await page.screenshot({ path: `${OUT}/daftar-dengan-addon.png` });

  // Layar kecil. Checkbox Base UI punya area sentuh 1x1px pada input
  // native-nya, jadi yang diklik orang sebenarnya adalah `<label>`.
  // Kalau label itu tidak punya tinggi minimum, add-on jadi tidak bisa
  // ditekan dengan jari di HP -- dan tidak ada yang melihatnya di desktop.
  //
  // Kembali ke langkah 3 DULU: langkah yang tidak aktif memakai atribut
  // `hidden`, jadi mengukur labelnya dari langkah 4 selalu menghasilkan
  // 0x0. Itu bukan kegagalan tata letak, itu langkah yang salah diukur.
  await page.getByRole("button", { name: /Kembali/ }).click();
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const targetSentuh = await page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>(
      'input[type="checkbox"][name="tambahLegalitas"]',
    );
    const label = document.querySelector(
      'label[for="tambahLegalitas"]',
    ) as HTMLElement | null;
    const r = label?.getBoundingClientRect();
    const native = el?.getBoundingClientRect();
    return {
      labelHeight: r ? Math.round(r.height) : 0,
      labelWidth: r ? Math.round(r.width) : 0,
      nativeHeight: native ? Math.round(native.height) : 0,
      // Scroll horizontal di 375px adalah kegagalan tata letak yang
      // paling sering lolos di desktop.
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  check(
    "area sentuh add-on minimal 44px di 375px (lewat label)",
    targetSentuh.labelHeight >= 44,
    `label ${targetSentuh.labelWidth}x${targetSentuh.labelHeight}px, input native ${targetSentuh.nativeHeight}px`,
  );
  check(
    "tidak ada scroll horizontal di 375px",
    targetSentuh.overflow <= 0,
    `luar ${targetSentuh.overflow}px`,
  );
  await page.screenshot({ path: `${OUT}/daftar-mobile-addon.png` });

  await page.close();
  await context.close();
  await browser.close();

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan wizard lulus."
      : `\n${failures} pemeriksaan wizard gagal.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
