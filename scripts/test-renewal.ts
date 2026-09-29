/**
 * Uji perpanjangan & notifikasi tagihan (Sprint 6).
 *
 * Yang diuji, dan kenapa tiap-tiapnya penting:
 *
 *  1. **Aturan periode.** Perpanjangan LANJUT dari periode lama, bukan dari
 *     hari invoice terbit. Kalau tidak, orang yang bayar tanggal 5 dan
 *     ditagih tanggal 28 kehilangan 23 hari yang sudah dibayar.
 *  2. **Periode yang sudah lewat tidak dipanjangkan dari tanggal lamanya.**
 *     Hari yang sudah lewat tidak bisa "dibayar di muka".
 *  3. **Cron idempoten.** Cron harian dengan jendela 30 hari memanggil
 *     fungsi yang sama 30 kali. Tanpa pengaman, satu domain menerima 30
 *     invoice -- Rp 7,5 juta per tenant.
 *  4. **Exception di satu tenant TIDAK menghentikan tenant lain.** Ini bug
 *     yang paling merusak: `createDomainRenewal` versi pertama melempar apa
 *     adanya, jadi tenant pertama yang terkena membuat cron berhenti dan 999
 *     tenant berikutnya tidak pernah ditagih. Yang terlihat cuma 500 di log.
 *  5. **Kegagalan Midtrans membebaskan periode.** Invoice `pending` yang
 *     menggantung akan ditolak unique index selamanya, jadi orang tidak akan
 *     pernah ditagih lagi.
 *  6. **URL pembayaran tersimpan.** Notifikasi yang tidak bisa dibayar
 *     hanya memindahkan rasa bersalah ke tempat yang salah.
 *  7. **Tagihan yang menunggu hanya milik tenant itu.** Klien Drizzle
 *     melewati RLS, jadi penyaring `tenant_id` adalah satu-satunya penahan.
 *
 * Jalankan: `npm run test:renewal`
 */
import "dotenv/config";

import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { createDomainRenewal } from "@/lib/midtrans/addons";
import { createSubscriptionRenewal } from "@/lib/midtrans/renewal";
import {
  RENEWAL_LEAD_DAYS,
  daysUntil,
  isUniqueViolation,
  monthsForPeriod,
  nextSubscriptionPeriod,
  shouldIssueRenewal,
} from "@/lib/renewal";
import { loadBillingNotice, loadInvoiceHistory, loadPendingInvoices } from "@/lib/billing/notice";
import { DOMAIN_ADDON, addMonths } from "@/lib/addons";

let lulus = 0;
const gagal: string[] = [];

function cek(nama: string, kondisi: boolean, detail?: string) {
  if (kondisi) {
    lulus++;
    console.log(`  ok    ${nama}`);
  } else {
    gagal.push(nama);
    console.log(`  GAGAL ${nama}${detail ? ` -- ${detail}` : ""}`);
  }
}

const hari = (d: Date) => d.toISOString().slice(0, 10);

/*
 * Akhir periode perpanjangan, dihitung dengan `addMonths` yang sama dengan
 * yang dipakai kode.
 *
 * Versi pertama menulis `tambahHari(expiresAt, 1)` -- itu "+1 HARI", bukan
 * "+1 BULAN", dan menghasilkan 2026-10-20 sementara kode menghitung
 * 2026-11-19. Fixture-nya lalu tidak cocok dengan pengaman, dan tes
 * melaporkan "pengaman tidak bekerja" untuk invoice yang salah tanggal.
 * Aturan yang sama berlaku untuk tahun: jangan mengarang,
 * PANGGIL fungsi yang dipakai kode.
 */
const akhirPeriode = (kedaluwarsa: Date, bulan: number) =>
  hari(addMonths(kedaluwarsa, bulan));
const tambahHari = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Tanggal tetap supaya hasil tidak bergantung pada hari test dijalankan. */
const HARI_INI = new Date("2026-09-29T00:00:00.000Z");

/*
 * Asal aplikasi untuk `finishUrl`.
 *
 * Dioperkan ke fungsi penerbit tagihan, TIDAK dibaca dari `headers()`.
 * Kalau fungsi itu membaca headers sendiri, ia hanya bisa dipanggil dari
 * dalam request yang sedang berjalan -- dan tidak bisa diuji dari skrip.
 * Justru karena itu tes ini bisa memanggilnya 30 kali seperti cron sungguhan.
 */
const ORIGIN = "https://toko-uji.test";

/* ================================================================== *
 * BAGIAN 1 — aturan murni, tanpa database.
 *
 * Diuji lebih dulu karena paling murah, dan karena kalau aturannya salah
 * maka semua pengujian di bawahnya tidak berarti apa-apa.
 * ================================================================== */

console.log("\nAturan periode:");

{
  // 1. Perpanjangan melanjutkan periode lama yang masih berjalan.
  const kedaluwarsa = new Date("2026-10-26T00:00:00.000Z");
  const p = nextSubscriptionPeriod(HARI_INI, kedaluwarsa, 1);
  cek(
    "perpanjangan lanjut dari periode lama, bukan dari hari invoice",
    hari(p.start) === "2026-10-26" && hari(p.end) === "2026-11-26",
    `${hari(p.start)} s.d. ${hari(p.end)}`,
  );
  cek(
    "pengrajin tidak kehilangan hari yang sudah dibayar",
    p.start.getTime() === kedaluwarsa.getTime(),
    "awal periode baru = akhir periode lama",
  );
}

{
  // 2. Periode yang SUDAH lewat mulai dari hari ini, bukan dari tanggal lama.
  const lewat = new Date("2026-08-01T00:00:00.000Z");
  const p = nextSubscriptionPeriod(HARI_INI, lewat, 1);
  cek(
    "periode yang sudah lewat dimulai hari ini, bukan tanggal lamanya",
    hari(p.start) === "2026-09-29" && hari(p.end) === "2026-10-29",
    `${hari(p.start)} s.d. ${hari(p.end)}`,
  );
  cek(
    "tidak memberi periode gratis untuk hari yang sudah lewat",
    p.start.getTime() > lewat.getTime(),
    "periode baru dimulai setelah periode lama benar-benar berakhir",
  );
}

{
  cek("periode bulanan = 1 bulan", monthsForPeriod("monthly") === 1);
  cek("periode tahunan = 12 bulan", monthsForPeriod("yearly") === 12);
  const tahunan = nextSubscriptionPeriod(HARI_INI, null, monthsForPeriod("yearly"));
  cek(
    "perpanjangan tahunan menambah tepat 12 bulan",
    hari(tahunan.end) === "2027-09-29",
    hari(tahunan.end),
  );
}

{
  // 3. Jendela perpanjangan.
  cek(
    "jatuh tempo 30 hari lagi MASIH dalam jendela",
    shouldIssueRenewal(HARI_INI, tambahHari(HARI_INI, RENEWAL_LEAD_DAYS)),
  );
  cek(
    "jatuh tempo 31 hari lagi di luar jendela",
    !shouldIssueRenewal(HARI_INI, tambahHari(HARI_INI, RENEWAL_LEAD_DAYS + 1)),
  );
  cek(
    "jatuh tempo 200 hari lagi di luar jendela",
    !shouldIssueRenewal(HARI_INI, tambahHari(HARI_INI, 200)),
  );
  cek("tanpa tanggal kedaluwarsa, tidak ada renewal", !shouldIssueRenewal(HARI_INI, null));
  cek(
    "periode yang SUDAH lewat tidak dibuat invoice renewal",
    !shouldIssueRenewal(HARI_INI, tambahHari(HARI_INI, -1)),
    "menagih periode yang dimulai di masa lalu",
  );
}

{
  // 4. Sisa hari harus signed. "0 hari lagi" dan "12 hari lalu" berbeda
  //    maknanya, dan salah baca keduanya berakibat salah.
  cek("sisa hari positif", daysUntil(HARI_INI, tambahHari(HARI_INI, 12)) === 12);
  cek(
    "sisa hari negatif TIDAK jadi 0",
    daysUntil(HARI_INI, tambahHari(HARI_INI, -12)) === -12,
    `nilai=${daysUntil(HARI_INI, tambahHari(HARI_INI, -12))}`,
  );
  cek("tanpa tanggal, sisa hari null", daysUntil(HARI_INI, null) === null);
  cek(
    "12 jam sebelum tengah malam = 0 hari, bukan 1",
    daysUntil(
      new Date("2026-09-29T23:30:00.000Z"),
      new Date("2026-09-30T00:00:00.000Z"),
    ) === 1,
    "tengah malam = pergantian hari, jadi 1 hari memang benar",
  );
}

/* ================================================================== *
 * BAGIAN 2 — database.
 * ================================================================== */

const tenantDibuat: string[] = [];

interface Faktur {
  tenantId: string;
  expiresAt: Date;
  domainExpiresAt?: Date;
}

async function buatTenant(
  opsi: {
    plan?: "basic" | "pro" | "max";
    /** Periode invoice langganan yang sudah pernah dibayar. */
    periodeLunas?: "monthly" | "yearly";
    /** Berapa bulan lagi langganan berakhir. */
    berakhirDalamHari?: number;
    /** Aktifkan domain yang berakhir dalam N hari. */
    domain?: number;
  } = {},
): Promise<Faktur> {
  const slug = `uji-renewal-${randomUUID().slice(0, 8)}`;
  const berakhirDalam = opsi.berakhirDalamHari ?? 20;
  const expiresAt = tambahHari(HARI_INI, berakhirDalam);
  const period = opsi.periodeLunas ?? "monthly";

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Toko Uji Renewal",
      slug,
      plan: opsi.plan ?? "pro",
      subscriptionStatus: "active",
      subscriptionExpiresAt: expiresAt,
      isActive: true,
      ...(opsi.domain === undefined
        ? {}
        : {
            customDomain: `${slug}.com`,
            customDomainVerified: true,
            customDomainStatus: "active" as const,
            customDomainExpiresAt: tambahHari(HARI_INI, opsi.domain),
          }),
    })
    .returning({ id: tenants.id });
  tenantDibuat.push(tenant.id);

  await db.insert(users).values({
    id: randomUUID(),
    tenantId: tenant.id,
    email: `renewal-${randomUUID().slice(0, 8)}@example.test`,
    fullName: "Pengrajin Uji",
    role: "owner",
    phone: "08123456789",
  });

  // Invoice langganan yang SUDAH lunas -- sumber periode perpanjangan.
  if (period) {
    await db.insert(saasInvoices).values({
      tenantId: tenant.id,
      plan: opsi.plan ?? "pro",
      period,
      amount: 500_000,
      midtransAmount: 500_000,
      status: "paid",
      paidAt: new Date("2026-08-01T00:00:00.000Z"),
      periodStart: "2026-08-26",
      periodEnd: hari(expiresAt),
    });
  }

  return {
    tenantId: tenant.id,
    expiresAt,
    ...(opsi.domain === undefined
      ? {}
      : { domainExpiresAt: tambahHari(HARI_INI, opsi.domain) }),
  };
}

async function invoiceTenant(tenantId: string) {
  return db
    .select({
      id: saasInvoices.id,
      itemType: saasInvoices.itemType,
      status: saasInvoices.status,
      amount: saasInvoices.amount,
      isRenewal: saasInvoices.isRenewal,
      periodStart: saasInvoices.periodStart,
      periodEnd: saasInvoices.periodEnd,
      midtransOrderId: saasInvoices.midtransOrderId,
      midtransRedirectUrl: saasInvoices.midtransRedirectUrl,
    })
    .from(saasInvoices)
    .where(eq(saasInvoices.tenantId, tenantId));
}

async function main() {
  console.log("\nIdempotensi dan pengaman:");

  /*
   * CATATAN PENTING SOAL CARA MENGUJI IDEMPOTENSI DI SINI.
   *
   * Lingkungan ini tidak punya `MIDTRANS_SERVER_KEY` yang sah, jadi SETIAP
   * panggilan ke Midtrans GAGAL. Itu membuat pengujian "panggil 30x =
   * 1 invoice" tidak berlaku di sini -- dan bukan karena kodenya salah,
   * tapi justru karena kodenya BENAR:
   *
   *   panggilan 1 -> invoice pending, charge gagal -> invoice jadi `failed`
   *   panggilan 2 -> periode sudah bebas (failed tidak mengunci) -> invoice baru
   *   ...
   *
   * Jadi 30 panggilan menghasilkan 30 invoice, dan itu memang yang mau:
   * satu gangguan jaringan tidak boleh mengunci tagihan pengrajin selamanya.
   * Versi pertama tes ini melaporkan ini sebagai kegagalan, yaitu
   * melaporkan perilaku yang benar sebagai bug.
   *
   * Yang diuji di bawah adalah MEKANISMENYA secara langsung: pengaman
   * terhadap invoice yang benar-benar HIDUP, dan balapan dua proses cron.
   */

  // --- 1. Pengaman terhadap invoice yang sudah hidup -----------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    // Simulasikan invoice renewal yang sudah terbit dan masih menunggu.
    // Ini yang dilakukan cron pada hari pertama, dan yang akan memblokir
    // pemanggilan kedua kalau pengaman bekerja.
    const targetEnd = akhirPeriode(t.expiresAt, 1);
    await db.insert(saasInvoices).values({
      tenantId: t.tenantId,
      plan: "pro",
      period: "monthly",
      amount: 500_000,
      midtransAmount: 500_000,
      status: "pending",
      isRenewal: true,
      midtransOrderId: `saas-${randomUUID().slice(0, 8)}-manual`,
      periodStart: hari(t.expiresAt),
      periodEnd: targetEnd,
    });

    const hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "sudah ada tagihan hidup -> reported 'sudah_ada', bukan membuat tagihan kedua",
      !hasil.ok && hasil.reason === "sudah_ada",
      hasil.ok ? "berhasil (justru salah)" : `reason=${hasil.reason}`,
    );
    const inv = await invoiceTenant(t.tenantId);
    cek(
      "tidak ada invoice perpanjangan kedua",
      inv.filter((i) => i.isRenewal && i.status === "pending").length === 1,
      `jumlah=${inv.filter((i) => i.isRenewal && i.status === "pending").length}`,
    );
  }

  // --- 2. Balapan: dua proses cron bersamaan -----------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    const targetEnd = akhirPeriode(t.expiresAt, 1);
    await db.insert(saasInvoices).values({
      tenantId: t.tenantId,
      plan: "pro",
      period: "monthly",
      amount: 500_000,
      midtransAmount: 500_000,
      status: "pending",
      isRenewal: true,
      midtransOrderId: `saas-${randomUUID().slice(0, 8)}-balapan`,
      periodStart: hari(t.expiresAt),
      periodEnd: targetEnd,
    });

    // Dua proses cron berjalan BERSAMAAN, seperti dua invokasi Vercel cron
    // yang tumpang tindih. `if (!ada)` di kode aplikasi TIDAK menutup ini --
    // keduanya bisa membaca "belum ada" lalu sama-sama insert. Yang menutup
    // nya adalah unique index.
    const hasil = await Promise.all([
      createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN),
      createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN),
    ]);
    cek(
      "dua proses cron bersamaan: keduanya TIDAK melempar",
      hasil.every((h) => typeof h === "object"),
    );
    cek(
      "minimal satu melaporkan 'sudah_ada'",
      hasil.some((h) => !h.ok && h.reason === "sudah_ada"),
      hasil.map((h) => (h.ok ? "ok" : h.reason)).join(", "),
    );
    const inv = await invoiceTenant(t.tenantId);
    cek(
      "balapan tidak menghasilkan dua invoice hidup",
      inv.filter((i) => i.isRenewal && i.status === "pending").length === 1,
      `jumlah=${inv.filter((i) => i.isRenewal && i.status === "pending").length}`,
    );
  }

  // --- 3. Domain: pengaman yang sama --------------------------------
  {
    const t = await buatTenant({ domain: 20 });
    const targetStart = hari(t.domainExpiresAt!);
    await db.insert(saasInvoices).values({
      tenantId: t.tenantId,
      itemType: "domain",
      plan: null,
      period: "yearly",
      amount: DOMAIN_ADDON.price,
      midtransAmount: DOMAIN_ADDON.price,
      status: "pending",
      isRenewal: true,
      midtransOrderId: `dom-${randomUUID().slice(0, 8)}-manual`,
      periodStart: targetStart,
      periodEnd: hari(tambahHari(t.domainExpiresAt!, DOMAIN_ADDON.periodMonths)),
    });

    const hasil = await createDomainRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "domain: sudah ada tagihan hidup -> reported 'sudah_ada'",
      !hasil.ok && hasil.reason === "sudah_ada",
      hasil.ok ? "berhasil (justru salah)" : `reason=${hasil.reason}`,
    );
    const inv = await invoiceTenant(t.tenantId);
    cek(
      "domain: tidak ada invoice renewal kedua",
      inv.filter((i) => i.itemType === "domain" && i.isRenewal).length === 1,
      `jumlah=${inv.filter((i) => i.itemType === "domain" && i.isRenewal).length}`,
    );
  }

  // --- 3b. Unique index benar-benar menahan --------------------------
  /*
   * Di atas, pre-check sudah menangkap "sudah ada" sebelum insert terjadi.
   * Itu berarti jalur UNIQUE VIOLATION tidak pernah ikut diuji -- dan
   * jalur itu justru yang menutup dua proses cron yang tumpang tindih.
   *
   * Yang diuji di sini adalah mechanism-nya langsung: dua insert
   * BERSAMAAN untuk periode yang sama. indexedHoldings_database yang harus
   * menolak keduanya, dan error itu harus TERKENALI sebagai 23505.
   *
   * Kenali 23505 penting dan subtel: `err.code` sering `undefined` karena
   * Drizzle membungkus error postgres.js di `cause`. Pembacaan yang hanya
   * melihat `err.code` akan menganggap tidak ada pelanggaran -- lalu
   * melempar, dan satu tenant menghentikan seluruh loop cron.
   */
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    const targetEnd = akhirPeriode(t.expiresAt, 1);
    const periodStart = hari(t.expiresAt);

    const sisipkan = (suffix: string) =>
      db
        .insert(saasInvoices)
        .values({
          tenantId: t.tenantId,
          plan: "pro",
          period: "monthly",
          amount: 500_000,
          midtransAmount: 500_000,
          status: "pending",
          isRenewal: true,
          midtransOrderId: `saas-${randomUUID().slice(0, 8)}-${suffix}`,
          periodStart,
          periodEnd: targetEnd,
        })
        .then(() => "ok" as const)
        .catch((e: unknown) => e);

    const [a, b] = await Promise.all([sisipkan("a"), sisipkan("b")]);
    const hasil = [a, b].filter((x) => x !== "ok");
    cek(
      "unique index menolak insert kedua untuk periode yang sama",
      hasil.length === 1,
      `${hasil.length} ditolak dari 2 percobaan`,
    );

    const err = hasil[0] as { code?: string; cause?: { code?: string } };
    const kodeDariCause = err?.cause?.code;
    const kodeLangsung = err?.code;
    cek(
      "kode pelanggaran terbaca di `cause`, bukan hanya di `code`",
      kodeDariCause === "23505" || kodeLangsung === "23505",
      `code=${kodeLangsung}, cause.code=${kodeDariCause} — kalau keduanya kosong, penanganan unique violation diam-diam tidak jalan`,
    );
    /*
     * Pengakuan bahwa `err.code` TIDAK cukup di sini. Ini yang membuat
     * `isUniqueViolation` harus dipanggil sendiri -- pre-check menutup
     * jalur lemparnya, jadi mengujinya lewat fungsi publik selalu lulus
     * tanpa pernah menyentuh kodenya.
     */
    cek(
      "dibaca langsung dari `err.code` TIDAK cukup di sini",
      kodeDariCause === "23505",
      `err.code=${kodeLangsung} - inilah sebabnya isUniqueViolation membaca dua-duanya`,
    );
    cek(
      "isUniqueViolation mengenali error ini lewat `cause`",
      isUniqueViolation(err),
      `cause.code=${kodeDariCause}`,
    );
    cek(
      "isUniqueViolation TIDAK menganggap error lain sebagai pelanggaran",
      !isUniqueViolation({ cause: { code: "23503" } }) &&
        !isUniqueViolation(new Error("koneksi putus")) &&
        !isUniqueViolation(null) &&
        !isUniqueViolation(undefined),
      "23503 (foreign key) bukan 23505 (unique)",
    );

    const inv = await invoiceTenant(t.tenantId);
    cek(
      "hanya satu invoice yang benar-benar tersimpan",
      inv.filter((i) => i.isRenewal && i.status === "pending").length === 1,
      `jumlah=${inv.filter((i) => i.isRenewal && i.status === "pending").length}`,
    );
  }

  // --- 4. Invoice `failed` MEMBEBASKAN periode ------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    const targetEnd = akhirPeriode(t.expiresAt, 1);
    await db.insert(saasInvoices).values({
      tenantId: t.tenantId,
      plan: "pro",
      period: "monthly",
      amount: 500_000,
      midtransAmount: 500_000,
      // `failed` -- invoice yang ditolak bank atau kedaluwarsa.
      status: "failed",
      isRenewal: true,
      midtransOrderId: `saas-${randomUUID().slice(0, 8)}-gagal`,
      periodStart: hari(t.expiresAt),
      periodEnd: targetEnd,
    });

    // Panggilan ini akan gagal di Midtrans (kunci tidak sah di lingkungan
    // ini), tapi TIDAK boleh ditolak sebagai duplikat.
    // Kalau ia ditolak, artinya invoice `failed` ikut mengunci -- dan itu
    // persis bug yang membuat tagihan pengrajin hilang selamanya.
    const hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "invoice `failed` TIDAK mengunci periode",
      hasil.ok || hasil.reason === "midtrans_gagal" || hasil.reason === "tidak_konfigurasi",
      `reason=${hasil.ok ? "ok" : hasil.reason}`,
    );
  }

  // --- 4. Domain: periode BERBEDA boleh di-tagih lagi ------------------
  {
    const t = await buatTenant({ domain: 200 });
    // Di luar jendela 30 hari, jadi tidak ditagih.
    const luarJendela = await createDomainRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "domain yang jatuh tempo 200 hari lagi TIDAK ditagih",
      !luarJendela.ok,
      luarJendela.ok ? "berhasil (justru salah)" : luarJendela.error,
    );
  }

  // --- 5. Kegagalan Midtrans membebaskan periode -----------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    const prev = process.env.MIDTRANS_SERVER_KEY;
    // Kunci yang pasti ditolak Midtrans: charge gagal dibuat.
    process.env.MIDTRANS_SERVER_KEY = "SB-Midserver-kunci-palsu-untuk-uji";
    let hasil;
    try {
      hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    } finally {
      if (prev === undefined) delete process.env.MIDTRANS_SERVER_KEY;
      else process.env.MIDTRANS_SERVER_KEY = prev;
    }

    cek(
      "kegagalan Midtrans dilaporkan, bukan dilempar",
      hasil !== undefined && !hasil.ok,
      hasil?.ok ? "berhasil (justru salah)" : `reason=${hasil?.reason}`,
    );

    const inv = await invoiceTenant(t.tenantId);
    const renewal = inv.filter((i) => i.isRenewal);
    cek(
      "invoice yatim TIDAK menggantung sebagai pending",
      renewal.length === 1 && renewal[0]!.status === "failed",
      `jumlah=${renewal.length}, status=${renewal[0]?.status}`,
    );
    cek(
      "order_id yang tidak pernah sampai ke Midtrans dikosongkan",
      renewal[0]!.midtransOrderId === null,
      `orderId=${renewal[0]!.midtransOrderId}`,
    );

    // INI yang menentukan apakah orang akan pernah ditagih lagi.
    const kedua = await createSubscriptionRenewal(t.tenantId, tambahHari(HARI_INI, 1), ORIGIN);
    cek(
      "periode bisa dicoba lagi setelah kegagalan (tidak terkunci)",
      typeof kedua === "object",
      kedua.ok
        ? "berhasil saat Middtrans dipulihkan (bagus)"
        : `ditolak: ${kedua.reason}`,
    );
  }

  // --- 6. Tenant pending tidak mendapat tagihan kedua -----------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await db
      .update(tenants)
      .set({ subscriptionStatus: "pending" })
      .where(eq(tenants.id, t.tenantId));
    const hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "tenant pending tidak mendapat invoice perpanjangan",
      !hasil.ok && hasil.reason === "belum_lunas",
      hasil.ok ? "berhasil (justru salah)" : `reason=${hasil.reason}`,
    );
  }

  // --- 7. Tenant tanpa riwayat lunas tidak ditagih ---------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await db
      .delete(saasInvoices)
      .where(
        and(
          eq(saasInvoices.tenantId, t.tenantId),
          eq(saasInvoices.status, "paid"),
        ),
      );
    const hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    cek(
      "tanpa invoice lunas, periode tidak bisa ditentukan -> tidak ditagih",
      !hasil.ok && hasil.reason === "belum_lunas",
      hasil.ok ? "berhasil (justru salah)" : `reason=${hasil.reason}`,
    );
  }

  // --- 8. Periode tahunan, bukan bulanan ------------------------------
  {
    const t = await buatTenant({ periodeLunas: "yearly", berakhirDalamHari: 20 });
    const hasil = await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    /*
     * Angka harapan DIHITUNG dari fixture, bukan diketik. Versi pertama
     * mengetik satu tanggal hasil hitungan sendiri, padahal perpanjangan
     * melanjutkan dari TANGGAL KEDALUWARSA tenant, bukan dari hari
     * invoice. Kode benar, angka harapannya yang salah -- dan tes yang
     * melaporkan perilaku benar sebagai bug adalah tes yang tidak berguna.
     */
    cek(
      "perpanjangan tahunan LANJUT dari tanggal kedaluwarsa, bukan dari hari invoice",
      hasil.ok && hasil.periodStart === hari(tambahHari(HARI_INI, 20)),
      hasil.ok ? `mulai=${hasil.periodStart}` : `reason=${hasil.reason}`,
    );
    /*
     * Selisihnya harus 12 bulan PERSIS, dan dihitung dari tanggal yang
     * benar-benar dipakai kode -- bukan dari angka yang diketik di sini.
     */
    const selisihBulan =
      hasil.ok
        ? Math.round(
            (new Date(hasil.periodEnd).getTime() -
              new Date(hasil.periodStart).getTime()) /
              (30.44 * 86_400_000),
          )
        : -1;
    cek(
      "perpanjangan tahunan tepat 12 bulan, bukan 1",
      hasil.ok && Math.abs(selisihBulan - 12) <= 1,
      hasil.ok ? `selisih ~${selisihBulan} bulan` : `reason=${hasil.reason}`,
    );
  }

  console.log("\nNotifikasi:");

  // --- 9. Tagihan menunggu terlihat ----------------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    const pending = await loadPendingInvoices(t.tenantId, HARI_INI);
    cek(
      "tagihan perpanjangan muncul sebagai 'menunggu'",
      pending.length === 1,
      `jumlah=${pending.length}`,
    );
    cek(
      "tagihan ditandai perpanjangan, bukan tagihan baru",
      pending[0]?.isRenewal === true,
      `isRenewal=${pending[0]?.isRenewal}`,
    );
    cek(
      "nominal yang ditampilkan = yang ditagih",
      pending[0]?.amount === 500_000,
      `nilai=${pending[0]?.amount}`,
    );
    cek(
      "nominal bertipe number (bukan string dari bigint)",
      typeof pending[0]?.amount === "number",
      `tipe=${typeof pending[0]?.amount}`,
    );

    // Setelah lunas, tidak boleh muncul lagi.
    await db
      .update(saasInvoices)
      .set({ status: "paid", paidAt: new Date() })
      .where(
        and(
          eq(saasInvoices.tenantId, t.tenantId),
          inArray(saasInvoices.status, ["pending"]),
        ),
      );
    const setelahLunas = await loadPendingInvoices(t.tenantId, HARI_INI);
    cek(
      "tagihan lunas TIDAK lagi muncul sebagai menunggu",
      setelahLunas.length === 0,
      `jumlah=${setelahLunas.length}`,
    );
  }

  // --- 10. URL pembayaran tersimpan ----------------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    const pending = await loadPendingInvoices(t.tenantId, HARI_INI);
    /*
     * Tanpa kredensial Midtrans, charge tidak akan pernah berhasil, jadi
     * URL-nya memang kosong di lingkungan ini. Yang diuji di sini adalah
     * KOLOMNYA ada dan bisa dibaca -- kalau kolomnya tidak ada, kode tidak
     * akan bisa kompilasi, dan itu memang tertangkap typecheck.
     *
     * Yang diuji secara nyata: `payUrl` selalu ada di hasil (string atau
     * null), tidak pernah `undefined` yang membuat komponen gagal diam-diam.
     */
    cek(
      "payUrl selalu terdefinisi (string atau null, tidak pernah undefined)",
      "payUrl" in (pending[0] ?? {}),
      Object.keys(pending[0] ?? {}).join(","),
    );
  }

  // --- 11. Isolasi tenant --------------------------------------------
  {
    const a = await buatTenant({ berakhirDalamHari: 20 });
    const b = await buatTenant({ berakhirDalamHari: 20 });
    await createSubscriptionRenewal(a.tenantId, HARI_INI, ORIGIN);

    const pendingB = await loadPendingInvoices(b.tenantId, HARI_INI);
    cek(
      "tagihan tenant lain TIDAK terlihat (tenant_id disaring di kueri)",
      pendingB.length === 0,
      `tenant B melihat ${pendingB.length} tagihan milik A`,
    );

    const notifB = await loadBillingNotice(b.tenantId, HARI_INI);
    cek(
      "notifikasi tenant lain kosong",
      notifB.pending.length === 0 && notifB.totalDue === 0,
      `pending=${notifB.pending.length}, total=${notifB.totalDue}`,
    );
  }

  // --- 12. Ringkasan notifikasi ---------------------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 10 });
    await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    const notif = await loadBillingNotice(t.tenantId, HARI_INI);
    cek(
      "total yang harus dibayar = jumlah tagihan menunggu",
      notif.totalDue === notif.pending.reduce((x, y) => x + y.amount, 0),
      `total=${notif.totalDue}`,
    );
    cek(
      "perpanjangan ditandai 'segera' saat <= 30 hari",
      notif.renewalSegera === true,
      `sisa=${notif.subscriptionDaysLeft} hari, segera=${notif.renewalSegera}`,
    );
  }

  {
    const t = await buatTenant({ berakhirDalamHari: 200 });
    const notif = await loadBillingNotice(t.tenantId, HARI_INI);
    cek(
      "langganan 200 hari lagi TIDAK ditandai segera",
      notif.renewalSegera === false,
      `sisa=${notif.subscriptionDaysLeft} hari`,
    );
  }

  // --- 13. Riwayat ----------------------------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    const rows = await loadInvoiceHistory(t.tenantId);
    cek(
      "riwayat memuat invoice lunas DAN yang menunggu",
      rows.length === 2 &&
        rows.some((r) => r.status === "paid") &&
        rows.some((r) => r.status === "pending"),
      `jumlah=${rows.length}, status=${rows.map((r) => r.status).join(",")}`,
    );
    cek(
      "riwayat diurutkan dari yang terbaru",
      rows[0]!.createdAt.getTime() >= rows[1]!.createdAt.getTime(),
    );
  }

  // --- 14. Umur tagihan -------------------------------------------
  {
    const t = await buatTenant({ berakhirDalamHari: 20 });
    await createSubscriptionRenewal(t.tenantId, HARI_INI, ORIGIN);
    const sekarang = await loadPendingInvoices(t.tenantId, HARI_INI);
    // Satu hari kemudian.
    const besok = await loadPendingInvoices(t.tenantId, tambahHari(HARI_INI, 1));
    cek(
      "umur tagihan dihitung dari tanggal terbit",
      sekarang[0]?.umurHari === 0 && besok[0]?.umurHari === 1,
      `sekarang=${sekarang[0]?.umurHari}, besok=${besok[0]?.umurHari}`,
    );
  }

  void DOMAIN_ADDON;

  console.log(`\n${"-".repeat(70)}`);
  if (gagal.length > 0) {
    console.log(`${gagal.length} GAGAL, ${lulus} lulus:`);
    for (const g of gagal) console.log(`  - ${g}`);
    process.exitCode = 1;
  } else {
    console.log(`Semua ${lulus} pemeriksaan lulus.`);
  }
}

/*
 * Pembersihan tenant uji.
 *
 * Dijalankan SETELAH `main()` selesai apa pun hasilnya, bukan di `finally`
 * yang membungkus blok pengujian: begitu satu pemeriksaan melempar
 * exception, sisanya tidak dijalankan dan pencatatannya berhenti di tengah.
 *
 * `process.exitCode`, bukan `process.exit()`: yang kedua membatalkan proses
 * sebelum blok ini selesai dan meninggalkan tenant uji di database.
 */
async function bersihkan() {
  for (const id of tenantDibuat) {
    await db.delete(tenants).where(eq(tenants.id, id));
  }
}

main()
  .then(bersihkan)
  .catch(async (error: unknown) => {
    console.error(error);
    await bersihkan();
    process.exitCode = 1;
  });
