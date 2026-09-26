import "server-only";

/**
 * Resolusi tenant berdasarkan host (multi-tenant routing).
 *
 * Dua bentuk host yang didukung (PRD §4 Modul 1):
 *   1. Subdomain bawaan : mebeljaya.furnitech.id  -> tenants.slug
 *   2. Custom domain    : mebeljaya.com          -> tenants.custom_domain
 *      (hanya setelah customDomainVerified = true, yaitu setelah Cloudflare
 *       for SaaS memverifikasi CNAME-nya)
 *
 * KETIKA DOMAIN BELUM ADA (kondisi sekarang): FurniTech masih di-host di
 * Vercel memakai subdomain `*.vercel.app`, jadi tidak ada root domain milik
 * sendiri untuk pola `slug.root-domain`. Selama NEXT_PUBLIC_ROOT_DOMAIN belum
 * diisi, SEMUA host diperlakukan sebagai host platform dan tenant routing
 * dimatikan — memakai path `/t/<slug>` sebagai gantinya. Ini penting:
 * tanpa guard, host `apa saja.vercel.app` akan dianggap subdomain tenant lalu
 * berakhir di 404 untuk semua halaman.
 */

/** Host milik Vercel — tidak pernah diperlakukan sebagai subdomain tenant. */
const VERCEL_HOST_SUFFIXES = [".vercel.app", ".vercel-dns.com"];

function normalizeRootDomain(value: string | undefined): string | null {
  const cleaned = value
    ?.replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
  return cleaned ? cleaned : null;
}

export const ROOT_DOMAIN = normalizeRootDomain(
  process.env.NEXT_PUBLIC_ROOT_DOMAIN,
);

/** True bila domain raíz sudah siap dan subdomain routing bisa diaktifkan. */
export const TENANT_ROUTING_ENABLED = ROOT_DOMAIN !== null;

function isVercelHost(hostname: string): boolean {
  return VERCEL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/** Host yang milik platform, bukan tenant. */
const PLATFORM_HOSTS = new Set([
  ...(ROOT_DOMAIN ? [ROOT_DOMAIN, `www.${ROOT_DOMAIN}`] : []),
  "localhost",
]);

export type TenantResolution =
  | { kind: "tenant"; slug: string; host: string }
  | { kind: "platform"; host: string }
  | { kind: "unknown"; host: string };

/** Ambil host tanpa port dari URL. */
export function getHost(url: URL | string): string {
  const parsed = typeof url === "string" ? new URL(url) : url;
  return parsed.hostname.toLowerCase();
}

/**
 * Ambil host dari request secara defensif.
 *
 * PENTING: jangan andalkan `request.url` untuk menentukan tenant.
 * Secara lokal (`next start`) `request.url` berisi alamat server
 * ("http://localhost:3000/") walau Host header-nya domain tenant, sedangkan di
 * Vercel `request.url` bisa berisi URL deployment. Perbedaan ini membuat
 * rewrite tenant gagal di lokal tapi "kebetulan" jalan di produksi.
 *
 * Urutan yang benar: x-forwarded-host (proxy/Vercel) → host → request.url.
 */
export function getRequestHost(headers: Headers, requestUrl: string): string {
  const forwarded = headers.get("x-forwarded-host");
  const host = headers.get("host");
  const candidate = forwarded ?? host;
  if (candidate) {
    // x-forwarded-host bisa berupa daftar dipisah koma.
    return candidate.split(",")[0]!.trim().toLowerCase();
  }
  return getHost(requestUrl);
}

export function resolveTenantFromHost(host: string): TenantResolution {
  const hostname = host.toLowerCase();

  // Domain raíz belum ada → tidak ada pola subdomain yang bisa ditafsirkan.
  if (!ROOT_DOMAIN) {
    return { kind: "platform", host: hostname };
  }

  if (PLATFORM_HOSTS.has(hostname) || isVercelHost(hostname)) {
    return { kind: "platform", host: hostname };
  }

  // Custom domain: bukan subdomain dari root domain.
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return { kind: "unknown", host: hostname };
  }

  const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!subdomain || subdomain.includes(".")) {
    return { kind: "unknown", host: hostname };
  }

  return { kind: "tenant", slug: subdomain, host: hostname };
}

export const TENANT_SLUG_HEADER = "x-tenant-slug";

export function readTenantSlug(headers: Headers): string | null {
  return headers.get(TENANT_SLUG_HEADER);
}
