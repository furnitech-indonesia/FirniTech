"use client";

import { ZodForm } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { updateMaterialFormSchema } from "@/lib/schemas/material";
import { updateMaterial } from "@/lib/actions/materials";

/** Ubah data bahan baku. Stok TIDAK diubah di sini (lihat AdjustStockForm). */
export function EditMaterialForm({
  material,
}: {
  material: {
    id: string;
    name: string;
    category: string;
    unit: string;
    minStockAlert: string;
  };
}) {
  return (
    <ZodForm
      schema={updateMaterialFormSchema}
      action={updateMaterial}
      hidden={{ id: material.id }}
      defaultValues={{
        name: material.name,
        category: material.category,
        unit: material.unit,
        minStockAlert: material.minStockAlert,
      }}
      submitLabel="Simpan data bahan"
    >
      {(ctx) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField ctx={ctx} label="Nama" name="name" required />
            <TextField ctx={ctx} label="Kategori" name="category" required />
            <TextField ctx={ctx} label="Satuan" name="unit" required />
            <TextField
              ctx={ctx}
              label="Ambang minimum"
              name="minStockAlert"
              step="0.001"
              required
            />
          </div>
        </>
      )}
    </ZodForm>
  );
}
