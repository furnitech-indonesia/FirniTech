import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath } from "@/lib/auth/permissions";
import { getRequestHost, resolveTenantFromHost } from "@/lib/tenant-host";

/**
 * Multi-tenant routing (Next.js 16: middleware.ts sudah DEPRECATED →
 * file konvensinya bernama proxy.ts dengan fungsi export `proxy`).
 *
 * Runtime: Node.js only. `export const runtime` TIDAK boleh dipakai di sini
 * (Next akan throw error).
 *
 * Yang dilakukan file ini HANYA rewriting berdasarkan host — TIDAK query
 * database. Resolusi custom domain → slug dilakukan di app/t/layout.tsx
 * (dengan React cache()), supaya proxy tetap ringan.
 *
 * Host diambil dari x-forwarded-host/host, BUKAN request.url: lihat
 * getRequestHost() di src/lib/tenant-host.ts. Di Vercel setiap domain tenant
 * juga harus didaftarkan sebagai domain di project Vercel.
 *
 * Peringatan Next 16: Server Function bukan route terpisah. Matcher yang
 * mengecualikan suatu path akan MELEWATI pemanggilan Server Function di path
 * itu juga. Karena itu otorisasi tetap wajib dicek di dalam setiap
 * Server Function / Server Action, tidak boleh bergantung pada proxy.
 */

/**
 * Path milik platform (back-office, super admin, dan alur auth) — tidak ikut
 * di-rewrite tenant. `/forbidden` dan `/auth` WAJIB ada di sini: kalau tidak,
 * tenant yang membuka halaman 403 akan dialihkan ke storefront-nya.
 */
const PLATFORM_PATHS = [
  "/dashboard",
  "/admin",
  "/superadmin",
  "/api",
  "/login",
  "/forbidden",
  "/auth",
  "/t",
];

function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Apakah ada session cookie. Nama cookie auth Supabase diawali `sb-`
 * (prefix project ref). Hanya sinyal "mungkin sudah login" — keabsahan cookie
 * tetap divalidasi server lewat supabase.auth.getUser().
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast-path auth: area dalam butuh session cookie Supabase. Ini HANYA
  // Menghemat kerja — bukan otorisasi. Penentuan role tetap diverifikasi dari
  // database di layout (/dashboard, /admin), dan RLS adalah lapisan ketiga.
  if (isProtectedPath(pathname) && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (isPlatformPath(pathname)) {
    return NextResponse.next();
  }

  const host = getRequestHost(request.headers, request.url);
  const resolution = resolveTenantFromHost(host);

  // Domain platform (furnitech.id / www / localhost) → tanpa rewrite.
  if (resolution.kind === "platform") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/t${pathname === "/" ? "" : pathname}`;

  const requestHeaders = new Headers(request.headers);
  // Host asli dipakai layout untuk lookup tenant by custom_domain.
  requestHeaders.set("x-tenant-host", host);
  if (resolution.kind === "tenant") {
    requestHeaders.set("x-tenant-slug", resolution.slug);
  }

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // Jangan pernah rewrite aset statis — kalau tidak, CSS/JS/gambar gagal dimuat.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
