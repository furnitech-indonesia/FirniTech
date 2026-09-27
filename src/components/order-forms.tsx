"use client";

import { ZodForm } from "@/components/zod-form";
import { SelectField, TextField } from "@/components/rhf-fields";
import {
  assignCarpenterFormSchema,
  assignCourierFormSchema,
  recordPaymentFormSchema,
  setTrackingFormSchema,
} from "@/lib/schemas/order";
import {
  assignCarpenter,
  assignCourier,
  recordPayment,
  setTracking,
} from "@/lib/actions/orders";

/**
 * Form aksi pesanan yang punya input: penugasan tukang, pembayaran, dan resi.
 *
 * Semua memakai ZodForm agar error per field muncul tanpa menunggu
 * server. `ActionForm` hanya untuk aksi tanpa input (ubah status, hapus).
 */

export function AssignCarpenterForm({
  orderId,
  carpenters,
  assignedTo,
}: {
  orderId: string;
  carpenters: ReadonlyArray<{ id: string; fullName: string }>;
  assignedTo: string | null;
}) {
  const current = assignedTo ?? "";
  const options = [
    { value: "", label: "— belum ditugaskan —" },
    ...carpenters
      .filter((c) => c.id !== assignedTo)
      .map((c) => ({ value: c.id, label: c.fullName })),
  ];

  return (
    <ZodForm
      schema={assignCarpenterFormSchema}
      action={assignCarpenter}
      hidden={{ orderId }}
      defaultValues={{ carpenterId: current }}
      submitLabel="Simpan penugasan"
    >
      {(ctx) => (
        <SelectField
          ctx={ctx}
          label="Tukang produksi"
          name="carpenterId"
          defaultValue={current}
          options={options}
          placeholder="— belum ditugaskan —"
        />
      )}
    </ZodForm>
  );
}

/**
 * Penugasan kurir pengantar.
 *
 * Komponen terpisah dari `AssignCarpenterForm`, bukan mode yang sama dengan
 * parameter `role`. Alasannya bentuknya memang sama, tapi label,-Allowlist
 * candidate, dan pesan kesalahannya berbeda — dan menyatukannya berarti
 * setiap perubahan pada satu alur bisa diam-diam mengubah yang lain.
 *
 * `couriers` sudah difilter `role = 'kurir'` di server. Kalau daftar ini
 * ikut menampilkan user lain, pengrajin akan menugaskan orang yang tidak
 * punya akses halaman `/kurir`, dan orang itu akan melihat daftar kosong
 * tanpa penjelasan.
 */
export function AssignCourierForm({
  orderId,
  couriers,
  assignedTo,
}: {
  orderId: string;
  couriers: ReadonlyArray<{ id: string; fullName: string }>;
  assignedTo: string | null;
}) {
  const current = assignedTo ?? "";
  const options = [
    { value: "", label: "— belum ditugaskan —" },
    ...couriers
      .filter((c) => c.id !== assignedTo)
      .map((c) => ({ value: c.id, label: c.fullName })),
  ];

  return (
    <ZodForm
      schema={assignCourierFormSchema}
      action={assignCourier}
      hidden={{ orderId }}
      defaultValues={{ courierId: current }}
      submitLabel="Simpan penugasan"
    >
      {(ctx) => (
        <SelectField
          ctx={ctx}
          label="Kurir pengantar"
          name="courierId"
          defaultValue={current}
          options={options}
          placeholder="— belum ditugaskan —"
        />
      )}
    </ZodForm>
  );
}

export function RecordPaymentForm({
  orderId,
  remaining,
}: {
  orderId: string;
  remaining: number;
}) {
  return (
    <ZodForm
      schema={recordPaymentFormSchema}
      action={recordPayment}
      hidden={{ orderId, mode: "dp" }}
      defaultValues={{ mode: "dp", amount: String(remaining) }}
      submitLabel="Catat pelunasan"
    >
      {(ctx) => (
        <TextField
          ctx={ctx}
          label="Nominal pelunasan (Rp)"
          name="amount"
          placeholder={String(remaining)}
          hint="Mencatat pelunasan akan menutup pesanan bila sudah penuh."
        />
      )}
    </ZodForm>
  );
}

/** Resi hanya relevan setelah pesanan siap dikirim; validasinya di server. */
export function TrackingForm({
  orderId,
  cargoName,
  trackingNumber,
}: {
  orderId: string;
  cargoName: string | null;
  trackingNumber: string | null;
}) {
  return (
    <ZodForm
      schema={setTrackingFormSchema}
      action={setTracking}
      hidden={{ orderId }}
      defaultValues={{
        cargoName: cargoName ?? "",
        trackingNumber: trackingNumber ?? "",
      }}
      submitLabel="Simpan resi"
    >
      {(ctx) => (
        <>
          <TextField
            ctx={ctx}
            label="Nama kargo"
            name="cargoName"
            placeholder="Indah Logistik Kargo"
          />
          <TextField
            ctx={ctx}
            label="Nomor resi"
            name="trackingNumber"
            placeholder="1234567890"
          />
        </>
      )}
    </ZodForm>
  );
}
