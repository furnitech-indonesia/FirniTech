"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ListIcon } from "@phosphor-icons/react";

import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Header situs publik: brand, navigasi, dan CTA masuk.
 *
 * Navigasi desktop disembunyikan di bawah `md`; sisanya pindah ke drawer
 * (Sheet). Drawer memakai primitif shadcn, bukan `<details>`, supaya fokus
 * terkunci di dalam panel saat terbuka dan tombol Escape menutupnya — perilaku
 * yang tidak didapat dari elemen HTML.
 *
 * `aria-current` menandai halaman aktif. Menu aktif tidak boleh hanya
 * dibedakan dengan warna: di DESIGN.md §7 warna saja tidak cukup, dan
 * penghuni buta warna tidak akan tahu posisinya.
 */

const LINKS = [
  { href: "/#fitur", label: "Fitur" },
  { href: "/#harga", label: "Harga" },
  { href: "/#faq", label: "Pertanyaan" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const target = href.split("#")[0];
  if (target !== "/") return pathname.startsWith(target);
  // Anchor di halaman beranda: aktif hanya saat sedang di beranda.
  return pathname === "/";
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl bg-primary text-label-sm font-semibold text-primary-foreground"
          >
            F
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-title-md text-foreground">FurniTech</span>
            <span className="text-body-sm text-muted-foreground">
              Sistem operasional mebel
            </span>
          </span>
        </Link>

        {/* Navigasi desktop */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-xl px-3 text-label-lg transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-secondary hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover md:inline-flex"
          >
            Masuk
          </Link>

          {/* Drawer untuk layar sentuh */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Buka menu navigasi"
                  className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-secondary transition-colors hover:bg-muted md:hidden"
                />
              }
            >
              <ListIcon size={22} weight="light" />
            </SheetTrigger>

            <SheetContent side="right" className="w-3/4 max-w-80">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>

              <nav className="flex flex-col gap-1" aria-label="Navigasi seluler">
                {LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <SheetClose
                      key={link.href}
                      render={<Link href={link.href} />}
                    >
                      <span
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center rounded-xl px-3 text-label-lg ${
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-secondary"
                        }`}
                      >
                        {link.label}
                      </span>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-border pt-4">
                <SheetClose
                  render={
                    <Link
                      href="/login"
                      className="flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
                    />
                  }
                >
                  Masuk
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
