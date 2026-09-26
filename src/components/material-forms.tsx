"use client";

import { ZodForm } from "@/components/zod-form";
import { SelectField, TextField } from "@/components/rhf-fields";
import {
  MATERIAL_CATEGORIES,
  adjustStockFormSchema,
  createMaterialSchema,
} from "@/lib/schemas/material";
import { adjustStock, createMaterial } from "@/lib/actions/materials";

/** Form tambah bahan baku. */
export function CreateMaterialForm() {
  return (
    <ZodForm
      schema={createMaterialSchema}
      action={createMaterial}
      defaultValues={{
        name: "",
        category: "Kayu",
        unit: "Pcs",
        quantity: "0",
        minStockAlert: "5",
      }}
      submitLabel="Tambah bahan"
    >
      {(ctx) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            ctx={ctx}
            label="Nama bahan"
            name="name"
            required
            placeholder="Papan Kayu Jati 200x20"
          />
          <SelectField
            ctx={ctx}
            label="Kategori"
            name="category"
            required
            options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <TextField
            ctx={ctx}
            label="Satuan"
            name="unit"
            required
            placeholder="m3, Liter, Pcs"
            hint="Satuan boleh pecahan, misalnya m3 atau Liter."
          />
          <TextField
            ctx={ctx}
            label="Stok awal"
            name="quantity"
            step="0.001"
            defaultValue="0"
          />
          <TextField
            ctx={ctx}
            label="Ambang minimum"
            name="minStockAlert"
            step="0.001"
            defaultValue="5"
            hint="Stok menyentuh nilai ini memicu Low Stock Alert."
          />
        </div>
      )}
    </ZodForm>
  );
}

const REASON_OPTIONS = [
  { value: "pembelian", label: "Pembelian (stok masuk)" },
  { value: "pemakaian", label: "Pemakaian (stok keluar)" },
  { value: "rusak", label: "Rusak / cacat" },
  { value: "koreksi", label: "Koreksi hasil hitung fisik" },
  { value: "retur", label: "Retur pelanggan" },
];

/**
 * Form penyesuaian stok.
 *
 * Kolom `quantity` di tabel materials TIDAK diubah langsung — hanya lewat form
 * ini, supaya setiap perubahan selalu punya baris di material_adjustments.
 */
export function AdjustStockForm({ materialId }: { materialId: string }) {
  return (
    <ZodForm
      schema={adjustStockFormSchema}
      action={adjustStock}
      hidden={{ materialId }}
      defaultValues={{ delta: "", reason: "pembelian", note: "" }}
      submitLabel="Simpan penyesuaian"
    >
      {(ctx) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              ctx={ctx}
              label="Jumlah"
              name="delta"
              step="0.001"
              required
              placeholder="+10"
              hint="Tanda plus untuk stok masuk, minus untuk keluar."
            />
            <SelectField
              ctx={ctx}
              label="Alasan"
              name="reason"
              required
              options={REASON_OPTIONS}
            />
          </div>
          <TextField ctx={ctx} label="Catatan" name="note" />
        </>
      )}
    </ZodForm>
  );
}
