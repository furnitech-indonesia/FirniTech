import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { Field, Textarea } from "@/components/ui";
import { createProduct } from "@/lib/actions/products";
import { requireTenantWrite } from "@/lib/auth/guard";

export const metadata = { title: "Tambah Produk — FurniTech" };

export default async function NewProductPage() {
  await requireTenantWrite(["owner", "admin_penjualan"]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/produk" className="text-amber-700 hover:underline">
          ← Kembali ke katalog
        </Link>
      </p>

      <h1 className="mt-2 text-2xl font-bold text-slate-900">Tambah Produk</h1>
      <p className="mt-1 text-sm text-slate-600">
        Dimensi disimpan dalam cm bulat. Harga diisi rupiah penuh tanpa
        pemisah ribuan, contoh 12500000.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ActionForm action={createProduct} submitLabel="Simpan produk" encType="multipart/form-data">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama produk"
              name="name"
              required
              placeholder="Meja Makan Jati 6 Kursi"
              className="sm:col-span-2"
            />
            <Field
              label="Slug (opsional)"
              name="slug"
              placeholder="dibuat otomatis dari nama"
              hint="Dipakai di URL. Huruf kecil, angka, dan tanda hubung."
              className="sm:col-span-2"
            />
          </div>

          <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">
              Dimensi (cm) & bahan
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Panjang" name="lengthCm" type="number" min="1" defaultValue={100} required />
              <Field label="Lebar" name="widthCm" type="number" min="1" defaultValue={60} required />
              <Field label="Tinggi" name="heightCm" type="number" min="1" defaultValue={75} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Jenis kayu"
                name="woodType"
                required
                placeholder="Kayu Jati Perhutani"
              />
              <Field
                label="Finishing"
                name="finishingType"
                required
                placeholder="Natural Matte"
              />
            </div>
          </fieldset>

          <Field
            label="Harga dasar (Rp)"
            name="basePrice"
            type="number"
            min="0"
            required
            placeholder="12500000"
            hint="Rupiah penuh, tanpa tanda baca ribuan."
          />

          <Textarea
            label="Deskripsi"
            name="description"
            placeholder="Bahan, finishing, dan catatan tambahan."
          />

          <Field
            label="Foto produk"
            name="image"
            type="file"
            hint="JPEG/PNG/WebP/AVIF, maksimal 5 MB. Bucket privat — foto hanya dapat dilihat lewat signed URL."
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300"
            />
            Tayangkan langsung di storefront
          </label>
        </ActionForm>
      </div>
    </main>
  );
}
