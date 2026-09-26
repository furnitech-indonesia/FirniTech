import Link from "next/link";

import { CustomOrderForm } from "@/components/custom-order-form";
import { SectionCard } from "@/components/panels";
import { requireTenantWrite } from "@/lib/auth/guard";

export const metadata = { title: "Pesanan Kustom — FurniTech" };

export default async function NewCustomOrderPage() {
  await requireTenantWrite(["owner", "admin_penjualan"]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/pesanan" className="text-accent-foreground hover:underline">
          ← Kembali ke daftar pesanan
        </Link>
      </p>

      <h1 className="mt-2 text-2xl font-bold text-foreground">
        Catat Pesanan Kustom
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Untuk pesanan di luar katalog standar. Ongkos, fee platform, dan sisa
        tagihan dihitung ulang di server saat disimpan.
      </p>

      <div className="mt-6">
        <SectionCard>
          <CustomOrderForm />
        </SectionCard>
      </div>
    </main>
  );
}
