import { requireRole } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard-nav";

export const metadata = { title: "Super Admin — FurniTech" };

/**
 * Panel platform (ROADMAP Sprint 2).
 *
 * Hanya super_admin yang boleh lewat: `requireRole` mengirim peran lain ke
 * /forbidden. Perhatikan bahwa super_admin punya tenant_id NULL, jadi ia
 * memang tidak pernah ter-scope ke satu toko — itulah alasan RLS memakai
 * policies terpisah `is_super_admin()`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["super_admin"], "/admin");

  return (
    <DashboardNav
      role={session.role}
      home="/admin"
      who={{
        fullName: session.fullName,
        roleLabel: "Super Admin",
        scope: "Seluruh tenant",
      }}
      // Super admin punya `tenant_id` NULL, jadi tidak ada tagihan miliknya
      // sendiri. `billingNotice` WAJIB di sini: menjadikannya opsional
      // berarti setiap pemanggil baru bisa melewatkannya, dan itu persis
      // jenis pemeriksaan yang hilang tanpa terasa.
      billingNotice={null}
    >
      {children}
    </DashboardNav>
  );
}
