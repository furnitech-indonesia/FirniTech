import "server-only";

import { and, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants } from "@/db/schema";
import { FEE_MASUK } from "@/lib/fees";

/**
 * Rekap pendapatan platform (Sprint 6).
 *
 * TIGA hal yang membedakannya dari "sejumlah angka dijumlahkan", dan ketiganya
 * adalah tempat rekap pendapatan biasanya salah:
 *
 * 1. **MRR bukan omzet.** MRR adalah pendapatan BERULANG yang dinormalisasi ke
 *    satu bulan. Invoice tahunan Rp 3.420.000 menambah Rp 285.000 ke MRR, bukan
 *    Rp 3.420.000. Kalau tidak dinormalisasi, bulan jatuh tempo tahunan terlihat
 *    seperti lonjakan pendapatan yang tidak terjadi.
 *
 * 2. **Legalitas bukan MRR.** Paket pendirian PT dibayar SEKALI. Kalau ikut
 *    dihitung, MRR naik Rp 500.000 setiap ada yang membeli lalu turun lagi
 *    sebulan kemudian -- terlihat seperti pertumbuhan yang sebenarnya tidak
 *    ada. Ditampilkan terpisah sebagai pendapatan sekali bayar.
 *
 * 3. **Periode tidak boleh dihitung dua kali.** Kalau seorang pelanggan
 *    membayar domain dua tahun berturut-turut, ada DUA invoice yang lunas.
 *    Menjumlahkan keduanya menghitung tahun yang belum dibayar. Jadi satu
 *    tenant dihitung sekali, memakai periode yang SEDANG berlaku.
 *
 * DASAR ANGKA: `saasInvoices.amount`, bukan harga di `plans.ts` atau
 * `addons.ts`. Invoice adalah snapshot harga saat itu, jadi rekap ini
 * mengukur apa yang benar-benar ditagih -- dan tetap benar setelah owner
 * mengubah harga lewat panel.
 */

const INVOICE_LUNAS = "paid" as const;

/**
 * Fee Midtrans per invoice.
 *
 * Dikenakan pada SETIAP tagihan yang lewat Midtrans -- langganan, add-on
 * domain, DAN paket pendirian PT. Ketiganya memanggil `createSaasCharge` yang
 * memanggil `createSnapCharge`, jadi ketiganya benar-benar kena fee.
 *
 * Yang TIDAK kena: tagihan pesanan pembeli, karena fee-nya dipotong dari
 * pengrajin (§2.C) dan bukan biaya platform.
 *
 * Fee untuk domain Add-on pernah tidak dihitung di
 * `docs/proyeksi-revenue.md` -- kelalaian Rp 4.332.431 dalam 4,2 tahun, yang
 * cukup kecil untuk lolos tanpa terlihat dan cukup nyata untuk tidak boleh
 * dituliskan sebagai gratis.
 */
export const FEE_PER_INVOICE = FEE_MASUK;

function bulanDalam(periode: "monthly" | "yearly"): number {
  return periode === "yearly" ? 12 : 1;
}

/** Kolomnya bertipe `date`; perbandingan dengan string yang bisa diurutkan. */
function hari(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type RevenueSummary = {
  /** Pendapatan berulang yang dinormalisasi ke satu bulan. */
  mrr: number;
  mrrLangganan: number;
  mrrDomain: number;

  /** Pendapatan sekali bayar bulan berjalan. BUKAN bagian dari MRR. */
  legalitasBulanIni: number;

  /** Kotor bulan berjalan, dipisah per jenis tagihan. */
  bulanIni: {
    langganan: number;
    domain: number;
    legalitas: number;
    total: number;
  };

  /** Biaya Midtrans bulan berjalan. */
  biayaGateway: number;
  /** Kotor bulan berjalan setelah dikurangi biaya gateway. */
  netBulanIni: number;

  jumlahInvoice: number;
  tenantDenganDomainAktif: number;
};

/**
 * Ringkasan pendapatan platform untuk panel admin.
 *
 * `sekarang` bisa dioper supaya batas periodenya bisa diuji tanpa menunggu
 * tanggal tertentu. MRR selalu bergantung pada "periode mana yang sedang
 * berlaku", jadi mengujinya tanpa kendali waktu tidak akan menguji apa pun.
 */
export async function loadRevenueSummary(
  sekarang: Date = new Date(),
): Promise<RevenueSummary> {
  const awalBulan = new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1),
  );

  /*
   * ---------------------------------------------------------------
   * 1. MRR — invoice yang periodenya SEDANG BERLAKU.
   * ---------------------------------------------------------------
   *
   * Syarat `period_start <= hari ini < period_end` inilah yang mencegah
   * invoice tahun depan ikut dihitung. Invoice yang lunas tapi periodenya
   * sudah lewat adalah ARTIKEL SEJARAH, bukan pendapatan berjalan.
   */
  const invoiceBerjalan = await db
    .select({
      tenantId: saasInvoices.tenantId,
      itemType: saasInvoices.itemType,
      period: saasInvoices.period,
      amount: saasInvoices.amount,
      periodEnd: saasInvoices.periodEnd,
    })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.status, INVOICE_LUNAS),
        sql`${saasInvoices.periodStart} <= ${hari(sekarang)}`,
        sql`${saasInvoices.periodEnd} > ${hari(sekarang)}`,
      ),
    );

  /*
   * Satu (tenant, jenis) dihitung SATU KALI.
   *
   * Pelanggan bisa punya lebih dari satu invoice berjalan: mereka membayar
   * tagihan tahunan sementara tagihan bulanan yang lalu masih aktif.
   * Jumlahkan keduanya berarti menghitung periode yang belum dibayar.
   *
   * Yang dipilih adalah `periodEnd` paling JAUH -- itu periode paling lama
   * yang sudah dibayar, jadi paling mencerminkan pendapatan berjalan.
   * Membandingkan `periodEnd`, bukan nominal per bulan: yang lebih besar belum
   * tentu periode lebih panjang.
   */
  const perTenantDanJenis = new Map<
    string,
    { periodEnd: string; perBulan: number }
  >();

  for (const inv of invoiceBerjalan) {
    const perBulan = inv.amount / bulanDalam(inv.period);
    const key = `${inv.tenantId}:${inv.itemType}`;
    const ada = perTenantDanJenis.get(key);
    if (!ada || inv.periodEnd > ada.periodEnd) {
      perTenantDanJenis.set(key, { periodEnd: inv.periodEnd, perBulan });
    }
  }

  let mrrLangganan = 0;
  let mrrDomain = 0;
  for (const [key, nilai] of perTenantDanJenis) {
    const jenis = key.slice(key.lastIndexOf(":") + 1);
    if (jenis === "subscription") mrrLangganan += nilai.perBulan;
    else if (jenis === "domain") mrrDomain += nilai.perBulan;
    // `legalitas` sengaja DILEWATI. Periodenya satu hari, jadi tidak mungkin
    // sedang berjalan; kalau sampai di sini, itu invoice sekali bayar yang
    // somehow belum lewat di hari yang sama -- bukan pendapatan berulang.
  }

  /*
   * ---------------------------------------------------------------
   * 2. Kotor bulan berjalan + biaya gateway.
   * ---------------------------------------------------------------
   */
  const lunasBulanIni = await db
    .select({
      itemType: saasInvoices.itemType,
      total: sql<number>`coalesce(sum(${saasInvoices.amount}), 0)::bigint`,
      jumlah: sql<number>`count(*)::bigint`,
    })
    .from(saasInvoices)
    .where(
      and(
        eq(saasInvoices.status, INVOICE_LUNAS),
        isNotNull(saasInvoices.paidAt),
        gte(saasInvoices.paidAt, awalBulan),
      ),
    )
    .groupBy(saasInvoices.itemType);

  const perJenis = new Map<string, { total: number; jumlah: number }>();
  for (const row of lunasBulanIni) {
    perJenis.set(String(row.itemType), {
      total: Number(row.total),
      jumlah: Number(row.jumlah),
    });
  }

  const langganan = perJenis.get("subscription")?.total ?? 0;
  const domain = perJenis.get("domain")?.total ?? 0;
  const legalitas = perJenis.get("legalitas")?.total ?? 0;
  const jumlahInvoice = [...perJenis.values()].reduce((a, b) => a + b.jumlah, 0);
  const biayaGateway = jumlahInvoice * FEE_PER_INVOICE;

  /*
   * `sql<number>` HANYA cast TypeScript -- postgres.js mengembalikan bigint
   * sebagai string, dan cast itu tidak mengubah apa pun saat runtime. Tanpa
   * `Number()` di sini, `tenantDenganDomainAktif` jadi `"1"` dan perbandingan
   * `=== 1` bernilai false meski angkanya benar. Sum dan count lain di berkas
   * ini sudah dibungkus `Number()`; yang ini sempat terlewat.
   */
  const [domainAktif] = await db
    .select({ total: sql<string>`count(*)::bigint` })
    .from(tenants)
    .where(
      and(
        eq(tenants.customDomainStatus, "active"),
        sql`${tenants.customDomainExpiresAt} > ${sekarang.toISOString()}`,
      ),
    );

  const total = langganan + domain + legalitas;

  return {
    mrr: mrrLangganan + mrrDomain,
    mrrLangganan,
    mrrDomain,
    legalitasBulanIni: legalitas,
    bulanIni: { langganan, domain, legalitas, total },
    biayaGateway,
    netBulanIni: total - biayaGateway,
    jumlahInvoice,
    tenantDenganDomainAktif: Number(domainAktif?.total ?? 0),
  };
}

/*
 * CATATAN: perbandingan tanggal di sini memakai `sql` template, bukan
 * helper `lte()`. Alasannya bukan didnt butuh: `lte()` membungkus nilai
 * sebagai parameter terikat, dan kolomnya bertipe `date` sementara
 * parameternya `string`. Postgres menerima keduanya, tapi `sql` template
 * dengan string ISO lebih aman karena urutannya bisa dibandingkan sebagai
 * TEKS -- dan kolom `date` memang disimpan sebagai `YYYY-MM-DD`.
 *
 * Kolom `timestamptz` (seperti `customDomainExpiresAt`) HARUS lewat
 * `toISOString()`. Mengirim objek `Date` ke `sql` template melempar
 * `ERR_INVALID_ARG_TYPE` dari driver -- bukan dari Postgres -- jadi pesannya
 * tidak menyiratkan apa pun soal tipe kolom.
 */
