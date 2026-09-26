"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/lib/auth/actions";

/**
 * Navigasi area dalam (back-office / super admin).
 * Item yang tampil ditentukan server-side lewat `items`, bukan dari role di
 * client — supaya UI tidak bisa "dibuka" dengan cara memanipulasi state.
 */
export type NavItem = { href: string; label: string; icon: string };

export function DashboardNav({
  items,
  home,
  who,
  children,
}: {
  items: NavItem[];
  home: string;
  who: { fullName: string; roleLabel: string; scope: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-semibold text-slate-900">FurniTech</span>

          <nav className="flex flex-wrap items-center gap-1">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-amber-100 text-amber-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight text-slate-600">
              <div className="font-medium text-slate-900">{who.fullName}</div>
              <div>
                {who.roleLabel} · {who.scope}
              </div>
            </div>
            <Link
              href={home}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Toko
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
