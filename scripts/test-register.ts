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

async function main() {
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
