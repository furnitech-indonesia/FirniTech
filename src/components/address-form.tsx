"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CrosshairIcon, MapPinIcon } from "@phosphor-icons/react";

import { ZodForm, type ZodFormContext } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { addressFormSchema } from "@/lib/schemas/address-form";
import { saveAddress, type StorefrontActionState } from "@/lib/actions/storefront";
import {
  districtsOf,
  provinces,
  regenciesOf,
  villagesOf,
  type Region,
  type Village,
} from "@/lib/wilayah";

/**
 * Form alamat pengiriman bertingkat (Sprint 5 bagian 2).
 *
 * Empat dropdown berantai: Provinsi → Kabupaten/Kota → Kecamatan →
 * Desa/Kelurahan. Dua level pertama dari snapshot di bundel (jadi selalu bisa
 * dibuka, termasuk saat liring), dua level terakhir diambil dari API saat
 * dipilih.
 *
 * ATURAN YANG TIDAK BOLEH DILANGGAR:
 *
 * 1. **Mengubah level mengosongkan semua level di bawahnya.** Kalau provinsi
 *    diganti, kabupaten yang tadinya terpilih pasti tidak lagi benar.
 *    Membiarkannya terpilih menghasilkan alamat yang tidak pernah ada, dan
 *    lookup tarif ongkirnya diam-diam memakai tarif kota yang salah.
 *
 * 2. **Kode pos OTOMATIS tapi bisa dikoreksi.** Diisi dari `postal_code`
 *    desa. Tidak dipaksa: satu kode pos dipakai banyak desa, dan kalau
 *    kenyataannya berbeda, membiarkan orang memperbaikinya jauh lebih
 *    menolong daripada memaksa angka yang salah.
 *
 * 3. **Titik peta OPSIONAL.** `latitude`/`longitude` nullable. Peta bukan
 *    syarat — form harus bisa diselesaikan tanpa peta, dan saat luring tidak
 *    ada tile-nya. Soal privasi: koordinat disimpan, tapi tidak pernah
 *    ditampilkan di halaman lacak publik.
 */

export function AddressForm({
  tenantSlug,
  phone,
  onSaved,
}: {
  tenantSlug: string;
  /** Nomor pembelinya sudah diketahui oleh pemanggil. */
  phone: string;
  onSaved?: () => void;
}) {
  return (
    <ZodForm
      schema={addressFormSchema}
      action={saveAddress as (s: StorefrontActionState, f: FormData) => Promise<StorefrontActionState>}
      hidden={{ tenantSlug, phone }}
      defaultValues={{
        streetName: "",
        houseNumber: "",
        rt: "",
        rw: "",
        provinceId: "",
        regencyId: "",
        districtId: "",
        villageId: "",
        villageName: "",
        districtName: "",
        regencyName: "",
        provinceName: "",
        cityName: "",
        postalCode: "",
        latitude: "",
        longitude: "",
      }}
      submitLabel="Simpan alamat"
      onSuccess={() => onSaved?.()}
    >
      {(ctx) => (
        <div className="grid gap-5">
          <StreetFields ctx={ctx} />
          <RegionCascade ctx={ctx} />
          <CoordinatesField ctx={ctx} />
        </div>
      )}
    </ZodForm>
  );
}

/* ---------- Bagian jalan, nomor, RT/RW ---------- */

function StreetFields({ ctx }: { ctx: ZodFormContext }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="text-title-md text-foreground">Alamat jalan</legend>
      <TextField
        ctx={ctx}
        label="Nama jalan"
        name="streetName"
        required
        placeholder="Jl. Raya Bandung"
      />
      <div className="grid grid-cols-3 gap-3">
        <TextField ctx={ctx} label="Nomor" name="houseNumber" required />
        <TextField
          ctx={ctx}
          label="RT"
          name="rt"
          inputMode="numeric"
          hint="Opsional"
        />
        <TextField
          ctx={ctx}
          label="RW"
          name="rw"
          inputMode="numeric"
          hint="Opsional"
        />
      </div>
    </fieldset>
  );
}

/* ---------- Bagian wilayah bertingkat ---------- */

function RegionCascade({ ctx }: { ctx: ZodFormContext }) {
  const { setValue } = useFormContext();

  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [villageId, setVillageId] = useState("");

  /*
   * Status "memuat" dan "gagal" DITURUNKAN, bukan disimpan di state.
   *
   * Versi pertama menyimpannya sebagai `useState` dan mengisinya di dalam
   * body effect. Itu pola yang ditolak eslint (react-hooks/set-state-in-effect)
   * dan memang tidak benar: "sedang memuat" bukan fakta yang terjadi
   * saat render, melainkan akibat "regencyId baru saja berubah dan datanya
   * belum tiba". Menyimpulkannya dari `districtsFor !== regencyId` memberi
   * jawaban yang sama tanpa render tambahan.
   */
  const [districts, setDistricts] = useState<Region[] | null>(null);
  /** regencyId tempat data `districts` ini berasal. */
  const [districtsFor, setDistrictsFor] = useState<string | null>(null);
  const [districtFailed, setDistrictFailed] = useState<string | null>(null);

  const [villages, setVillages] = useState<Village[] | null>(null);
  const [villagesFor, setVillagesFor] = useState<string | null>(null);
  const [villagesFailed, setVillagesFailed] = useState<string | null>(null);

  const districtLoading =
    regencyId !== "" && districtsFor !== regencyId && districtFailed !== regencyId;
  const districtErrored = regencyId !== "" && districtFailed === regencyId;
  const villageLoading =
    districtId !== "" && villagesFor !== districtId && villagesFailed !== districtId;
  const villageErrored = districtId !== "" && villagesFailed === districtId;

  const regencies = regenciesOf(provinceId);

  // LOADING KECAMATAN. `AbortController` supaya pilihan yang diubah
  // berturut-turut tidak membuat request lama menimpa request yang lebih baru
  // — race yang kalau terjadi mengisi dropdown dengan kecamatan dari regency
  // yang sudah tidak dipilih.
  useEffect(() => {
    if (!regencyId) return;
    const controller = new AbortController();
    districtsOf(regencyId, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data) {
        setDistricts(data);
        setDistrictsFor(regencyId);
      } else {
        setDistricts(null);
        setDistrictFailed(regencyId);
      }
    });
    return () => controller.abort();
  }, [regencyId]);

  useEffect(() => {
    if (!districtId) return;
    const controller = new AbortController();
    villagesOf(districtId, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (data) {
        setVillages(data);
        setVillagesFor(districtId);
      } else {
        setVillages(null);
        setVillagesFailed(districtId);
      }
    });
    return () => controller.abort();
  }, [districtId]);

  return (
    <fieldset className="grid gap-4">
      <legend className="text-title-md text-foreground">Wilayah</legend>

      <SelectField
        label="Provinsi"
        name="provinceId"
        value={provinceId}
        options={provinces}
        onChange={(id) => {
          setProvinceId(id);
          const name = provinces.find((p) => p.id === id)?.name ?? "";
          setValue("provinceId", id);
          setValue("provinceName", name);
          // Aturan 1: kosongkan semua yang di bawahnya.
          setRegencyId("");
          setDistrictId("");
          setValue("regencyId", "");
          setValue("regencyName", "");
          setValue("cityName", "");
          setValue("districtId", "");
          setValue("districtName", "");
          setVillageId("");
          setValue("villageId", "");
          setValue("villageName", "");
          setValue("postalCode", "");
          setValue("latitude", "");
          setValue("longitude", "");
        }}
      />

      <SelectField
        label="Kabupaten / kota"
        name="regencyId"
        value={regencyId}
        disabled={!provinceId}
        placeholder={provinceId ? "Pilih kabupaten / kota" : "Pilih provinsi dulu"}
        options={regencies}
        onChange={(id) => {
          setRegencyId(id);
          const name = regencies.find((r) => r.id === id)?.name ?? "";
          setValue("regencyId", id);
          setValue("regencyName", name);
          setValue("cityName", name);
          setDistrictId("");
          setValue("districtId", "");
          setValue("districtName", "");
          setVillageId("");
          setValue("villageId", "");
          setValue("villageName", "");
          setValue("postalCode", "");
        }}
      />

      <SelectField
        label="Kecamatan"
        name="districtId"
        value={districtId}
        disabled={!regencyId}
        placeholder={
          !regencyId
            ? "Pilih kabupaten dulu"
            : districtLoading
              ? "Memuat kecamatan…"
              : districtErrored
                ? "Gagal memuat — isi manual di bawah"
                : "Pilih kecamatan"
        }
        options={districts ?? []}
        onChange={(id) => {
          setDistrictId(id);
          const name = districts?.find((d) => d.id === id)?.name ?? "";
          setValue("districtId", id);
          setValue("districtName", name);
          setVillageId("");
          setValue("villageId", "");
          setValue("villageName", "");
          setValue("postalCode", "");
        }}
      />

      <SelectField
        label="Desa / kelurahan"
        name="villageId"
        value={villageId}
        disabled={!districtId}
        placeholder={
          !districtId
            ? "Pilih kecamatan dulu"
            : villageLoading
              ? "Memuat desa…"
              : villageErrored
                ? "Gagal memuat — isi manual di bawah"
                : "Pilih desa / kelurahan"
        }
        options={(villages ?? []).map((v) => ({ id: v.id, name: v.name }))}
        onChange={(id) => {
          const village = villages?.find((v) => v.id === id);
          setVillageId(id);
          setValue("villageId", id);
          setValue("villageName", village?.name ?? "");
          // Aturan 2: kode pos otomatis tapi bisa dikoreksi di bawah.
          setValue("postalCode", village?.postal_code ?? "");
          if (typeof village?.lat === "number" && typeof village?.lng === "number") {
            setValue("latitude", String(village.lat));
            setValue("longitude", String(village.lng));
          }
        }}
      />

      {/*
       * Fallback wajib. Kalau API wilayah mati, form harus tetap bisa diisi —
       * orang tidak bisa berhenti memesan karena salah satu layanan pihak
       * ketiga sedang down. Field manual ini juga yang dipakai untuk desa
       * yang belum masuk dataset.
       */}
      <TextField
        ctx={ctx}
        label="Kode pos"
        name="postalCode"
        inputMode="numeric"
        hint="Terisi otomatis dari desa yang dipilih, bisa diubah."
      />

      {/*
        FIELD NAMA MANUAL HANYA MUNCUL SAAT API GAGAL.

        Versi pertama menampilkannya selalu, dengan alasan "fallback". Di layar
        itu muncul lima kolom untuk satu keputusan: pembeli memilih "Pondok
        Rajej" di dropdown, lalu melihat kolom teks "Pondok Rajej" tepat di
        bawahnya, lalu harus memikirkannya dua kali apakah harus mengisinya
        juga. Dua sumber untuk satu nilai juga berarti ada yang bisa tidak
        sinkron — dropdown terisi, teks kosong, dan server menyimpan yang salah.

        Field manual tetap ada, tapi hanya saat daftar wilayah benar-benar tidak
        bisa dimuat. Kalau muncul, isinya tidak redundant: dropdown-nya kosong.
      */}
      {districtErrored || villageErrored ? (
        <>
          <p className="rounded-xl border border-border bg-muted p-3 text-body-sm text-muted-foreground">
            Daftar wilayah tidak bisa dimuat. Periksa koneksi, atau isi nama
            desa, kecamatan, dan kabupaten sendiri di bawah.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField ctx={ctx} label="Nama desa/kelurahan" name="villageName" required />
            <TextField ctx={ctx} label="Nama kecamatan" name="districtName" required />
            <TextField ctx={ctx} label="Nama kabupaten/kota" name="regencyName" required />
            <TextField ctx={ctx} label="Nama provinsi" name="provinceName" required />
          </div>
        </>
      ) : null}

    </fieldset>
  );
}

/* ---------- Dropdown seragam ---------- */

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly { id: string; name: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  /*
   * `errors` TIDAK ada di level atas `useFormContext()`. Di
   * react-hook-form v7 error berada di `formState.errors`; akses
   * `form.errors` menghasilkan `undefined` dan komponen gagal saat render dengan
   * pesan "Cannot read properties of undefined".
   *
   * `ZodFormContext` di repo ini sudah menyembunyikan pembagian ini (lihat
   * src/components/zod-form.tsx) dengan mengekspos `errors` langsung. Tapi
   * `SelectField` berada di luar render prop itu, jadi ia membaca konteks
   * sendiri — dan harus tahu letaknya.
   */
  const form = useFormContext();
  const error = (form.formState.errors as Record<string, { message?: string } | undefined>)[name]
    ?.message;

  return (
    <Field data-invalid={error ? true : undefined} className="gap-1.5">
      <FieldLabel htmlFor={name}>
        {label} <span className="text-destructive">*</span>
      </FieldLabel>
      <select
        id={name}
        name={name}
        value={value}
        disabled={disabled}
        required
        aria-invalid={error ? true : undefined}
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

/* ---------- Titik koordinat (opsional) ---------- */

function CoordinatesField({ ctx }: { ctx: ZodFormContext }) {
  const { setValue, control } = useFormContext();
  const [state, setState] = useState<"idle" | "asking" | "done" | "error">("idle");

  /*
   * `useWatch`, bukan `watch("latitude")` saat render. `watch` adalah fungsi
   * biasa, bukan hook: memanggilnya saat render membuat React Compiler
   * melewati memoisasi dan nilainya bisa basi. Aturan ini sudah tercatat di
   * AGENTS.md dan di src/components/zod-form.tsx.
   */
  const [latitude, longitude] = useWatch({ control, name: ["latitude", "longitude"] });

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("error");
      return;
    }
    setState("asking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("latitude", position.coords.latitude.toFixed(7));
        setValue("longitude", position.coords.longitude.toFixed(7));
        setState("done");
      },
      () => {
        // Izin ditolak atau lokasi tidak tersedia. Ini BUKAN error form —
        // koordinat opsional, jadi form tetap bisa diselesaikan tanpa ini.
        setState("error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-title-md text-foreground">Titik peta (opsional)</legend>
      <FieldDescription>
        Membantu kurir menemukan lokasi. Tidak wajib — alamat di atas sudah
        cukup, dan form tetap bisa diselesaikan tanpa ini.
      </FieldDescription>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <TextField ctx={ctx} label="Latitude" name="latitude" inputMode="decimal" readOnly />
          <TextField ctx={ctx} label="Longitude" name="longitude" inputMode="decimal" readOnly />
        </div>
        <Button
          type="button"
          variant="outline"
          size="touch"
          onClick={useMyLocation}
          disabled={state === "asking"}
          className="sm:w-auto"
        >
          <CrosshairIcon size={18} weight="regular" aria-hidden />
          {state === "asking" ? "Meminta izin…" : "Pakai lokasi saya"}
        </Button>
      </div>

      <p aria-live="polite" className="text-body-sm text-muted-foreground">
        {state === "done" ? (
          <span className="flex items-center gap-1 text-status-settled">
            <MapPinIcon size={14} weight="fill" aria-hidden />
            Titik tersimpan. Bisa diubah dengan menekan ulang.
          </span>
        ) : state === "error" ? (
          "Lokasi tidak bisa diambil. Tidak masalah — biarkan kosong atau isi manual."
        ) : latitude && longitude ? (
          "Titik sudah terisi."
        ) : (
          "Belum ada titik. Tekan “Pakai lokasi saya” atau biarkan kosong."
        )}
      </p>
    </fieldset>
  );
}
