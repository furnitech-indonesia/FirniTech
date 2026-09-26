import Link from "next/link";

import { ProductForm } from "@/components/product-form";
import { requireTenantWrite } from "@/lib/auth/guard";

export const metadata = { title: "Tambah Produk — FurniTech" };

export default async function NewProductPage() {
  await requireTenantWrite(["owner", "admin_penjualan"]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm">
        <Link
          href="/dashboard/produk"
          className="text-amber-700 hover:underline"
        >
          ← Kembali ke katalog
        </Link>
      </p>

      <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Produk</h1>
      <p className="mt-1 text-sm text-slate-600">
        Dimensi disimpan dalam cm bulat. Harga diisi rupiah penuh tanpa pemisah
        ribuan, contoh 12500000.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ProductForm mode="create" />
      </div>
    </main>
  );
}
