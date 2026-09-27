// Tipe `Icon` tidak diekspor dari entry ssr, jadi diambil dari entry utama
// yang sudah tetap type-only (tidak menambah kode ke bundle).
import type { Icon } from "@phosphor-icons/react";
import {
  ArmchairIcon,
  ChartBarIcon,
  ChatIcon,
  HammerIcon,
  PackageIcon,
  ReceiptIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TruckIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { UserRole } from "@/lib/auth/permissions";

/**
 * Navigasi back-office per peran.
 *
 * Ini murni untuk tampilan: menyembunyikan menu yang tidak relevan agar tukang
 * tidak melihat pintu masuk ke modul yang memang bukan haknya. Penegakan
 * sebenarnya tetap di guard tiap action dan RLS — menu yang tersembunyi pun
 * tetap ditolak kalau diakses langsung.
 *
 * Ikon adalah komponen Phosphor (inline SVG). Benefit untuk Fase 2: tidak ada
 * permintaan jaringan untuk ikon, jadi tidak ada kedipan saat aplikasi dibuka
 * dan tetap tampil saat luring (PRD §7.2).
 */

export type NavItem = {
  href: string;
  label: string;
  /** Label pendek untuk layar sempit. */
  shortLabel?: string;
  icon?: Icon;
};

const ALL_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Ringkasan",
    shortLabel: "Ringkasan",
    icon: SquaresFourIcon,
  },
  {
    href: "/dashboard/produk",
    label: "Produk",
    shortLabel: "Produk",
    icon: ArmchairIcon,
  },
  {
    href: "/dashboard/materials",
    label: "Bahan Baku",
    shortLabel: "Bahan",
    icon: PackageIcon,
  },
  {
    href: "/dashboard/pesanan",
    label: "Pesanan",
    shortLabel: "Pesanan",
    icon: ReceiptIcon,
  },
  {
    href: "/dashboard/chat",
    label: "Inbox CS",
    shortLabel: "Inbox",
    icon: ChatIcon,
  },
  {
    href: "/dashboard/pengaturan/ongkir",
    label: "Tarif Ongkir",
    shortLabel: "Ongkir",
    icon: TruckIcon,
  },
];

/**
 * Tukang: antrean produksi saja. Sprint 7/8 membuat antrean ini mobile-first
 * dengan akses kamera.
 */
const CARPENTER_NAV: NavItem[] = [
  {
    href: "/dashboard/pesanan",
    label: "Antrean Produksi",
    shortLabel: "Antrean",
    icon: HammerIcon,
  },
];

/**
 * Kurir: satu halaman saja.
 *
 * Bukan sekadar "menu ringkas" — memang hanya ada satu. Mengubah nav
 * kurir berarti menambah fitur baru di alur pengiriman, dan setiap tambahan
 * adalah satu permukaan akses yang harus diawasi. `PATH_ACCESS` sudah
 * membatasi `/kurir` untuk role kurir, jadi halaman lain sudah menolak dia
 * walau dia mengetik URL-nya langsung.
 */
const COURIER_NAV: NavItem[] = [
  {
    href: "/kurir",
    label: "Pengiriman",
    shortLabel: "Kirim",
    icon: TruckIcon,
  },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "tukang") return CARPENTER_NAV;
  if (role === "kurir") return COURIER_NAV;
  if (role === "super_admin") return [];
  return ALL_NAV;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Ringkasan", shortLabel: "Ringkasan", icon: ChartBarIcon },
  {
    href: "/admin/tenant",
    label: "Tenant",
    shortLabel: "Tenant",
    icon: StorefrontIcon,
  },
];
