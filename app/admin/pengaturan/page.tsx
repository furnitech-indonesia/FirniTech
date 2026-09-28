import { PlatformSettingsForm } from "@/components/platform-settings-form";
import { SectionCard } from "@/components/panels";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { formatDateID } from "@/lib/format";
import { loadAddonSettingsSummary } from "@/lib/addons/settings";
import { loadEffectivePlans, loadSettingsSummary } from "@/lib/platform-settings";
import { PLAN_IDS } from "@/lib/plans";

export const metadata = { title: "Pengaturan Platform — FurniTech" };

/**
 * Pengaturan platform untuk super admin (Sprint 6).
 *
 * `requireSuperAdmin`, bukan `requireTenantWrite`: tabel `platform_settings`
 * tidak punya `tenant_id`, jadi tidak ada tenant yang bisa menulisnya. Halaman
 * ini juga tidak punya `TenantShell` — ini panel FurniTech, bukan panel
 * toko.
 */
export default async function PlatformSettingsPage() {
  await requireSuperAdmin();

  const [summary, plans, addons] = await Promise.all([
    loadSettingsSummary(),
    loadEffectivePlans(),
    loadAddonSettingsSummary(),
  ]);

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Pengaturan platform</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Berlaku untuk semua toko. Nilai bawaannya ada di kode; yang di sini
          hanya penimpis.
        </p>
      </header>

      <SectionCard
        title="Tarif & harga"
        description={
          summary.updatedAt
            ? `Terakhir diubah ${formatDateID(summary.updatedAt)}.`
            : "Belum pernah diubah — semua nilai memakai bawaan dari kode."
        }
      >
        <PlatformSettingsForm
          rateBps={summary.platformFeeRateBps}
          defaultRateBps={summary.defaultRateBps}
          plans={PLAN_IDS.map((id) => ({
            id,
            label: plans[id].label,
            priceMonthly: plans[id].priceMonthly,
            priceSource: plans[id].priceSource,
          }))}
          addons={addons}
        />
      </SectionCard>
    </main>
  );
}
