import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, tenants } from "@/db/schema";
import { loadRevenueSummary } from "@/lib/admin/revenue";
import { formatDateID, formatRupiah } from "@/lib/format";

/**
 * Ringkasan platform: MRR, pendapatan bulan ini, GMV, dan beban gateway.
 *
 * DUA kelompok angka yang tidak boleh dicampur, dan versi lama mencampur
 * keduanya:
 *
 *  - **Pendapatan platform** (dari `saas_invoices`): langganan, add-on
 *    domain, paket pendirian PT. Ini uang yang masuk ke FurniTech.
 *  - **Aliran transaksi** (dari `orders`): GMV, saldo untuk pengrajin, fee
 *    yang dibayar pengrajin. Ini uang milik orang lain yang lewat platform.
 *
 * Versi lama menamai variabel `mrr` padahal isinya `sum(orders.net_tenant_
 * amount)` -- itu saldo pengrajin, bukan pendapatan berulang. Komentarnya
 * lalu menulis "pendapatan platform hanya dari langganan (baris MRR di atas)"
 * padahal baris itu tidak pernah berisi pendapatan platform sama sekali.
 * Tidak ada satu pun angka pendapatan platform yang terlihat di halaman ini
 * sampai `loadRevenueSummary` ditambahkan.
 */
export default async function AdminOverviewPage() {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [tenantStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${tenants.isActive} = true)`,
    })
    .from(tenants);

  const planRows = await db
    .select({ plan: tenants.plan, total: count() })
    .from(tenants)
    .groupBy(tenants.plan);

  const [gmv] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint` })
    .from(orders)
    .where(gte(orders.createdAt, startOfMonth));

  const [aliran] = await db
    .select({
      tenantNet: sql<number>`coalesce(sum(${orders.netTenantAmount}), 0)::bigint`,
      mdr: sql<number>`coalesce(sum(${orders.midtransMdrFee}), 0)::bigint`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        eq(orders.paymentStatus, "fully_paid"),
        isNotNull(orders.paidAt),
      ),
    );

  const paidOrderCount = await db
    .select({ total: count() })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startOfMonth),
        eq(orders.paymentStatus, "fully_paid"),
      ),
    );

  const pendapatan = await loadRevenueSummary();

  const cards = [
    { label: "Tenant terdaftar", value: String(tenantStats?.total ?? 0) },
    { label: "Tenant aktif", value: String(tenantStats?.active ?? 0) },
    { label: "MRR langganan", value: formatRupiah(pendapatan.mrrLangganan) },
    { label: "MRR domain", value: formatRupiah(pendapatan.mrrDomain) },
    { label: "Total MRR", value: formatRupiah(pendapatan.mrr) },
    {
      label: "Kotor tagihan bulan ini",
      value: formatRupiah(pendapatan.bulanIni.total),
    },
    {
      label: "Biaya gateway bulan ini",
      value: formatRupiah(pendapatan.biayaGateway),
    },
    {
      label: "Bersih bulan ini",
      value: formatRupiah(pendapatan.netBulanIni),
    },
  ];

  /*
   * Kartu aliran transaksi. BUKAN pendapatan FurniTech: itu jumlah yang
   * dibayar pengrajin ke Midtrans dan milik mereka. Ditampilkan karena tugas
   * panel ini melihat seluruh aliran uang platform, dan menyembunyikannya
   * membuat saldo escrow terlihat utuh padahal tidak.
   */
  const kartuAliran = [
    { label: "GMV bulan ini", value: formatRupiah(gmv?.total ?? 0) },
    { label: "Saldo untuk pengrajin", value: formatRupiah(aliran?.tenantNet ?? 0) },
    {
      label: "MDR dibayar pengrajin",
      value: formatRupiah(aliran?.mdr ?? 0),
    },
    { label: "Pesanan lunas", value: String(paidOrderCount[0]?.total ?? 0) },
  ];

  return (
    <main id="konten-utama" className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Ringkasan Platform</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Periode sejak {formatDateID(startOfMonth)} WIB.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Pendapatan platform
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Uang yang masuk ke FurniTech. MRR adalah pendapatan berulang yang
        sudah dinormalisasi ke satu bulan -- invoice tahunan dihitung
        dua belas, bukan sekaligus.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/*
       * Rinciannya dua kali: kartu di mobile, tabel di md ke atas.
       *
       * Satu tabel saja AKAN gagal `test:responsive` -- dan itu bukan aturan
       * formalitas. Tabel tiga kolom di 375px memaksa scroll horizontal,
       * dan di panel admin yang sering dibaca sambil memegang HP, itu berarti
       * angka yang justru paling penting (bersih bulan ini) ada di luar
       * layar.
       */}
      <ul className="mt-4 rounded-2xl border border-border md:hidden">
          <li
            key={"Langganan"}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3 first:border-t-0"
          >
            <span className="text-sm text-foreground">{"Langganan"}</span>
            <span className="text-sm text-code-tabular text-foreground">
              {formatRupiah(pendapatan.bulanIni.langganan)}
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {"Berulang, masuk MRR"}
            </span>
          </li>,
          <li
            key={"Custom domain .com"}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3 first:border-t-0"
          >
            <span className="text-sm text-foreground">{"Custom domain .com"}</span>
            <span className="text-sm text-code-tabular text-foreground">
              {formatRupiah(pendapatan.bulanIni.domain)}
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {"Berulang tahunan, masuk MRR per 12"}
            </span>
          </li>,
          <li
            key={"Paket pendirian PT"}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3 first:border-t-0"
          >
            <span className="text-sm text-foreground">{"Paket pendirian PT"}</span>
            <span className="text-sm text-code-tabular text-foreground">
              {formatRupiah(pendapatan.legalitasBulanIni)}
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {"Sekali bayar, tidak masuk MRR"}
            </span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              Biaya Midtrans
            </span>
            <span className="text-sm text-code-tabular text-foreground">
              &minus;{formatRupiah(pendapatan.biayaGateway)}
            </span>
            <span className="w-full text-xs text-muted-foreground">
              Rp 4.440 &times; {pendapatan.jumlahInvoice} invoice
            </span>
          </li>
      </ul>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Rincian tagihan bulan berjalan menurut jenis tagihan
          </caption>
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Jenis tagihan
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Kotor bulan ini
              </th>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Sifat
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <th scope="row" className="px-4 py-2 text-left font-normal">
                Langganan
              </th>
              <td className="px-4 py-2 text-right text-code-tabular">
                {formatRupiah(pendapatan.bulanIni.langganan)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">Berulang, masuk MRR</td>
            </tr>
            <tr className="border-t border-border">
              <th scope="row" className="px-4 py-2 text-left font-normal">
                Custom domain .com
              </th>
              <td className="px-4 py-2 text-right text-code-tabular">
                {formatRupiah(pendapatan.bulanIni.domain)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">Berulang tahunan, masuk MRR per 12</td>
            </tr>
            <tr className="border-t border-border">
              <th scope="row" className="px-4 py-2 text-left font-normal">
                Paket pendirian PT
              </th>
              <td className="px-4 py-2 text-right text-code-tabular">
                {formatRupiah(pendapatan.legalitasBulanIni)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">Sekali bayar, tidak masuk MRR</td>
            </tr>
            <tr className="border-t border-border font-medium">
              <th scope="row" className="px-4 py-2 text-left">
                Biaya Midtrans
              </th>
              <td className="px-4 py-2 text-right text-code-tabular">
                &minus;{formatRupiah(pendapatan.biayaGateway)}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                Rp 4.440 &times; {pendapatan.jumlahInvoice} invoice
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {pendapatan.tenantDenganDomainAktif} tenant memakai custom domain
        aktif.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Aliran transaksi
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bukan pendapatan FurniTech. Ini jumlah yang dibayar pengrajin ke
        Midtrans dan milik mereka -- ditampilkan supaya saldo escrow terlihat
        apa adanya, bukan utuh.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kartuAliran.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Sebaran paket langganan
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {planRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tenant.</p>
        ) : (
          planRows.map((row) => (
            <div
              key={row.plan}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="text-sm capitalize text-muted-foreground">{row.plan}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">
                {row.total}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
