import type { ReactNode } from "react";

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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-slate-900">{name}</span>
          <span className="material-symbols-outlined text-slate-700">
            storefront
          </span>
        </div>
      </header>
      <span className="sr-only">Paket langganan: {plan}</span>
      {children}
    </div>
  );
}
