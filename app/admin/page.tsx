import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, tenants } from "@/db/schema";
import { formatDateID, formatRupiah } from "@/lib/format";

/**
 * Ringkasan platform: jumlah tenant, MRR, GMV, dan beban gateway pengrajin.
 *
 * Angka berasal dari tabel orders dan tenants secara langsung. Kolom
 * `net_tenant_amount` = total − MDR − fee platform, jadi MRRplatform adalah
 * penjumlahan fee platform dari pesanan yang lunas.
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

  const [mrr] = await db
    .select({
      platformFee: sql<number>`coalesce(sum(${orders.platformServiceFee}), 0)::bigint`,
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

  const cards = [
    { label: "Tenant terdaftar", value: String(tenantStats?.total ?? 0) },
    { label: "Tenant aktif", value: String(tenantStats?.active ?? 0) },
    { label: "GMV bulan ini", value: formatRupiah(gmv?.total ?? 0) },
    /*
      Platform fee DIHAPUS, jadi pendapatan platform sekarang hanya dari
      langganan (baris MRR di atas). Kartu yang tersisa di sini bukan
      pendapatan FurniTech: itu jumlah yang dibayar pengrajin ke Midtrans.
      Ditampilkan karena tugas panel ini melihat seluruh aliran uang platform,
      dan menyembunyikannya membuat saldo escrow terlihat utuh padahal tidak.
    */
    { label: "Saldo untuk pengrajin", value: formatRupiah(mrr?.tenantNet ?? 0) },
    {
      label: "Biaya gateway dibayar pengrajin",
      value: formatRupiah(mrr?.mdr ?? 0),
    },
    { label: "Pesanan lunas", value: String(paidOrderCount[0]?.total ?? 0) },
  ];

  return (
    <main id="konten-utama" className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Ringkasan Platform</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Periode sejak {formatDateID(startOfMonth)} WIB.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
