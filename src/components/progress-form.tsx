"use client";

import { ZodForm } from "@/components/zod-form";
import {
  FileField,
  SelectField,
  TextAreaField,
} from "@/components/rhf-fields";
import { addProgressFormSchema, type ProgressStageValue } from "@/lib/schemas/order";
import { addProductionProgress } from "@/lib/actions/orders";

/**
 * Form unggah foto progres produksi (Visual Progress Tracker).
 *
 * Field foto sengaja TIDAK didaftarkan ke react-hook-form: RHF tidak
 * mengurus File, nilainya diambil dari FormData elemen form lalu divalidasi
 * di server (MIME + ukuran) oleh src/lib/storage.ts.
 */
export function ProgressForm({
  orderId,
  stageOptions,
}: {
  orderId: string;
  stageOptions: ReadonlyArray<{ value: ProgressStageValue; label: string }>;
}) {
  return (
    <ZodForm
      schema={addProgressFormSchema}
      action={addProductionProgress}
      hidden={{ orderId }}
      defaultValues={{ stage: stageOptions[0]?.value ?? "", notes: "" }}
      submitLabel="Simpan progres"
    >
      {(ctx) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              ctx={ctx}
              label="Tahap"
              name="stage"
              required
              options={stageOptions}
            />
            <FileField
              label="Foto bukti"
              name="photo"
              hint="JPEG/PNG/WebP/AVIF, maksimal 5 MB."
            />
          </div>
          <TextAreaField ctx={ctx} label="Catatan" name="notes" rows={2} />
        </>
      )}
    </ZodForm>
  );
}
