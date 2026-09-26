/**
 * Pemeriksaan struktural responsif (PRD §3.1).
 *
 * Memeriksa aturan yang bisa diperiksa tanpa browser — cioia yang
 * checked otomatis. Pemeriksaan ini TIDAK menggantikan pengujian visual;
 * tujuannya menangkap regresi yang mahal (tabel tanpa padanan kartu, warna
 * yang keluar dari token, ikon yang butuh jaringan).
 *
 * Jalankan: npm run test:responsive
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".opencode") {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

const appFiles = walk("app");
const compFiles = walk("src/components");
const libFiles = walk("src/lib");
const all = [...appFiles, ...compFiles, ...libFiles];

function read(path: string) {
  return readFileSync(path, "utf-8");
}

function main() {
  // ---- 1. Tabel data harus punya padanan non-tabel di layar kecil ----
  // Primitif src/components/ui/ bukan halaman: <table> di sana adalah
  // pembungkus, bukan tabel data, jadi tidak butuh padanan kartu.
  const filesWithTable = all.filter(
    (f) => !f.includes("/components/ui/") && /<table[\s>]/.test(read(f)),
  );
  const tablesWithoutMobileAlt = filesWithTable.filter((f) => {
    const src = read(f);
    return !/md:hidden/.test(src) || !/overflow-x-auto/.test(src);
  });
  check(
    "Tabel data punya padanan kartu di mobile (md:hidden) + overflow-x-auto",
    tablesWithoutMobileAlt.length === 0,
    tablesWithoutMobileAlt.length === 0
      ? `${filesWithTable.length} tabel diperiksa`
      : tablesWithoutMobileAlt.join(", "),
  );

  // ---- 2. Kontainer utama selalu punya padding horizontal ----
  const containers = all.filter((f) => /className="mx-auto w-full max-w-/.test(read(f)));
  const containersWithoutPadding = containers.filter(
    (f) => !/px-4/.test(read(f)),
  );
  check(
    "Kontainer halaman selalu punya padding horizontal (px-4)",
    containersWithoutPadding.length === 0,
    `${containers.length} kontainer diperiksa`,
  );

  // ---- 3. Target sentuh minimal 44px pada elemen interaktif utama ----
  const navPath = "src/components/dashboard-nav.tsx";
  const nav = read(navPath);
  check(
    "Link navigasi memakai min-h-11 (target sentuh 44px)",
    /min-h-11/.test(nav),
    "min-h-11 ditemukan",
  );

  // ---- 4. Menu navigasi punya padanan mobile ----
  check(
    "Navigasi punya menu mobile (tombol buka di bawah md)",
    /md:hidden/.test(nav) && /aria-controls="dashboard-menu"/.test(nav),
    "tombol menu + panel terdeteksi",
  );

  // ---- 5. Tidak ada warna hardcoded di markup (harus lewat token) ----
  // Pengecualian: kelas utilitas Tailwind bawaan yang benar-benar netral
  // (hitam/putih) dan kelas status lama.
  const hardcoded = /(?<!-)\b(?:bg|text|border)-(?:slate|amber|yellow|red|green|blue|purple)-[0-9]{2,3}\b/;
  const offenders = all.filter((f) => {
    const src = read(f);
    // globals.css memang boleh menyebut warna DESIGN.md sebagai nilai hex.
    if (f.endsWith("globals.css")) return false;
    return hardcoded.test(src);
  });
  check(
    "Warna di markup memakai token semantik, bukan hex/amber-600",
    offenders.length === 0,
    offenders.length === 0
      ? `${all.length} file diperiksa`
      : offenders.slice(0, 5).join(", "),
  );

  // ---- 6. Ikon: tidak boleh ada icon font dari CDN ----
  const cdnFont = all.filter((f) => {
    const src = read(f);
    return /fonts\.googleapis\.com|material-symbols/i.test(src);
  });
  check(
    "Tidak ada icon font dari CDN (Phosphor inline SVG)",
    cdnFont.length === 0,
    cdnFont.length === 0 ? "bersih" : cdnFont.join(", "),
  );

  // ---- 7. Ikon Phosphor pada file server harus pakai entry ssr ----
  const serverFiles = all.filter(
    (f) => !read(f).includes('"use client"') && !f.includes("/ui/"),
  );
  const wrongPhosphorEntry = serverFiles.filter(
    (f) =>
      /from "@phosphor-icons\/react"/.test(read(f)) &&
      !/import type/.test(read(f).split("\n").find((l) => l.includes("phosphor")) ?? ""),
  );
  check(
    "Ikon Phosphor di file server memakai entry /dist/ssr",
    wrongPhosphorEntry.length === 0,
    wrongPhosphorEntry.length === 0 ? "benar" : wrongPhosphorEntry.join(", "),
  );

  // ---- 8. Viewport untuk pembungkus Capacitor ----
  const layout = read("app/layout.tsx");
  check(
    "Viewport menyertakan viewportFit=cover (notch iOS)",
    /viewportFit:\s*"cover"/.test(layout),
    "viewportFit=cover ditemukan",
  );

  // ---- 9. Tidak ada lebar tetap px yang memaksa overflow ----
  const fixedWidth = all.filter((f) =>
    /className="[^"]*\b(?:min-)?w-\[[3-9]\d{2}px\]/.test(read(f)),
  );
  check(
    "Tidak ada lebar tetap >= 300px di className",
    fixedWidth.length === 0,
    fixedWidth.length === 0 ? "bersih" : fixedWidth.join(", "),
  );

  // ---- 10. Primitif TIDAK boleh dibuat ulang di luar src/components/ui/ ----
  // shadcn/ui adalah pemilik tunggal primitif. Komposisi buatan sendiri hanya
  // boleh berupa pola halaman, misalnya SectionCard di components/panels.tsx.
  const primitiveOwners = [
    "Card", "Badge", "Button", "Input", "Textarea", "Select",
    "Field", "Alert", "Empty", "EmptyState", "SubmitButton",
  ];
  const reimplementations = all.filter((f) => {
    if (f.includes("/components/ui/")) return false;
    if (f.endsWith("components/panels.tsx")) return false;
    return new RegExp(
      `export (?:function|const) (${primitiveOwners.join("|")})\\b`,
    ).test(read(f));
  });
  check(
    "Tidak ada primitif yang dibuat ulang di luar src/components/ui/",
    reimplementations.length === 0,
    reimplementations.length === 0
      ? "shadcn/ui adalah pemilik tunggal"
      : reimplementations.join(", "),
  );

  // ---- 11. Form berisi input WAJIB lewat ZodForm, bukan ActionForm ----
  const actionFormUsers = all.filter((f) => /<ActionForm/.test(read(f)));
  const actionFormWithInput = actionFormUsers.filter((f) => {
    const src = read(f);
    const hasVisibleInput =
      /<input(?![^>]*type="hidden")/.test(src) ||
      /<(TextField|SelectField|TextAreaField)\b/.test(src);
    return hasVisibleInput;
  });
  check(
    "ActionForm tidak dipakai untuk form yang berisi input",
    actionFormWithInput.length === 0,
    actionFormWithInput.length === 0
      ? `${actionFormUsers.length} pemakaian ActionForm (tanpa input) OK`
      : actionFormWithInput.join(", "),
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} pemeriksaan responsif lulus.\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
