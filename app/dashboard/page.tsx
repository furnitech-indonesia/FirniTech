import { and, count, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, products, tenants } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { PLATFORM_FEE_RATE } from "@/lib/plans";
import { formatRupiah } from "@/lib/format";

/**
 * Ringkasan toko (ROADMAP Sprint 3). Angka dihitung langsung dari database,
 * selalu difilter tenantId — klien Drizzle (user postgres) bypass RLS.
 */
export default async function DashboardHome() {
  const session = await requireSession("/dashboard");
  const tenantId = session.tenantId;

  if (!tenantId) {
    return (
      <main id="konten-utama" className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Ringkasan</h1>
        <p className="mt-2 text-secondary">
          Akun ini belum terhubung ke tenant mana pun. Hubungi admin platform.
        </p>
      </main>
    );
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const [productTotals] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.tenantId, tenantId));

  const [orderTotals] = await db
    .select({ total: count() })
    .from(orders)
    .where(eq(orders.tenantId, tenantId));

  const [monthRevenue] = await db
    .select({
      gross: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint`,
      mdr: sql<number>`coalesce(sum(${orders.midtransMdrFee}), 0)::bigint`,
      platformFee: sql<number>`coalesce(sum(${orders.platformServiceFee}), 0)::bigint`,
      net: sql<number>`coalesce(sum(${orders.netTenantAmount}), 0)::bigint`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, startOfMonth),
        eq(orders.paymentStatus, "fully_paid"),
      ),
    );

  const cards = [
    { label: "Produk", value: String(productTotals?.total ?? 0) },
    { label: "Pesanan", value: String(orderTotals?.total ?? 0) },
    { label: "Omzet bulan ini", value: formatRupiah(monthRevenue?.gross ?? 0) },
    { label: "Saldo siap cair", value: formatRupiah(monthRevenue?.net ?? 0) },
    {
      label: `Fee platform (${PLATFORM_FEE_RATE * 100}%)`,
      value: formatRupiah(monthRevenue?.platformFee ?? 0),
    },
    { label: "MDR Midtrans", value: formatRupiah(monthRevenue?.mdr ?? 0) },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">
        Ringkasan {tenant?.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Data sejak {startOfMonth.toISOString().slice(0, 10)} · hanya pesanan
        yang lunas.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
