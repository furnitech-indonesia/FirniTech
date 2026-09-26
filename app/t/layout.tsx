/**
 * Layout di bawah /t.
 *
 * Sengaja tidak melakukan lookup tenant di sini: `params` pada layout hanya
 * berisi segmen dinamis pada jalur layout itu sendiri, sehingga untuk
 * `app/t/layout.tsx` nilainya selalu kosong (segmen `[[...slug]]` ada di
 * bawahnya). Resolusi tenant dilakukan di page — lihat resolveTenantForRequest.
 */
export default function TenantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
