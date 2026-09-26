import type { ReactNode } from "react";
import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Kerangka tampilan storefront per-tenant.
 *
 * Sengaja berupa komponen biasa (bukan bagian dari layout): `params` pada
 * layout HANYA berisi segmen dinamis di jalur layout itu sendiri. Untuk
 * `app/t/layout.tsx` itu berarti `params` selalu kosong — segmen
 * `[[...slug]]` ada di bawahnya. Resolusi tenant karena itu dilakukan di
 * page (yang memang menerima params), lalu hasilnya dioper ke sini.
 */
export function TenantShell({
  name,
  plan,
  children,
}: Readonly<{
  name: string;
  plan: string;
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:py-3">
          <span className="truncate text-base font-semibold text-foreground sm:text-lg">
            {name}
          </span>
          <StorefrontIcon size={22} weight="light" className="shrink-0 text-secondary" aria-hidden />
        </div>
      </header>
      <span className="sr-only">Paket langganan: {plan}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
