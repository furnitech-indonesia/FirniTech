"use client";

import { ZodForm } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { variantFormSchema } from "@/lib/schemas/product";
import { createVariant } from "@/lib/actions/products";

/** Tambah variasi mebel (ukuran, jenis kayu, finishing lain). */
export function VariantForm({ productId }: { productId: string }) {
  return (
    <ZodForm
      schema={variantFormSchema}
      action={createVariant}
      hidden={{ productId }}
      defaultValues={{
        name: "",
        sku: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        woodType: "",
        finishingType: "",
        price: "",
      }}
      submitLabel="Tambah variasi"
    >
      {(ctx) => (
        <>
          <TextField
            ctx={ctx}
            label="Nama variasi"
            name="name"
            required
            placeholder="Ukuran Jumbo"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              ctx={ctx}
              label="Panjang (cm)"
              name="lengthCm"
              type="number"
              min="0"
            />
            <TextField
              ctx={ctx}
              label="Lebar (cm)"
              name="widthCm"
              type="number"
              min="0"
            />
            <TextField
              ctx={ctx}
              label="Tinggi (cm)"
              name="heightCm"
              type="number"
              min="0"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField ctx={ctx} label="Jenis kayu" name="woodType" />
            <TextField ctx={ctx} label="Finishing" name="finishingType" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              ctx={ctx}
              label="Harga (Rp)"
              name="price"
              hint="Kosongkan untuk memakai harga dasar."
            />
            <TextField ctx={ctx} label="SKU" name="sku" />
          </div>
        </>
      )}
    </ZodForm>
  );
}
