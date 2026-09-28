import { eq } from "drizzle-orm";
import { InfoIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { DomainPurchaseForm } from "@/components/domain-purchase-form";
import { SectionCard, EmptyState } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { DOMAIN_ADDON } from "@/lib/addons";
import { formatDateID, formatRupiah } from "@/lib/format";

export const metadata = { title: "Domain — FurniTech" };

/**
 * Pengaturan domain (PRD §2.D).
 *
 * Satu halaman yang menjawab tiga pertanyaan berbeda, dan tiga statusnya
 * sengaja tidak disamakan warnanya:
 *
 *   - **Subdomain gratis** — selalu aktif, tidak bisa hilang. Tidak punya
 *     invoice sama sekali, jadi tidak punya status tagihan.
 *   - **Custom domain belum terverifikasi** — status TEKNIS. Domain sudah
 *     diisi tapi CNAME belum dicek. Menampilkan ini sebagai merah membuat
 *     pengrajin mengira ada yang salah, padahal tidak ada yang bisa dia
 *     perbaiki selain menunggu.
 *   - **Custom domain terverifikasi tapi belum dibayar** — status ITU yang
 *     harus ditagih, dan karena itulah ia punya tombol.
 *
 * Invoice HANYA bisa dibuat setelah terverifikasi. Alasannya ada di
 * `purchaseDomainAddon`: menagih domain yang belum bisa diakses berarti
 * menagih orang atas sesuatu yang belum berfungsi.
 */
export default async function DomainSettingsPage() {
  const actor = await requireTenantWrite(["owner"]);

  const [tenant] = await db
    .select({
      slug: tenants.slug,
      customDomain: tenants.customDomain,
      customDomainVerified: tenants.customDomainVerified,
      customDomainStatus: tenants.customDomainStatus,
      customDomainExpiresAt: tenants.customDomainExpiresAt,
      customDomainSuspendedAt: tenants.customDomainSuspendedAt,
    })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  const now = new Date();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? null;
  const subdomainHost = rootDomain
    ? `${tenant?.slug ?? ""}.${rootDomain}`
    : `/t/${tenant?.slug ?? ""}`;

  const expiresAt = tenant?.customDomainExpiresAt ?? null;
  const sedangBerjalan =
    tenant?.customDomainStatus === "active" &&
    expiresAt !== null &&
    expiresAt > now;

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Domain toko</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Alamat yang dipakai pembeli untuk membuka tokomu.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SectionCard
          title="Subdomain gratis"
          description="Tersedia di semua paket. Tidak perlu konfigurasi apa pun."
        >
          <div className="flex flex-col gap-3">
            <p className="text-body-md text-foreground">
              {rootDomain ? (
                <span className="font-mono text-code-tabular">
                  https://{subdomainHost}
                </span>
              ) : (
                <span className="font-mono text-code-tabular">
                  /t/{tenant?.slug}
                </span>
              )}
            </p>
            <p className="text-body-sm text-muted-foreground">
              {rootDomain
                ? "Berlaku selama langganan aktif. Tidak bisa hilang, dan tidak pernah ditagih terpisah."
                : "Domain raíz belum aktif, jadi toko diakses lewat alamat di atas. Setelah domain raíz menyala, alamatnya menjadi subdomain."}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Custom domain"
          description={`Pakai nama sendiri, misal tokomelayu.com. ${formatRupiah(
            DOMAIN_ADDON.price,
          )} per ${DOMAIN_ADDON.periodMonths} bulan, dibayar di muka.`}
        >
          {!tenant?.customDomain ? (
            <EmptyState message="Belum ada custom domain. Isi domain di panel admin, lalu arahkan DNS-nya ke FurniTech. Setelah terverifikasi, tagihannya bisa dibeli di sini." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-body-md text-foreground">
                  {tenant.customDomain}
                </span>
                <DomainStatusBadge
                  verified={tenant.customDomainVerified}
                  status={tenant.customDomainStatus}
                  berjalan={sedangBerjalan}
                />
              </div>

              {tenant.customDomainVerified ? (
                sedangBerjalan ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-body-md text-foreground">
                      Berlaku sampai{" "}
                      <strong>{formatDateID(expiresAt!)}</strong>
                    </p>
                    <p className="text-body-sm text-muted-foreground">
                      Invoice perpanjangan terbit otomatis 30 hari sebelum
                      berakhir, jadi domain tidak terputus. Kalau tidak
                      dibayar, domain ditangguhkan {DOMAIN_ADDON.suspendAfterMonths}{" "}
                      bulan setelah periode habis.
                    </p>
                  </div>
                ) : (
                  <DomainPurchaseForm
                    domain={tenant.customDomain}
                    price={DOMAIN_ADDON.price}
                    status={tenant.customDomainStatus}
                    suspendedAt={tenant.customDomainSuspendedAt}
                  />
                )
              ) : (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-sunken p-4">
                  <div className="flex items-center gap-2">
                    <WarningIcon size={20} className="text-status-pending" />
                    <p className="text-body-md font-medium text-foreground">
                      Belum terverifikasi
                    </p>
                  </div>
                  <p className="text-body-sm text-muted-foreground">
                    Arahkan CNAME untuk{" "}
                    <span className="font-mono">{tenant.customDomain}</span> ke
                    domain yang diberikan panel admin, lalu tunggu pemeriksaan
                    otomatis. Tagihan belum bisa dibeli sampai terverifikasi —
                    menagih domain yang belum bisa diakses berarti menagih atas
                    sesuatu yang belum berfungsi.
                  </p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-sunken p-4">
          <InfoIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">
            Harga {formatRupiah(DOMAIN_ADDON.price)} per tahun tidak naik, dan
            biaya FurniTech di Cloudflare {formatRupiah(188_667)} per tahun. Selisih
            Rp {formatRupiah(DOMAIN_ADDON.price - 188_667)} per tahun adalah
            margin — bukan biaya tersembunyi.
          </p>
        </div>
      </div>
    </main>
  );
}

function DomainStatusBadge({
  verified,
  status,
  berjalan,
}: {
  verified: boolean;
  status: "unpaid" | "active" | "suspended";
  berjalan: boolean;
}) {
  if (!verified) {
    return <Badge variant="pending">Belum terverifikasi</Badge>;
  }
  if (status === "suspended") {
    return <Badge variant="failed">Ditangguhkan</Badge>;
  }
  if (berjalan) {
    return <Badge variant="settled">Aktif</Badge>;
  }
  return <Badge variant="production">Terverifikasi, belum dibayar</Badge>;
}
