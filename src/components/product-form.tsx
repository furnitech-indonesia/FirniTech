"use client";

import { ZodForm } from "@/components/zod-form";
import {
  CheckboxField,
  FileField,
  FormSection,
  TextAreaField,
  TextField,
} from "@/components/rhf-fields";
import { productFormSchema, productSchema } from "@/lib/schemas/product";
import { createProduct, updateProduct } from "@/lib/actions/products";

/**
 * Form produk (buat & ubah) dengan validasi per field.
 *
 * Satu komponen melayani dua mode. Perbedaannya hanya skema yang dipakai,
 * sumber nilai awal, dan apakah ada upload foto — bukan logika form, supaya
 * tidak ada dua implementasi yang bisa berbeda.
 */
export function ProductForm({
  mode,
  product,
}: {
  mode: "create" | "edit";
  product?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    woodType: string;
    finishingType: string;
    basePrice: number;
    isPublished: boolean;
  };
}) {
  const isEdit = mode === "edit" && Boolean(product);

  const defaults = isEdit
    ? {
        name: product!.name,
        slug: product!.slug,
        description: product!.description ?? "",
        lengthCm: String(product!.lengthCm),
        widthCm: String(product!.widthCm),
        heightCm: String(product!.heightCm),
        woodType: product!.woodType,
        finishingType: product!.finishingType,
        basePrice: String(product!.basePrice),
        isPublished: product!.isPublished,
      }
    : {
        name: "",
        slug: "",
        description: "",
        lengthCm: "100",
        widthCm: "60",
        heightCm: "75",
        woodType: "",
        finishingType: "",
        basePrice: "",
        isPublished: true,
      };

  return (
    <ZodForm
      schema={isEdit ? productSchema : productFormSchema}
      action={isEdit ? updateProduct : createProduct}
      // id produk disuntikkan server sebagai field tersembunyi; nilainya
      // divalidasi ulang sebagai uuid dan kepemilikannya dicek di server.
      hidden={isEdit ? { id: product!.id } : undefined}
      defaultValues={defaults}
      submitLabel={isEdit ? "Simpan perubahan" : "Simpan produk"}
    >
      {(ctx) => (
        <>
          <TextField ctx={ctx} label="Nama produk" name="name" required />
          <TextField
            ctx={ctx}
            label="Slug"
            name="slug"
            placeholder="dibuat otomatis dari nama"
            hint="Dipakai di URL. Huruf kecil, angka, dan tanda hubung."
          />

          <FormSection title="Dimensi (cm) & bahan">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                ctx={ctx}
                label="Panjang"
                name="lengthCm"
                type="number"
                min="1"
                required
              />
              <TextField
                ctx={ctx}
                label="Lebar"
                name="widthCm"
                type="number"
                min="1"
                required
              />
              <TextField
                ctx={ctx}
                label="Tinggi"
                name="heightCm"
                type="number"
                min="1"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                ctx={ctx}
                label="Jenis kayu"
                name="woodType"
                required
                placeholder="Kayu Jati Perhutani"
              />
              <TextField
                ctx={ctx}
                label="Finishing"
                name="finishingType"
                required
                placeholder="Natural Matte"
              />
            </div>
          </FormSection>

          <TextField
            ctx={ctx}
            label="Harga dasar (Rp)"
            name="basePrice"
            required
            placeholder="12500000"
            hint="Rupiah penuh, tanpa tanda baca ribuan."
          />

          <TextAreaField ctx={ctx} label="Deskripsi" name="description" />

          {/* Foto hanya saat membuat: saat ubah, foto diatur terpisah. */}
          {isEdit ? null : (
            <FileField
              label="Foto produk"
              name="image"
              hint="JPEG/PNG/WebP/AVIF, maksimal 5 MB. Bucket privat — foto hanya dapat dilihat lewat signed URL."
            />
          )}

          <CheckboxField
            ctx={ctx}
            label="Tayangkan di storefront"
            name="isPublished"
            defaultChecked={defaults.isPublished}
          />
        </>
      )}
    </ZodForm>
  );
}
