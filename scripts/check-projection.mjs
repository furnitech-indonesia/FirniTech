#!/usr/bin/env node
/**
 * Pengeriksa konsistensi docs/proyeksi-revenue.md.
 *
 * Dokumen proyeksi disusun manual di beberapa bagian: ringkasan, tabel 51
 * bulan, tabel infrastruktur, bagian PPh, bagian sensitivitas. Semuanya
 * harus berasal dari satu model. Setiap kali add-on atau asumsi berubah,
 * mudah ada satu klausul yang ikut diperbarui dan lima yang tertinggal --
 * dan dokumen tetap terlihat benar karena selisihnya kecil.
 *
 * Skrip ini mereplikasi modelnya lalu membandingkan hasilnya dengan angka
 * yang TERTULIS di dokumen. Yang diuji bukan modelnya benar, tapi dokumennya
 * masih cocok dengan model itu.
 *
 * Semua bug yang pernah ditemukan di dokumen ini berasal dari pola yang
 * sama: satu bagian diperbarui, bagian lain tertinggal, dan tidak ada yang
 * membandingkan keduanya. Skrip ini adalah yang membandingkan.
 *
 * Menjalankan:
 *   node scripts/check-projection.mjs
 *   npm run check:proyeksi
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = readFileSync(join(ROOT, "docs/proyeksi-revenue.md"), "utf8");

// ===========================================================================
// MODEL
//
// Setiap konstanta di sini punya kembar di dalam dokumen. Kalau salah satu
// diubah, skrip ini yang akan bilang mana yang tertinggal.
// ===========================================================================
const CHURN = 0.03;
const INFLASI = 0.05;
const FEE = 4440;
const SHARE_TAHUN = 0.3;
const PPH = 0.005;
const FX = 18037;

const ASLI_DOMAIN = 10.46 * FX;
const ROOT_DOMAIN = 10.46 * FX;
const HARGA_DOMAIN = 250_000;
const TAKEUP_DOMAIN = 0.6;

const HARGA_LEGALITAS = 500_000;
const BIAYA_LEGALITAS = 150_000; // PNBP 50.000 + ongkos pengurusan 100.000
const TAKEUP_LEGALITAS = 0.2;

const JAM_CPU_PER_PELANGGAN = 0.3;
const JAM_GRATIS = 4;
const HARGA_JAM = 0.128;
const KREDIT_GRATIS = 20;

const PLAN = {
  basic: { bulanan: 300_000, tahunan: 3_420_000, mix: 0.6 },
  pro: { bulanan: 500_000, tahunan: 5_700_000, mix: 0.3 },
  max: { bulanan: 1_000_000, tahunan: 11_400_000, mix: 0.1 },
};
const PAKET = ["basic", "pro", "max"];
const TAHUN = [2026, 2027, 2028, 2029, 2030];
const TARGET = [100, 178, 316, 562, 1000];
const ADMIN = { 2026: 0, 2027: 3.5e6, 2028: 3.5e6, 2029: 4.5e6, 2030: 5e6 };

const usdInfrastruktur = (tahun, pelanggan) =>
  25 +
  100 +
  20 +
  Math.max(
    0,
    (pelanggan * JAM_CPU_PER_PELANGGAN - JAM_GRATIS) * HARGA_JAM - KREDIT_GRATIS,
  ) +
  (tahun >= 2028 ? 46 : 0) +
  10.46 / 12;

/**
 * Rekrut per bulan agar jumlah aktif akhir tahun sama dengan target.
 *
 * PENTING: `awal` adalah pelanggan akhir tahun SEBELUMNYA, bukan nol.
 *
 * Dua versi rumus ini pernah tertukar di dokumen dan menghasilkan angka yang
 * berbeda 60% (1.626 vs 2.599). Yang benar adalah yang mewarisi pelanggan
 * tahun sebelumnya, karena pelanggan tahun lalu tidak hilang digantikan --
 * mereka tetap dihitung, hanya sebagian yang churn.
 *
 * Mengulang pencarian dari nol tiap tahun membuat setiap tahun seolah
 * dimulai dari pelanggan kosong, sehingga rekrut per tahun jauh lebih besar
 * dan total kumulatifnya justru lebih besar dari jumlah yang pernah hilang.
 */
function rekrutPerBulan(target, bulan, churn, awal) {
  let lo = 0;
  let hi = 5000;
  for (let i = 0; i < 300; i++) {
    const r = (lo + hi) / 2;
    let x = awal;
    for (let m = 0; m < bulan; m++) x = (x + r) * (1 - churn);
    if (x < target) lo = r;
    else hi = r;
  }
  return (lo + hi) / 2;
}

function jalankan() {
  const st = {};
  for (const k of PAKET) st[k] = { bulanan: 0, tahunan: 0 };
  const tahunanAwal = {};
  for (const k of PAKET) tahunanAwal[k] = {};

  // Rekrutan per bulan dihitung berurutan: tahun ke-N mewarisi pelanggan
  // akhir tahun ke-(N-1). Karena itu dihitung dalam loop, bukan map.
  const rekrutan = [];
  let pelangganCarry = 0;
  for (let i = 0; i < TARGET.length; i++) {
    const nBulan = i === 0 ? 3 : 12;
    const r = rekrutPerBulan(TARGET[i], nBulan, CHURN, pelangganCarry);
    rekrutan.push(r);
    let x = pelangganCarry;
    for (let m = 0; m < nBulan; m++) x = (x + r) * (1 - CHURN);
    pelangganCarry = x;
  }

  let domainAktif = 0;
  let rootSudah = false;

  const perTahun = {};
  for (const y of TAHUN) {
    perTahun[y] = {
      omzet: 0, fee: 0, pph: 0, infra: 0, admin: 0, root: 0,
      omzetDomain: 0, biayaDomain: 0, omzetLegalitas: 0, bebanLegalitas: 0,
      feeLegalitas: 0, feeDomain: 0, margin: 0,
    };
  }
  const bulan = [];

  for (let i = 0; i < TAHUN.length; i++) {
    const tahun = TAHUN[i];
    const nBulan = i === 0 ? 3 : 12;
    const h = (1 + INFLASI) ** i;
    const mulai = i === 0 ? 10 : 1;
    for (const k of PAKET) tahunanAwal[k][tahun] = st[k].tahunan;

    for (let m = 0; m < nBulan; m++) {
      const bln = mulai + m;
      const admin = ADMIN[tahun] / nBulan;

      // OMZET memakai pelanggan AWAL bulan: mereka membayar tagihan yang sudah
      // terbit di awal bulan, jadi belum memakai server sama sekali. Kalau
      // rekrut dipindahkan ke sebelum perhitungan ini, seluruh omzet bergeser
      // -- itu bukan perbaikan bug, itu model baru.
      let ro = 0;
      let rf = 0;
      for (const k of PAKET) {
        const P = PLAN[k];
        ro += st[k].bulanan * P.bulanan * h + (m === 0 ? tahunanAwal[k][tahun] * P.tahunan * h : 0);
        rf += st[k].bulanan * FEE + (m === 0 ? tahunanAwal[k][tahun] * FEE : 0);
      }

      // INFRASTRUKTUR memakai pelanggan AKHIR bulan: mereka sudah memakai
      // server di bulan itu dan tagihannya sudah jalan. Versi sebelumnya
      // memakai jumlah yang sama dengan omzet, sehingga Okt 2026 tampil 0
      // padahal sudah ada 34 orang yang memakai server.
      for (const k of PAKET) {
        const baru = rekrutan[i] * PLAN[k].mix;
        st[k].bulanan = (st[k].bulanan + baru * (1 - SHARE_TAHUN)) * (1 - CHURN);
        st[k].tahunan = (st[k].tahunan + baru * SHARE_TAHUN) * (1 - CHURN);
      }
      const pelanggan = PAKET.reduce((a, k) => a + st[k].bulanan + st[k].tahunan, 0);
      const infra = usdInfrastruktur(tahun, pelanggan) * FX;

      // Add-on domain: bayar saat daftar, renewal setiap Januari.
      const ambilDomain = rekrutan[i] * TAKEUP_DOMAIN;
      let tagihDomain = ambilDomain;
      if (bln === 1) tagihDomain += domainAktif;
      const omzetDomain = tagihDomain * HARGA_DOMAIN;
      const biayaDomain = ambilDomain * ASLI_DOMAIN;
      /*
       * Fee Midtrans juga berlaku untuk add-on domain.
       *
       * Ini dulu TIDAK dihitung, dan itu kelalaian: `createDomainInvoice`
       * memanggil `createSaasCharge` yang memanggil `createSnapCharge`, jadi
       * tagihannya lewat Midtrans dan fee Rp 4.440 benar-benar terpakai.
       * Yang hilang cuma Rp 3,7 juta dalam 4,2 tahun - cukup kecil untuk
       * lolos tanpa terlihat, dan cukup nyata untuk tidak boleh ditulis
       * bahwa gratis.
       */
      const feeDomain = ambilDomain * FEE;
      domainAktif = (domainAktif + ambilDomain) * (1 - CHURN);

      // Add-on legalitas: sekali bayar, hanya di bulan rekrut.
      const nLegalitas = rekrutan[i] * TAKEUP_LEGALITAS;
      const omzetLegalitas = nLegalitas * HARGA_LEGALITAS;
      const bebanLegalitas = nLegalitas * BIAYA_LEGALITAS;
      const feeLegalitas = nLegalitas * FEE;

      // Root domain: SEKALI di bulan pertama 2026, lalu renewal bulanan.
      let root = 0;
      if (tahun === 2026) {
        root = rootSudah ? 0 : ROOT_DOMAIN;
        rootSudah = true;
      } else {
        root = ROOT_DOMAIN / 12;
      }

      const omzet = ro + omzetDomain + omzetLegalitas;
      const pph = omzet * PPH;
      const biaya = rf + infra + admin + biayaDomain + bebanLegalitas + feeLegalitas + feeDomain + root;
      const margin = omzet - biaya - pph;

      bulan.push({
        tahun, bln, pelanggan, omzet: ro, fee: rf, pph, infra, admin, root,
        omzetDomain, biayaDomain, omzetLegalitas, bebanLegalitas, feeLegalitas, feeDomain, margin,
      });
      const T = perTahun[tahun];
      T.omzet += ro; T.fee += rf; T.pph += pph; T.infra += infra;
      T.admin += admin; T.root += root;
      T.omzetDomain += omzetDomain; T.biayaDomain += biayaDomain;
      T.omzetLegalitas += omzetLegalitas; T.bebanLegalitas += bebanLegalitas;
      T.feeLegalitas += feeLegalitas; T.feeDomain += feeDomain; T.margin += margin;
    }
  }
  return { bulan, perTahun, rekrutan };
}

const M = jalankan();
const T = M.perTahun;
const sum = (f) => M.bulan.reduce((a, b) => a + f(b), 0);
const nBulanTahun = (y) => (y === 2026 ? 3 : 12);
const omzetTahun = (y) => T[y].omzet + T[y].omzetDomain + T[y].omzetLegalitas;

// ===========================================================================
// PEMERIKSAAN
// ===========================================================================
const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const keAngka = (n) => (typeof n === "number" ? n : Number(String(n).replace(/\D/g, "")));

const cek = [];

/**
 * Kuantitas yang harus sama persis. Toleransi nol: dokumen ini ditulis
 * manual, jadi selisih satu rupiah pun berarti ada klausul yang tertinggal.
 *
 * Perbandingannya BILANGAN, bukan "apakah string ini ada di dokumen".
 * Versi pertama skrip memakai yang kedua, dan itu kelemahan fatally:
 * selama angka model yang salah pun tertulis di dokumen, jawabannya tetap
 * "lulus" -- sehingga modelnya boleh benar atau salah tanpa ketahuan.
 */
const sama = (nama, model, dokumen) =>
  cek.push({
    nama,
    model: rupiah(model),
    dok: rupiah(dokumen),
    lulus: Math.round(keAngka(rupiah(model))) === Math.round(keAngka(rupiah(dokumen))),
  });

const hasil = [];
const catat = (nama, lulus, pesan) => hasil.push({ nama, lulus, pesan });

// --- Total 4,2 tahun -------------------------------------------------------
sama("Margin bersih 4,2 th", sum((b) => b.margin), 8_797_420_079);
sama("Rata-rata margin per bulan", sum((b) => b.margin) / 51, 172_498_433);
sama("Omzet langganan", sum((b) => b.omzet), 8_747_955_569);
sama("Omzet domain", sum((b) => b.omzetDomain), 417_343_184);
sama("Biaya domain", sum((b) => b.biayaDomain), 184_096_134);
sama("Omzet legalitas", sum((b) => b.omzetLegalitas), 162_628_789);
sama("Beban legalitas", sum((b) => b.bebanLegalitas), 48_788_637);
sama("Fee legalitas", sum((b) => b.feeLegalitas), 1_444_144);
sama("Fee domain", sum((b) => b.feeDomain), 4_332_431);
sama("PPh total", sum((b) => b.pph), 46_639_638);
sama("Infrastruktur", sum((b) => b.infra), 166_394_430);
sama("Legal + admin", sum((b) => b.admin), 16_500_000);
sama("Root domain", sum((b) => b.root), 943_335);
sama("Fee Midtrans langganan", sum((b) => b.fee), 61_368_715);
sama(
  "Total rekrut 4,2 th",
  M.rekrutan.reduce((a, r, i) => a + r * nBulanTahun(TAHUN[i]), 0),
  1_626,
);

// --- Margin per bulan per tahun ---------------------------------------------
const MARGIN_TAHUN = {
  2026: 10_998_541, 2027: 55_217_052, 2028: 104_610_520,
  2029: 198_046_080, 2030: 372_495_053,
};
for (const y of TAHUN) {
  sama(`Margin rata-rata ${y}`, T[y].margin / nBulanTahun(y), MARGIN_TAHUN[y]);
}

// --- Omzet per tahun, dipakai di bagian PPh --------------------------------
const OMZET_TAHUN = {
  2026: 57_273_210, 2027: 726_103_277, 2028: 1_350_933_741,
  2029: 2_513_024_996, 2030: 4_680_592_319,
};
for (const y of TAHUN) {
  sama(`Omzet total ${y}`, omzetTahun(y), OMZET_TAHUN[y]);
  sama(`PPh 0,5% ${y}`, T[y].pph, Math.round((omzetTahun(y) * PPH)));
}

// --- Rekrut per tahun, dipakai di tabel infrastruktur ----------------------
for (let i = 0; i < TAHUN.length; i++) {
  const y = TAHUN[i];
  const dok = { 2026: 106, 2027: 132, 2028: 233, 2029: 415, 2030: 740 }[y];
  const model = Math.round(M.rekrutan[i] * nBulanTahun(y));
  cek.push({ nama: `Rekrut ${y}`, model: String(model), dok: String(dok), lulus: model === dok });
}

// --- Angka lama yang pernah salah, tidak boleh jadi nilai di mana pun ------
// Angka yang HARUS tidak muncul sebagai nilai di mana pun. Kalau muncul,
// berarti ada klausul yang masih menyimpan versi lama.
const KEDALUWARSA = [
  ["96,9%", "marjin versi lama"],
  ["4,41 miliar", "omzet 2030 versi lama"],
  ["Rp 116 juta", "sensitivitas domain versi lama"],
  ["Rp 2,7 juta", "kebutuhan modal versi lama"],
  ["Rp 1,6 juta", "kebutuhan modal versi lama"],
  ["8.479.031.890", "margin per paket versi lama"],
  ["163.815.186", "biaya per paket versi lama"],
  ["Rp 8,48 miliar", "margin total versi lama"],
  ["2.443", "rekrut churn 2% versi salah"],
  ["216", "rekrut 2027 versi salah"],
];

/**
 * Angka yang BOLEH muncul maksimal sekali, di bagian yang SENDIRI menjelaskan
 * koreksinya. Tanpa pengecualian ini, dokumentasi tentang kesalahan tidak
 * bisa ditulis sama sekali.
 */
const BOLEH_SATU_KALI = [
  ["2.599", "rekrut versi salah"],
  ["8.690.492.291", "margin sebelum add-on legalitas"],
  ["43.739.778", "PPh khusus langganan"],
  ["166.070.251", "infrastruktur versi lama"],
  ["Rp 320 juta", "selisih Rezim A/B versi lama"],
  ["Rp 1.543.011", "kas terendah versi lama"],
];

for (const [teks, apakah] of KEDALUWARSA) {
  const n = DOC.split(teks).length - 1;
  catat(
    `Angka lama "${teks}" tidak jadi nilai (${apakah})`,
    n === 0,
    `masih muncul ${n}x`,
  );
}
for (const [teks, apakah] of BOLEH_SATU_KALI) {
  const n = DOC.split(teks).length - 1;
  catat(
    `"${teks}" muncul maksimal sekali (${apakah})`,
    n <= 1,
    `muncul ${n}x, boleh maksimal 1 di bagian yang menjelaskan koreksi`,
  );
}

// --- Struktur dokumen ------------------------------------------------------
const barisMargin = DOC.split("\n").filter((l) => /^\| \d{1,2} 20\d{2} \|/.test(l));
catat("Tabel margin punya 51 baris", barisMargin.length === 51, `ditemukan ${barisMargin.length}`);

const barisInfra = DOC.split("\n").filter((l) =>
  /^\| (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) 20\d{2} \|/.test(l),
);
catat("Tabel infrastruktur punya 51 baris", barisInfra.length === 51, `ditemukan ${barisInfra.length}`);

// Kolom pelanggan tidak boleh 0 di Okt 2026: itu tanda penghitungan
// dilakukan SEBELUM rekrut bulan itu dijumlahkan.
const oktMargin = DOC.split("\n").find((l) => l.startsWith("| 10 2026 |"));
const oktInfra = DOC.split("\n").find((l) => l.startsWith("| Okt 2026 |"));
catat(
  "Okt 2026: kolom pelanggan bukan 0 di kedua tabel",
  !!oktMargin && !!oktInfra &&
    !/^\| 10 2026 \| 0 /.test(oktMargin) &&
    !/^\| Okt 2026 \| 0 \|/.test(oktInfra),
  `margin: ${oktMargin ?? "(tak ada)"}\n         infra:  ${oktInfra ?? "(tak ada)"}`,
);

// Tidak boleh ada karakter CJK. Beberapa versi dokumen pernah memuatnya dan
// luput karena tidak ada yang membaca sampai bawah.
const cjk = [...new Set([...DOC].filter((ch) => /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\ufffd]/.test(ch)))];
catat("Dokumen bebas karakter CJK", cjk.length === 0, `ditemukan: ${cjk.join(" ")}`);

// Nomor bagian tidak boleh bentrok -- pernah terjadi saat menyisipkan bagian
// baru tanpa mengganti nomor bagian berikutnya.
const judul = [...DOC.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]));
const duplikat = [...new Set(judul.filter((n, i) => i > 0 && n === judul[i - 1]))];
catat("Nomor bagian tidak bentrok", duplikat.length === 0, `duplikat: ${duplikat.join(", ")}`);

// Tautan internal harus menunjuk ke bagian yang benar-benar ada.
const tautan = [...new Set([...DOC.matchAll(/\(#(\d+)-/g)].map((m) => Number(m[1])))];
const takAda = tautan.filter((n) => !judul.includes(n));
catat("Tautan internal menunjuk ke bagian yang ada", takAda.length === 0, `tak ada: ${takAda.join(", ")}`);

// Harga paket di dokumen harus sama dengan plans.ts.
const plans = readFileSync(join(ROOT, "src/lib/plans.ts"), "utf8");
const hargaPlans = [...plans.matchAll(/monthly:\s*([\d_]+)/g)].map((m) => Number(m[1].replace(/_/g, "")));
for (const h of hargaPlans) {
  catat(
    `Harga paket Rp ${h.toLocaleString("id-ID")} ada di proyeksi`,
    DOC.includes(h.toLocaleString("id-ID")),
    "harga di plans.ts tidak disebut di dokumen proyeksi",
  );
}

// ===========================================================================
// LAPORAN
// ===========================================================================
let gagal = 0;
console.log("PEMERIKSAAN KONSISTENSI docs/proyeksi-revenue.md");
console.log("=".repeat(78));
for (const c of cek) {
  if (!c.lulus) gagal++;
  console.log(
    `${c.lulus ? "  ok  " : " GAGAL "} ${c.nama.padEnd(30)} model ${String(c.model).padStart(18)}   dokumen ${String(c.dok).padStart(18)}`,
  );
}
console.log("-".repeat(78));
for (const c of hasil) {
  if (!c.lulus) gagal++;
  const pesan = c.lulus ? "" : "  -> " + c.pesan;
  console.log(`${c.lulus ? "  ok  " : " GAGAL "} ${c.nama}${pesan}`);
}
console.log("=".repeat(78));

if (gagal > 0) {
  console.log(`\n${gagal} pemeriksaan GAGAL.\n`);
  console.log("Penyebabnya salah satu dari dua, dan skrip tidak bisa memilih:");
  console.log("  1. Model di scripts/check-projection.mjs tertinggal. Perbarui");
  console.log("     konstanta di bagian atas skrip.");
  console.log("  2. Dokumen punya klausul yang tertinggal dari versi lama.");
  console.log("     Cari yang GAGAL, perbarui klausulnya.");
  process.exitCode = 1;
} else {
  console.log(`\nSemua ${cek.length + hasil.length} pemeriksaan lulus.`);
}
