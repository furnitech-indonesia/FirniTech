import { requireRole } from "@/lib/auth/session";
import { DashboardNav, type NavItem } from "@/components/dashboard-nav";

export const metadata = { title: "Super Admin — FurniTech" };

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Ringkasan", icon: "monitoring" },
  { href: "/admin/tenant", label: "Tenant", icon: "storefront" },
];

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
      items={ADMIN_NAV}
      home="/admin"
      who={{
        fullName: session.fullName,
        roleLabel: "Super Admin",
        scope: "Seluruh tenant",
      }}
    >
      {children}
    </DashboardNav>
  );
}
