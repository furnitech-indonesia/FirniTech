import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { DashboardNav } from "@/components/dashboard-nav";

export const metadata = { title: "Dashboard — FurniTech" };

/**
 * Layout back-office pengrajin.
 *
 * AUTHORITATIVE check ada di sini, bukan hanya di proxy.ts: proxy hanya
 * menolak request yang sama sekali tanpa cookie (hemat kerja), sedangkan
 * keputusan "role apa yang boleh masuk" diverifikasi ulang dari database di
 * setiap request. RLS tetap lapisan ketiga.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession("/dashboard");
  const { role, tenantId } = session;

  // super_admin tidak punya tenant; back-office bukan tempatnya.
  if (role === "super_admin") {
    redirect("/admin");
  }

  const [tenant] = tenantId
    ? await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    : [null];

  /*
   * Tenant yang belum membayar DITOLAK di sini.
   *
   * Pendaftaran Sprint 10 Fase D membuat tenant dengan `isActive = false` dan
   * `subscriptionStatus = 'pending'`, lalu webhook Midtrans yang menyalakannya.
   * Tanpa gerbang ini, orang bisa mendaftar, menutup tab sebelum membayar,
   * lalu langsung masuk back-office — dan seluruh aturan "tanpa free trial"
   * (PRD §2.A) tidak berlaku.
   *
   * Kenapa redirect, bukan `notFound()`: akunnya sah, sessinya ada, dan
   * kebutuhannya cuma satu — menyelesaikan pembayaran. 404 akan membuat orang
   * mengira akunnya hilang dan mendaftar ulang.
   *
   * `subscriptionStatus` ikut diperiksa, bukan hanya `isActive`, supaya
   * langganan yang sudah pernah aktif lalu jatuh tempo (`past_due`) tidak
   * ikut terkunci selamanya tanpa jalan keluar.
   */
  if (tenant && (!tenant.isActive || tenant.subscriptionStatus === "pending")) {
    redirect("/menunggu-pembayaran");
  }

  return (
    <DashboardNav
      role={role}
      home={tenant ? `/t/${tenant.slug}` : "/"}
      who={{
        fullName: session.fullName,
        roleLabel: ROLE_LABELS[role],
        scope: tenant?.name ?? "Tenant tidak ditemukan",
      }}
    >
      {children}
    </DashboardNav>
  );
}
