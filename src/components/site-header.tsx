"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ListIcon } from "@phosphor-icons/react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Header situs publik: brand, navigasi, dan CTA masuk.
 *
 * Navigasi desktop disembunyikan di bawah `md`; sisanya pindah ke drawer
 * (Sheet). Drawer memakai primitif shadcn, bukan `<details>`, supaya fokus
 * terkunci di dalam panel saat terbuka dan tombol Escape menutupnya — perilaku
 * yang tidak didapat dari elemen HTML.
 *
 * PENANDAAN HALAMAN AKTIF: memakai scroll spy, bukan perbandingan pathname.
 * Versi pertama membandingkan `pathname === "/"`, yang membuat KETIGA item
 * sekaligus terlihat aktif — karena semua link-nya berupa anchor di beranda.
 * Perbandingan pathname hanya bisa menjawab "halaman mana", tidak "section
 * mana yang sedang dibaca", dan di halaman satu-scroll itu pertanyaan yang
 * salah.
 */

const LINKS = [
  { href: "/#fitur", label: "Fitur", id: "fitur" },
  { href: "/#harga", label: "Harga", id: "harga" },
  { href: "/#faq", label: "Pertanyaan", id: "faq" },
] as const;

/**
 * Mengembalikan id section yang sedang terlihat. Section yang paling atas
 * di viewport yang menang, supaya menunya tidak berkedip-ganti saat dua
 * section terlihat bersamaan di layar pendek.
 */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        const first = ids.find((id) => visible.has(id));
        setActive(first ?? null);
      },
      // rootMargin bawah -55%: section dianggap aktif saat mengisi bagian
      // atas viewport, bukan sekadar menyentuh satu piksel di tepi bawah.
      { rootMargin: "0px 0px -55% 0px" },
    );

    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ids = LINKS.map((l) => l.id);
  const activeSection = useActiveSection(ids);

  const onHome = pathname === "/";

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
            const active = onHome && activeSection === link.id;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "true" : undefined}
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

              {/* pt-12: memberi ruang untuk tombol tutup yang menempel di
                  pojok kanan atas sheet. Tanpa ini item pertama tertutup. */}
              <nav
                className="flex flex-col gap-1 pt-12"
                aria-label="Navigasi seluler"
              >
                {LINKS.map((link) => {
                  const active = onHome && activeSection === link.id;
                  return (
                    <SheetClose key={link.href} render={<Link href={link.href} />}>
                      <span
                        aria-current={active ? "true" : undefined}
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
