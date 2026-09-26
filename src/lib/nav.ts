import "server-only";

import type { UserRole } from "@/lib/auth/permissions";

/**
 * Navigasi back-office per peran.
 *
 * Ini murni untuk tampilan: menyembunyikan menu yang tidak relevan agar tukang
 * tidak melihat pintu masuk ke modul yang memang bukan haknya. Penegakan
 * sebenarnya tetap di guard tiap action dan RLS — menu yang tersembunyi pun
 * tetap akan ditolak kalau diakses langsung.
 */

export type NavItem = { href: string; label: string; icon: string };

const ALL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Ringkasan", icon: "space_dashboard" },
  { href: "/dashboard/produk", label: "Produk", icon: "chair" },
  { href: "/dashboard/materials", label: "Bahan Baku", icon: "inventory_2" },
  { href: "/dashboard/pesanan", label: "Pesanan", icon: "receipt_long" },
  { href: "/dashboard/chat", label: "Inbox CS", icon: "chat" },
];

/**
 * Tukang: antrean produksi saja. Sprint 4 akan menambahkan tampilan khusus
 * tukang (antrean kerja + unggah foto progres).
 */
const CARPENTER_NAV: NavItem[] = [
  { href: "/dashboard/pesanan", label: "Antrean Produksi", icon: "handyman" },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "tukang") return CARPENTER_NAV;
  if (role === "super_admin") return [];
  return ALL_NAV;
}
