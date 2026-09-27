"use client";

import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as TextareaPrimitive } from "@/components/ui/textarea";
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ZodFormContext } from "./zod-form";

/**
 * Kolom form yang terhubung ke react-hook-form.
 *
 * PRIMITIFNYA dari shadcn/ui; yang lokal hanyalah cara memasang
 * `register` dan membaca `errors` ke dalamnya. Karena itu ada tepat satu
 * sumber gaya input di repo ini: komponen shadcn yang memakai token kita.
 *
 * Aturan: `register` WAJIB dipasang pada `name` supaya nilai ikut terkirim
 * dan tervalidasi di browser. Input file TIDAK memakai kolom ini — file dibaca
 * dari FormData dan divalidasi di server (src/lib/storage.ts).
 */

type Common = {
  ctx: ZodFormContext;
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  className?: string;
};

/** Shell satu field: label + kontrol + pesan error. */
function FieldShell({
  name,
  label,
  required,
  hint,
  error,
  className,
  control,
}: Common & { error?: string; control: ReactNode }) {
  return (
    <Field
      className={cn("gap-1.5", className)}
      // Menyalakan gaya error Field, Input, dan Select sekaligus.
      data-invalid={error ? true : undefined}
    >
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>

      {control}

      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

export function TextField({
  ctx,
  label,
  name,
  type = "text",
  placeholder,
  required,
  hint,
  step,
  min,
  max,
  defaultValue,
  className,
  ...rest
}: Common & {
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  defaultValue?: string | number;
} & Omit<React.ComponentProps<typeof Input>, "name" | "type" | "defaultValue">) {
  return (
    <FieldShell
      ctx={ctx}
      label={label}
      name={name}
      required={required}
      hint={hint}
      className={className}
      error={ctx.errors[name]?.message}
      control={
        <Input
          id={name}
          type={type}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={ctx.errors[name] ? true : undefined}
          {...ctx.register(name)}
          {...rest}
        />
      }
    />
  );
}

export function TextAreaField({
  ctx,
  label,
  name,
  rows = 3,
  placeholder,
  required,
  hint,
  defaultValue,
  className,
  ...rest
}: Common & {
  rows?: number;
  placeholder?: string;
  defaultValue?: string;
} & Omit<
  React.ComponentProps<typeof TextareaPrimitive>,
  "name" | "defaultValue"
>) {
  return (
    <FieldShell
      ctx={ctx}
      label={label}
      name={name}
      required={required}
      hint={hint}
      className={className}
      error={ctx.errors[name]?.message}
      control={
        <TextareaPrimitive
          id={name}
          rows={rows}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={ctx.errors[name] ? true : undefined}
          {...ctx.register(name)}
          {...rest}
        />
      }
    />
  );
}

/**
 * Kolom select.
 *
 * Dua detail yang mudah salah:
 *  1. Nilai dikirim lewat input tersembunyi bernama `name`, bukan lewat
 *     onValueChange saja. Dengan begitu nilainya tetap bagian FormData seperti
 *     kolom lain dan validasi server tidak perlu jalur khusus.
 *  2. Nilai saat ini dibaca dengan `useWatch`, BUKAN `watch()`. `watch` adalah
 *     fungsi biasa; memanggilnya saat render membuat React Compiler melewati
 *     memoisasi dan nilainya bisa basi di subtree yang sudah dimemoisasi.
 */
export function SelectField({
  ctx,
  label,
  name,
  options,
  defaultValue,
  required,
  hint,
  className,
  placeholder = "Pilih…",
}: Common & {
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  placeholder?: string;
}) {
  const { control } = useFormContext();
  const watched = useWatch({ control, name, defaultValue });
  const value = typeof watched === "string" ? watched : (defaultValue ?? "");

  /*
   * `items` WAJIB diteruskan ke `Select.Root`.
   *
   * Tanpa itu, `<SelectValue>` tidak punya cara tahu nilai mana yang sedang
   * dipilih, dan ia menampilkan VALUE-nya apa adanya. Gejalanya dropdown
   * "Bank" menampilkan `bca` alih-alih "Bank Central Asia (BCA)", dan
   * dropdown tahap produksi menampilkan `bahan_dipotong` alih-alih
   * "Bahan Dipotong".
   *
   * Ini bukan détaille kecil: daftar ini dibaca orang yang sedang memilih
   * rekening tujuan pencairannya, dan "bca" tidak يساعد siapa pun
   * memastikan dia memilih bank yang benar.
   *
   * Peta ini juga membuat opsi yang nilainya tidak ada di daftar (mis. kode
   * bank yang tersimpan tapi tidak lagi didukung) tetap tampil dengan label
   * apa adanya, bukan string kosong.
   */
  const items = Object.fromEntries(
    options.map((o) => [o.value, o.label]),
  );
  if (value && !(value in items)) items[value] = value;

  return (
    <FieldShell
      ctx={ctx}
      label={label}
      name={name}
      required={required}
      hint={hint}
      className={className}
      error={ctx.errors[name]?.message}
      control={
        <>
          <input type="hidden" name={name} value={value} />
          <SelectPrimitive
            value={value}
            onValueChange={(next) => ctx.setValue(name, next)}
            items={items}
          >
            <SelectTrigger
              id={name}
              aria-invalid={ctx.errors[name] ? true : undefined}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPrimitive>
        </>
      }
    />
  );
}

export function CheckboxField({
  ctx,
  label,
  name,
  defaultChecked,
  hint,
}: {
  ctx: ZodFormContext;
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <Field
      orientation="horizontal"
      className="gap-2"
      data-invalid={ctx.errors[name] ? true : undefined}
    >
      <Checkbox
        id={name}
        defaultChecked={defaultChecked}
        aria-invalid={ctx.errors[name] ? true : undefined}
        {...ctx.register(name)}
      />
      <FieldLabel htmlFor={name} className="text-sm text-secondary">
        {label}
      </FieldLabel>
      {ctx.errors[name] ? (
        <FieldError>{ctx.errors[name]!.message}</FieldError>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

/**
 * Input file: TIDAK terdaftar ke RHF. RHF tidak mengurus File; nilainya
 * diambil dari FormData elemen form lalu divalidasi di server.
 */
export function FileField({
  label,
  name,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  hint,
  required,
}: {
  label: string;
  name: string;
  accept?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:text-secondary"
      />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

/** Grup field dengan judul — pengganti <fieldset> buatan sendiri. */
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Field className="gap-3 rounded-xl border border-border p-3">
      <FieldLabel className="text-sm font-medium text-secondary">{title}</FieldLabel>
      {children}
    </Field>
  );
}

export { Label };
