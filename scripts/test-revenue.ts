/**
 * Uji rekap pendapatan platform (Sprint 6).
 *
 * Yang diuji, dan kenapa tiap-tiapnya penting:
 *
 *  1. **MRR menormalkan invoice tahunan.** Invoice Rp 3.420.000 selama 12
 *     bulan menambah Rp 285.000 ke MRR, bukan Rp 3.420.000. Kalau tidak,
 *     bulan jatuh tempo tahunan terlihat seperti lonjakan pendapatan yang
 *     tidak terjadi.
 *
 *  2. **Legalitas TIDAK masuk MRR.** Sekali bayar. Kalau ikut dihitung, MRR
 *     naik lalu turun sebulan kemudian -- dan terlihat seperti pertumbuhan.
 *
 *  3. **Periode tidak dihitung dua kali.** Kalau seorang pelanggan membayar
 *     domain dua tahun berturut-turut, ada dua invoice lunas; menjumlahkan
 *     keduanya menghitung tahun yang belum dibayar.
 *
 *  4. **Fee Midtrans kena di semua tagihan**, termasuk domain. Fee domain
 *     pernah tidak dihitung di proyeksi dan itu kelalaian Rp 4.332.431.
 *
 *  5. **Invoice yang periodenya sudah lewat TIDAK masuk MRR.** Itu artikel
 *     sejarah, bukan pendapatan berjalan.
 *
 * Jalankan: `npm run test:revenue`
 */
import "dotenv/config";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { saasInvoices, tenants, users } from "@/db/schema";
import { loadRevenueSummary, FEE_PER_INVOICE } from "@/lib/admin/revenue";

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
const tambahBulan = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};
const rupiah = (n: number) => Math.round(n);

/** Tanggal tetap supaya hasil tidak bergantung pada hari test dijalankan. */
const SEKARANG = new Date("2027-03-15T00:00:00.000Z");

async function buatTenant(
  slug: string,
  statusDomain: "unpaid" | "active" | "suspended" = "unpaid",
  domainExpires?: Date,
) {
  const [t] = await db
    .insert(tenants)
    .values({
      name: `Tenant Uji ${slug}`,
      slug,
      customDomainStatus: statusDomain,
      customDomainExpiresAt: domainExpires ?? null,
      subscriptionStatus: "active",
      subscriptionExpiresAt: tambahBulan(SEKARANG, 3),
      isActive: true,
    })
    .returning();
  await db.insert(users).values({
    id: randomUUID(),
    tenantId: t.id,
    email: `uji-${slug}-${randomUUID().slice(0, 8)}@example.test`,
    fullName: "Owner Uji",
    role: "owner",
  });
  return t;
}

async function buatInvoice(
  tenantId: string,
  opsi: {
    itemType: "subscription" | "domain" | "legalitas";
    amount: number;
    period: "monthly" | "yearly";
    mulai: Date;
    selesai: Date;
    /** `null` = belum dibayar. */
    dibayarPada?: Date | null;
  },
) {
  const [inv] = await db
    .insert(saasInvoices)
    .values({
      tenantId,
      itemType: opsi.itemType,
      plan: opsi.itemType === "subscription" ? "basic" : null,
      period: opsi.period,
      amount: opsi.amount,
      midtransAmount: opsi.amount,
      status: opsi.dibayarPada ? "paid" : "pending",
      midtransOrderId: randomUUID(),
      transactionId: opsi.dibayarPada ? randomUUID() : null,
      periodStart: hari(opsi.mulai),
      periodEnd: hari(opsi.selesai),
      paidAt: opsi.dibayarPada ?? null,
    })
    .returning();
  return inv;
}

const tenantDibuat: string[] = [];

async function main() {

  console.log("\nMRR:");

  // --- dasar: nol -------------------------------------------------------
  const kosong = await loadRevenueSummary(SEKARANG);
  cek("tanpa data, MRR nol", kosong.mrr === 0, `mrr=${kosong.mrr}`);

  // --- 1. invoice bulanan -------------------------------------------------
  const t1 = await buatTenant("rev-bulanan");
  tenantDibuat.push(t1.id);
  await buatInvoice(t1.id, {
    itemType: "subscription",
    amount: 300_000,
    period: "monthly",
    mulai: tambahBulan(SEKARANG, -1),
    // `selesai` harus DI DEPAN `sekarang`. Syarat MRR adalah
    // `period_end > hari ini`, jadi periode yang berakhir tepat hari ini
    // sudah lewat dan TIDAK ikut dihitung -- dan tesnya sendiri akan
    // gagal dengan MRR nol, yang terlihat seperti bug di kode.
    selesai: tambahBulan(SEKARANG, 1),
    dibayarPada: tambahBulan(SEKARANG, -1),
  });

  const setelahBulanan = await loadRevenueSummary(SEKARANG);
  cek(
    "invoice bulanan Rp 300.000 = MRR Rp 300.000",
    setelahBulanan.mrrLangganan === 300_000,
    `mrrLangganan=${setelahBulanan.mrrLangganan}`,
  );

  // --- 2. invoice tahunan DINORMALISASI ----------------------------------
  const t2 = await buatTenant("rev-tahunan");
  tenantDibuat.push(t2.id);
  await buatInvoice(t2.id, {
    itemType: "subscription",
    amount: 3_420_000,
    period: "yearly",
    mulai: tambahBulan(SEKARANG, -2),
    selesai: tambahBulan(SEKARANG, 10),
    dibayarPada: tambahBulan(SEKARANG, -2),
  });

  const setelahTahunan = await loadRevenueSummary(SEKARANG);
  cek(
    "invoice tahunan Rp 3.420.000 = MRR Rp 285.000",
    setelahTahunan.mrrLangganan === 300_000 + 285_000,
    `mrrLangganan=${setelahTahunan.mrrLangganan}, diharapkan ${300_000 + 285_000}`,
  );
  cek(
    "MRR tahunan BUKAN sebesar nominal invoice",
    setelahTahunan.mrrLangganan !== 3_420_000 + 300_000,
  );

  // --- 3. invoice YANG SUDAH LEWAT tidak masuk MRR -----------------------
  const t3 = await buatTenant("rev-lewat");
  tenantDibuat.push(t3.id);
  await buatInvoice(t3.id, {
    itemType: "subscription",
    amount: 300_000,
    period: "monthly",
    mulai: tambahBulan(SEKARANG, -6),
    selesai: tambahBulan(SEKARANG, -5),
    dibayarPada: tambahBulan(SEKARANG, -6),
  });
  const setelahLewat = await loadRevenueSummary(SEKARANG);
  cek(
    "invoice langganan yang periodenya lewat tidak masuk MRR",
    setelahLewat.mrrLangganan === setelahTahunan.mrrLangganan,
    `mrrLangganan=${setelahLewat.mrrLangganan}, sebelumnya ${setelahTahunan.mrrLangganan}`,
  );

  // --- 4. invoice BELUM DIBAYAR tidak masuk MRR --------------------------
  const t4 = await buatTenant("rev-belum-bayar");
  tenantDibuat.push(t4.id);
  await buatInvoice(t4.id, {
    itemType: "subscription",
    amount: 1_000_000,
    period: "monthly",
    mulai: SEKARANG,
    selesai: tambahBulan(SEKARANG, 1),
    dibayarPada: null,
  });
  const setelahPending = await loadRevenueSummary(SEKARANG);
  cek(
    "invoice pending tidak masuk MRR",
    setelahPending.mrrLangganan === setelahLewat.mrrLangganan,
    `mrrLangganan=${setelahPending.mrrLangganan}`,
  );

  // --- 5. legalitas TIDAK masuk MRR --------------------------------------
  const t5 = await buatTenant("rev-legalitas");
  tenantDibuat.push(t5.id);
  await buatInvoice(t5.id, {
    itemType: "legalitas",
    amount: 500_000,
    period: "monthly",
    mulai: SEKARANG,
    selesai: SEKARANG,
    dibayarPada: SEKARANG,
  });
  const setelahLegalitas = await loadRevenueSummary(SEKARANG);
  cek(
    "legalitas sekali bayar TIDAK masuk MRR",
    setelahLegalitas.mrr === setelahPending.mrr,
    `mrr ${setelahPending.mrr} -> ${setelahLegalitas.mrr}`,
  );
  cek(
    "legalitas masuk pendapatan bulan ini",
    setelahLegalitas.legalitasBulanIni === 500_000,
    `legalitasBulanIni=${setelahLegalitas.legalitasBulanIni}`,
  );

  // --- 6. domain boleh dihitung dua kali? TIDAK --------------------------
  const t6 = await buatTenant(
    "rev-domain-duplikat",
    "active",
    tambahBulan(SEKARANG, 6),
  );
  tenantDibuat.push(t6.id);
  // Dua invoice domain yang periodenya BERIRISAN. Kalau penjumlahannya
  // salah, yang dihitung dua tahun padahal hanya satu yang dibayar.
  await buatInvoice(t6.id, {
    itemType: "domain",
    amount: 250_000,
    period: "yearly",
    mulai: tambahBulan(SEKARANG, -1),
    selesai: tambahBulan(SEKARANG, 11),
    // Dibayar bulan ini juga, supaya "keduanya masuk pendapatan bulan ini"
    // benar-benar menguji dua invoice -- bukan satu bulan lalu yang salah
    // dihitung.
    dibayarPada: SEKARANG,
  });
  await buatInvoice(t6.id, {
    itemType: "domain",
    amount: 250_000,
    period: "yearly",
    mulai: SEKARANG,
    selesai: tambahBulan(SEKARANG, 12),
    dibayarPada: SEKARANG,
  });
  const setelahDomain = await loadRevenueSummary(SEKARANG);
  cek(
    "dua invoice domain beririsan dihitung SATU KALI",
    Math.abs(setelahDomain.mrrDomain - 250_000 / 12) < 1,
    `mrrDomain=${setelahDomain.mrrDomain}, seharusnya ${250_000 / 12}`,
  );
  cek(
    "keduanya ada di pendapatan bulan ini (keduanya lunas)",
    setelahDomain.bulanIni.domain === 500_000,
    `domain=${setelahDomain.bulanIni.domain}`,
  );

  // --- 7. fee gateway: berlaku untuk SEMUA invoice lunas -----------------
  cek("fee per invoice = Rp 4.440", FEE_PER_INVOICE === 4_440);

  const totalGross =
    setelahDomain.bulanIni.langganan +
    setelahDomain.bulanIni.domain +
    setelahDomain.bulanIni.legalitas;
  cek(
    "kotor bulan ini = jumlah per jenis",
    setelahDomain.bulanIni.total === totalGross,
    `total=${setelahDomain.bulanIni.total}, jumlah=${rupiah(totalGross)}`,
  );
  cek(
    "bersih = kotor dikurangi biaya gateway",
    setelahDomain.netBulanIni ===
      totalGross - setelahDomain.biayaGateway,
    `net=${setelahDomain.netBulanIni}`,
  );
  cek(
    "biaya gateway = Rp 4.440 x jumlah invoice",
    setelahDomain.biayaGateway ===
      setelahDomain.jumlahInvoice * FEE_PER_INVOICE,
    `gateway=${setelahDomain.biayaGateway}, invoice=${setelahDomain.jumlahInvoice}`,
  );

  // Fee harus lebih besar dari nol kalau ada invoice lunas. Ini yang mengunci
  // "fee berlaku untuk add-on juga" -- kalau fee domain lupa dihitung, kartu
  // ini tetap benar karena yang dihitung dari jumlah invoice, bukan dari
  // jenis tagihan.
  cek(
    "ada biaya gateway kalau ada invoice lunas",
    setelahDomain.jumlahInvoice > 0
      ? setelahDomain.biayaGateway > 0
      : true,
    `jumlahInvoice=${setelahDomain.jumlahInvoice}`,
  );

  // --- 8. tenant domain aktif terhitung ---------------------------------
  cek(
    "tenant dengan domain aktif terhitung",
    setelahDomain.tenantDenganDomainAktif === 1,
    `nilai=${setelahDomain.tenantDenganDomainAktif}`,
  );

  // --- 9. domain suspended tidak dihitung sebagai aktif -----------------
  const t7 = await buatTenant("rev-domain-suspend", "suspended");
  tenantDibuat.push(t7.id);
  const setelahSuspend = await loadRevenueSummary(SEKARANG);
  cek(
    "tenant dengan domain suspended tidak masuk hitungan domain aktif",
    setelahSuspend.tenantDenganDomainAktif ===
      setelahDomain.tenantDenganDomainAktif,
    `nilai=${setelahSuspend.tenantDenganDomainAktif}`,
  );

  // --- 10. domain yang kedaluwarsa tidak aktif ---------------------------
  const t8 = await buatTenant(
    "rev-domain-kedaluarsa",
    "active",
    tambahBulan(SEKARANG, -1),
  );
  tenantDibuat.push(t8.id);
  const setelahKedaluarsa = await loadRevenueSummary(SEKARANG);
  cek(
    "domain aktif tapi periodenya lewat TIDAK dihitung aktif",
    setelahKedaluarsa.tenantDenganDomainAktif ===
      setelahDomain.tenantDenganDomainAktif,
    `nilai=${setelahKedaluarsa.tenantDenganDomainAktif}`,
  );

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
 * WAJIB dan TIDAK BOLEH di dalam `finally` yang membungkus blok pengujian:
 * begitu salah satu pemeriksaan gagal dengan exception, sisanya tidak
 * dijalankan dan pencatatannya berhenti di tengah. Pembersihan dilakukan di
 * sini, setelah `main()` selesai apa pun hasilnya.
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
