"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { usePathname } from "next/navigation";
import {
  ListIcon,
  SignOutIcon,
  StorefrontIcon,
  XIcon,
} from "@phosphor-icons/react";

import { signOut } from "@/lib/auth/actions";
import { navForRole, type NavItem } from "@/lib/nav";
import type { UserRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

/**
 * Navigasi area dalam (back-office / super admin).
 *
 * RESPONSIF (PRD §3.1):
 *   - Mobile (< 768px): menu penuh diganti tombol yang membuka panel menu.
 *     Menu penuh di 375px memaksa perkecil font atau scroll horizontal —
 *     keduanya tidak layak dipakai tukang di bengkel.
 *   - Tablet & desktop (>= 768px): navigasi tampil penuh.
 *
 * BATSAN RSC: komponen ini menerima `role` (string), BUKAN daftar item.
 * `navForRole()` dipanggil di sini, di sisi klien. Kalau daftar item — yang
 * berisi komponen ikon — dikirim dari Server Component, React menolak:
 * fungsi tidak boleh melewati batas Server/Client Component.
 *
 * Ikon memakai Phosphor (inline SVG), bukan icon font dari CDN: icon font
 * hilang saat luring dan menyebabkan kedipan tiap aplikasi dibuka (PRD §7.2).
 */

/** Daftar link navigasi. Berada di level modul agar identitas komponen stabil
 *  (mendefinisikannya saat render akan me-remount anak tiap render). */
function NavLinkList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-secondary hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon ? <Icon size={18} weight="light" aria-hidden /> : null}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardNav({
  role,
  home,
  who,
  children,
}: {
  role: UserRole;
  home: string;
  who: { fullName: string; roleLabel: string; scope: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = navForRole(role);
  const hasMenu = items.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card safe-top">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            {hasMenu ? (
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="dashboard-menu"
                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-muted md:hidden"
              >
                {menuOpen ? (
                  <XIcon size={22} weight="light" aria-hidden />
                ) : (
                  <ListIcon size={22} weight="light" aria-hidden />
                )}
              </button>
            ) : null}

            <Link
              href={home}
              className="flex min-w-0 items-center gap-2"
            >
              <BrandMark className="size-7 rounded-lg" />
              <span className="truncate text-base font-semibold text-foreground sm:text-lg">
                FurniTech
              </span>
            </Link>
          </div>

          {hasMenu ? (
            <nav className="hidden items-center gap-1 md:flex">
              <NavLinkList items={items} pathname={pathname} />
            </nav>
          ) : null}

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right text-xs leading-tight text-muted-foreground lg:block">
              <div className="font-medium text-foreground">{who.fullName}</div>
              <div>
                {who.roleLabel} · {who.scope}
              </div>
            </div>

            <Link
              href={home}
              className="hidden min-h-11 items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm text-secondary hover:bg-muted md:inline-flex"
            >
              <StorefrontIcon size={18} weight="light" aria-hidden />
              Toko
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-1 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-secondary"
              >
                <SignOutIcon size={18} weight="light" aria-hidden />
                Keluar
              </button>
            </form>
          </div>
        </div>

        {hasMenu && menuOpen ? (
          <nav
            id="dashboard-menu"
            className="grid gap-1 border-t border-border bg-card px-4 py-3 safe-bottom md:hidden"
          >
            <NavLinkList
              items={items}
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
            />
            <div className="mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{who.fullName}</div>
              <div>
                {who.roleLabel} · {who.scope}
              </div>
            </div>
          </nav>
        ) : null}
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
