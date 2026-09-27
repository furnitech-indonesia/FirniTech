"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { ZodForm, type ZodFormContext } from "@/components/zod-form";
import { CheckboxField } from "@/components/rhf-fields";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { shippingRateFormSchema } from "@/lib/schemas/shipping";
import { saveShippingRate, type ShippingFormState } from "@/lib/actions/shipping";
import { provinces, regenciesOf } from "@/lib/wilayah";
import { formatRupiah } from "@/lib/format";

/**
 * Form tarif ongkir (Sprint 5 bagian 3).
 *
 *_dropdown_ — bukan teks bebas. Ini seluruh inti perbaikannya: `cityName` dulu
 * diisi bebas oleh pengrajin, dan hasilnya "Bandung" yang bisa berarti Kabupaten
 * Bandung atau Kota Bandung, serta "Jakarta" yang tidak ada sebagai satu
 * kabupaten. Pencocokan teks akan memilih kota yang salah tanpa error.
 * Sekarang pengrajin memilih dari pohon wilayah resmi, jadi `regencyId` benar
 * sejak awal.
 *
 * Karena provinsi dan kabupaten ada di snapshot bundel, form ini TIDAK pernah
 * memanggil jaringan — bisa dibuka dan diisi di bengkel dengan sinyal buruk.
 */
export function ShippingRateForm({
  existing,
  onDone,
}: {
  /** Baris yang sedang diedit. `null` = mode tambah. */
  existing?: {
    id: string;
    regencyId: string | null;
    isDefault: boolean;
    cityName: string;
    provinceName: string;
    rateAmount: number;
  } | null;
  onDone?: () => void;
}) {
  return (
    <ZodForm
      schema={shippingRateFormSchema}
      action={saveShippingRate as (
        s: ShippingFormState,
        f: FormData,
      ) => Promise<ShippingFormState>}
      hidden={existing ? { id: existing.id } : undefined}
      defaultValues={{
        provinceId: "",
        regencyId: existing?.regencyId ?? "",
        cityName: existing?.cityName ?? "",
        provinceName: existing?.provinceName ?? "",
        rateAmount: existing ? String(existing.rateAmount) : "",
        isDefault: existing?.isDefault ?? false,
      }}
      submitLabel={existing ? "Simpan perubahan" : "Tambah tarif"}
      onSuccess={() => onDone?.()}
    >
      {(ctx) => <ShippingRateFields ctx={ctx} />}
    </ZodForm>
  );
}

function ShippingRateFields({ ctx }: { ctx: ZodFormContext }) {
  const { setValue, getValues, watch } = useFormContext();
  const [provinceId, setProvinceId] = useState("");
  const [allRegions, setAllRegions] = useState(false);

  const regencies = regenciesOf(provinceId);

  function chooseProvince(id: string) {
    setProvinceId(id);
    const name = provinces.find((p) => p.id === id)?.name ?? "";
    setValue("provinceId", id);
    setValue("provinceName", name);
    setValue("regencyId", "");
    setValue("cityName", "");
  }

  function chooseRegency(id: string) {
    const regency = regencies.find((r) => r.id === id);
    setValue("regencyId", id);
    setValue("cityName", regency?.name ?? "");
  }

  return (
    <div className="grid gap-4">
      {/*
        `cityName` dan `provinceName` TIDAK punya input terlihat, jadi keduanya
        butuh input tersembunyi yang ikut FormData.

        Alasannya: `setValue()` pada field yang tidak terdaftar TIDAK
        melakukan apa-apa terhadap FormData. Versi pertama hanya memanggil
        `setValue` dan mengandalkan magically-nya nilai ikut terkirim — hasilnya
        form submit tanpa `cityName`, dan skema menolaknya dengan "Nama
        kota/kabupaten wajib diisi" padahal dropdown-nya sudah terisi.
        (`plan`/`period` di wizard pendaftaran punya masalah yang sama.)
      */}
      <input type="hidden" name="cityName" value={(watch("cityName") as string) ?? ""} readOnly />
      <input type="hidden" name="provinceName" value={(watch("provinceName") as string) ?? ""} readOnly />

      <CascadeSelect
        label="Provinsi"
        name="provinceId"
        value={provinceId}
        options={provinces}
        onChange={chooseProvince}
        error={ctx.errors.provinceId?.message}
      />

      {/*
        "Berlaku untuk semua wilayah" menggantikan pilihan kabupaten. Satu
        checkbox, bukan select dengan opsi kosong — karena "umum" itu kondisi
        yang sah dan sering dipakai, bukan ketidaktahuan.
      */}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
        <input
          type="checkbox"
          checked={allRegions}
          onChange={(event) => {
            const next = event.target.checked;
            setAllRegions(next);
            if (next) {
              setValue("regencyId", "");
              setValue("cityName", "Semua wilayah");
            }
          }}
          className="size-4"
        />
        <span className="text-body-md text-foreground">
          Berlaku untuk semua wilayah
          <span className="block text-body-sm text-muted-foreground">
            Dipakai kalau pembeli berasal dari kabupaten yang tidak punya tarif
            sendiri.
          </span>
        </span>
      </label>

      {!allRegions ? (
        <CascadeSelect
          label="Kabupaten / kota"
          name="regencyId"
          value={(getValues("regencyId") as string) ?? ""}
          options={regencies}
          disabled={!provinceId}
          placeholder={provinceId ? "Pilih kabupaten / kota" : "Pilih provinsi dulu"}
          onChange={chooseRegency}
          error={ctx.errors.regencyId?.message}
        />
      ) : null}

      <RupiahField ctx={ctx} />

      <CheckboxField
        ctx={ctx}
        label="Jadikan tarif cadangan"
        name="isDefault"
        hint="Dipakai untuk semua kabupaten yang tidak punya tarif khusus. Hanya boleh satu per toko."
      />
      {ctx.errors.isDefault?.message ? (
        <p className="text-body-sm text-destructive">
          {ctx.errors.isDefault.message}
        </p>
      ) : null}
    </div>
  );
}

/** Dropdown dengan gaya yang sama dengan dropdown wilayah di storefront. */
function CascadeSelect({
  label,
  name,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  error,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly { id: string; name: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined} className="gap-1.5">
      <FieldLabel htmlFor={`rate-${name}`}>
        {label} <span className="text-destructive">*</span>
      </FieldLabel>
      <select
        id={`rate-${name}`}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-body-md text-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
      >
        <option value="">{placeholder ?? `Pilih ${label.toLowerCase()}`}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

/**
 * Input nominal rupiah.
 *
 * Sengaja input `text` dengan `inputMode="numeric"`, bukan `type="number"`:
 * `number` menolak pemisah ribuan sehingga orang mengetik "12500000" tanpa
 * bisa memvatasi-money, dan di beberapa browser menampilkan spinner yang tidak
 * berguna di sini. Yang membersihkan dan menolak nilai non-angka adalah
 * `rupiah` di skema.
 */
function RupiahField({ ctx }: { ctx: ZodFormContext }) {
  const { watch } = useFormContext();
  const raw = (watch("rateAmount") as string) ?? "";
  const digits = raw.replace(/\D/g, "");
  const preview = digits ? formatRupiah(Number(digits)) : "";

  return (
    <Field
      data-invalid={ctx.errors.rateAmount ? true : undefined}
      className="gap-1.5"
    >
      <FieldLabel htmlFor="rate-amount">
        Tarif ongkir <span className="text-destructive">*</span>
      </FieldLabel>
      <input
        id="rate-amount"
        name="rateAmount"
        inputMode="numeric"
        value={raw}
        onChange={(event) => {
          ctx.setValue("rateAmount", event.target.value.replace(/\D/g, ""));
        }}
        aria-invalid={ctx.errors.rateAmount ? true : undefined}
        className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-body-md text-foreground text-code-tabular aria-invalid:border-destructive"
      />
      {ctx.errors.rateAmount?.message ? (
        <FieldError>{ctx.errors.rateAmount.message}</FieldError>
      ) : preview ? (
        <p className="text-body-sm text-muted-foreground">{preview}</p>
      ) : null}
    </Field>
  );
}
