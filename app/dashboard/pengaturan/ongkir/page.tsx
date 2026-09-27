import { requireTenantWrite } from "@/lib/auth/guard";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { tenants } from "@/db/schema";
import { NeedsReviewNotice } from "@/components/needs-review-notice";
import { ShippingRatesManager } from "@/components/shipping-rates-manager";
import { listShippingRates } from "@/lib/shipping";

export const metadata = { title: "Tarif Ongkir — FurniTech" };

/**
 * Pengaturan tarif ongkir (Sprint 5 bagian 3).
 *
 * Halaman ini menggantikan "kolom kota" bebas di form pesanan. Kalau tarif
 * masih diisi sebagai teks, sistemlah yang harus menebak kabupaten dari nama
 * kota — dan nama itu tidak unik: "Bandung" bisa Kabupaten Bandung atau Kota
 * Bandung, "Jakarta" tidak ada sebagai satu kabupaten sama sekali.
 */
export default async function ShippingRatesPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan"]);

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  const rates = await listShippingRates(actor.tenantId);

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-headline-md text-foreground">Tarif ongkir</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Berlaku untuk pesanan di toko {tenant?.name ?? "Anda"}. Tanpa tarif
          cadangan, pembeli dari kabupaten yang tidak terdaftar tidak bisa
          checkout.
        </p>
      </header>

      <NeedsReviewNotice tenantId={actor.tenantId} />

      <ShippingRatesManager rates={rates} />
    </main>
  );
}
