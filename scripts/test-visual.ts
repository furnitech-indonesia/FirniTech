/**
 * Verifikasi visual dengan Playwright (ROADMAP Sprint 10).
 *
 * TUJUAN: memeriksa hal-hal yang TIDAK bisa dicek tanpa merender halaman.
 * Structure check (test:responsive) sudah menangkap aturan kelas dan token;
 * skrip ini menangkap apa yang benar-benar terjadi di layar.
 *
 * Yang diperiksa:
 *   1. Tangkapan layar di 375 / 768 / 1440px untuk tiap halaman
 *   2. Overflow horizontal — aturan PRD §3.1, penyebab utama "halaman terasa
 *      sempit" di HP
 *   3. Target sentuh >= 44px pada elemen interaktif di layar sentuh
 *   4. Error konsol & 404 aset saat render
 *   5. Keyboard: skip-link muncul saat Tab pertama
 *
 * Jalankan: npm run test:visual   (server harus sudah jalan)
 */
import { chromium, type ConsoleMessage } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const OUT = "screenshots";

type Viewport = { name: string; width: number; height: number };

/** Tiga ukuran wajib PRD §3.1. */
const VIEWPORTS: Viewport[] = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

/**
 * Halaman publik + login. Back-office butuh sesi JWT Supabase, jadi tidak
 * bisa(dirender tanpa kredensial; cakupannya dipisahkan ke test:auth.
 */
const PAGES = [
  { path: "/", name: "landing" },
  { path: "/login", name: "login" },
] as const;

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      // pointer: coarse meniru perangkat sentuh; dipakai untuk menguji
      // aturan min-height 44px yang hanya berlaku di sana.
      hasTouch: vp.name === "mobile",
      isMobile: vp.name === "mobile",
      deviceScaleFactor: 1,
    });

    for (const target of PAGES) {
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("response", (res) => {
        if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
      });

      const url = BASE + target.path;
      await page.goto(url, { waitUntil: "networkidle" });

      const label = `${target.name}/${target.name}`;

      /* --- 1. Overflow horizontal (PRD §3.1) --- */
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          // Elemen yang benar-benar meluber, bukan cuma dokumennya.
          culprits: [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.right > doc.clientWidth + 1;
            })
            .slice(0, 3)
            .map((el) => {
              const cls =
                typeof el.className === "string" ? el.className.split(" ")[0] : "";
              return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
            }),
        };
      });

      check(
        `${label} tidak ada scroll horizontal`,
        overflow.scrollWidth <= overflow.clientWidth + 1,
        overflow.scrollWidth <= overflow.clientWidth + 1
          ? `${overflow.scrollWidth}px = lebar viewport`
          : `${overflow.scrollWidth}px > ${overflow.clientWidth}px, meluber: ${overflow.culprits.join(", ")}`,
      );

      /* --- 2. Target sentuh (hanya layar sentuh, PRD §3.1) --- */
      if (vp.name === "mobile") {
        const small = await page.evaluate(() => {
          const MIN = 44;
          return [...document.querySelectorAll<HTMLElement>("a, button, [role=button]")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              // Lewati elemen yang disembunyikan atau di luar viewport.
              if (r.width === 0 || r.height === 0) return false;
              const style = getComputedStyle(el);
              if (style.visibility === "hidden" || style.display === "none") return false;
              // Elemen di dalam <details> yang tertutup juga belum terlihat.
              if (el.closest("details:not([open])") && el.tagName === "SUMMARY") {
                return false;
              }
              // Tautan inline di dalam paragraf dikecualikan, sesuai WCAG
              // 2.5.8: targetnya adalah kalimatnya, bukan elemennya. Tautan
              // navigasi berdiri sendiri (footer, menu) tetap wajib 44px.
              if (el.closest("p, li") && el.tagName === "A" && !el.closest("nav, footer")) {
                return false;
              }
              return r.height < MIN - 0.5;
            })
            .slice(0, 5)
            .map((el) => {
              const cls =
                typeof el.className === "string" ? el.className.split(" ")[0] : "";
              const r = el.getBoundingClientRect();
              return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""} ${Math.round(r.height)}px`;
            });
        });

        check(
          `${label} target sentuh >= 44px`,
          small.length === 0,
          small.length === 0 ? "semua tombol/link cukup tinggi" : small.join(", "),
        );
      }

      /* --- 3. Error konsol & aset rusak --- */
      check(
        `${label} tanpa error konsol`,
        consoleErrors.length === 0,
        consoleErrors.length === 0 ? "bersih" : consoleErrors.slice(0, 2).join(" | "),
      );
      check(
        `${label} tanpa permintaan gagal`,
        failedRequests.length === 0,
        failedRequests.length === 0
          ? "tidak ada 4xx/5xx"
          : failedRequests.slice(0, 2).join(" | "),
      );

      /* --- 4. Screenshot --- */
      await page.screenshot({
        path: `${OUT}/${target.name}-${vp.name}.png`,
        fullPage: true,
      });

      await page.close();
    }

    await context.close();
  }

  /* --- 5. Keyboard: skip-link --- */
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    await page.keyboard.press("Tab");
    // .skip-link punya `transition: transform 150ms`. Mengukur langsung
    // setelah Tab menangkap posisi SEBELUM transisi selesai, dan akan
    // melaporkan link yang sebenarnya benar sebagai tersembunyi.
    await page.waitForTimeout(400);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent?.trim() ?? "",
        top: Math.round(r.top),
        visible: r.top >= 0 && r.bottom <= window.innerHeight,
      };
    });

    check(
      "skip-link adalah fokus pertama dan terlihat",
      focused?.text.includes("Lompat") === true && focused.visible === true,
      focused
        ? `"${focused.text}" top=${focused.top}px, terlihat=${focused.visible}`
        : "tidak ada elemen fokus",
    );

    await page.close();
    await context.close();
  }

  /* --- 6. Drawer mobile benar-benar terbuka (Fase B) --- */
  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    const trigger = page.getByRole("button", { name: /menu navigasi/i });
    const exists = (await trigger.count()) > 0;
    check("tombol menu ada di mobile", exists, exists ? "ditemukan" : "tidak ada");

    if (exists) {
      await trigger.click();
      await page.waitForTimeout(400);
      const open = await page.evaluate(() => {
        const dialog = document.querySelector('[data-slot="sheet-content"]');
        if (!dialog) return null;
        const r = dialog.getBoundingClientRect();
        return { width: Math.round(r.width), visible: r.width > 0 && r.height > 0 };
      });
      check(
        "drawer terbuka dengan lebar wajar di 375px",
        open?.visible === true && (open?.width ?? 0) <= 375,
        open ? `lebar ${open.width}px` : "panel tidak ditemukan",
      );
      await page.screenshot({ path: `${OUT}/drawer-mobile.png` });

      // Escape harus menutup (perilaku sheet shadcn, tidak didapat dari <details>)
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const closed = await page.evaluate(
        () => !document.querySelector('[data-slot="sheet-content"]'),
      );
      check("Escape menutup drawer", closed, closed ? "tertutup" : "masih terbuka");
    }

    await page.close();
    await context.close();
  }

  /* --- 7. Toggle harga benar-benar mengubah angka (Fase B) --- */
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    const yearly = page.getByRole("button", { name: "Tahunan" });
    const hasToggle = (await yearly.count()) > 0;
    check("toggle periode ada", hasToggle, hasToggle ? "ditemukan" : "tidak ada");

    if (hasToggle) {
      const monthlyText = await page.locator("#harga").innerText();
      await yearly.click();
      await page.waitForTimeout(300);
      const yearlyText = await page.locator("#harga").innerText();

      const changed = monthlyText !== yearlyText;
      check(
        "toggle mengubah tampilan harga",
        changed && /10%/.test(yearlyText),
        changed
          ? /10%/.test(yearlyText)
            ? "harga berubah dan diskon 10% muncul"
            : "harga berubah tapi diskon tidak tampil"
          : "harga tidak berubah",
      );
      check(
        "harga tahunan sesuai plans.ts (3.240.000)",
        yearlyText.includes("3.240.000"),
        yearlyText.includes("3.240.000") ? "Rp 3.240.000 tampil" : "tidak ditemukan",
      );
    }

    await page.close();
    await context.close();
  }

  await browser.close();

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan visual lulus."
      : `\n${failures} pemeriksaan visual gagal.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
