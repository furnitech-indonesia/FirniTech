import type { users } from "@/db/schema";

/**
 * Peran pengguna — diturunkan dari enum di skema agar tidak ada duplikasi.
 * Perhatikan: `super_admin` BUKAN role tenant, tenantId-nya null.
 */
export type UserRole = (typeof users.$inferSelect)["role"];

export const USER_ROLES: readonly UserRole[] = [
  "super_admin",
  "owner",
  "admin_penjualan",
  "tukang",
  "kurir",
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin_penjualan: "Admin Penjualan",
  tukang: "Tukang / Produksi",
  kurir: "Kurir Pengiriman",
};

/** Halaman tujuan setelah login, per peran. */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/admin",
  owner: "/dashboard",
  admin_penjualan: "/dashboard",
  tukang: "/dashboard",
  /**
   * Kurir TIDAK diberi `/dashboard`. Halaman itu memuat ringkasan keuangan
   * tenant, dan kurir tidak punya alasan melihatnya. Mengerahkan ia ke
   * `/kurir` juga membuat batasan aksesnya terlihat jelas.
   */
  kurir: "/kurir",
};

/**
 * Aturan akses per prefix path.
 *
 * Ini BUKAN pengganti RLS — RLS tetap lapisan kedua yang sesungguhnya. Fungsi
 * ini hanya menentukan halaman mana yang boleh dibuka role apa, supaya user
 * tidak mendarat di halaman yang memang bukan haknya lalu melihat 403 sia-sia.
 */
export const PATH_ACCESS: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: "/admin", roles: ["super_admin"] },
  { prefix: "/superadmin", roles: ["super_admin"] },
  {
    prefix: "/dashboard",
    roles: ["owner", "admin_penjualan", "tukang"],
  },
  {
    prefix: "/kurir",
    roles: ["kurir", "owner", "admin_penjualan"],
  },
];

export function isProtectedPath(pathname: string): boolean {
  return PATH_ACCESS.some(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function allowedRolesFor(pathname: string): readonly UserRole[] | null {
  const rule = PATH_ACCESS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule?.roles ?? null;
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowed = allowedRolesFor(pathname);
  if (!allowed) return true; // path publik
  return allowed.includes(role);
}

export function homeForRole(role: UserRole): string {
  return ROLE_HOME[role] ?? "/login";
}
