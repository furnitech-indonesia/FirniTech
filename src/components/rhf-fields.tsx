"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import type { ZodFormContext } from "./zod-form";

/**
 * Kolom form yang terhubung ke react-hook-form.
 *
 * `register` wajib dipasang pada `name` agar nilai ikut terkirim DAN
 * tervalidasi di browser. Input file TIDAK memakai komponen ini — file dibaca
 * dari FormData dan divalidasi di server.
 */

function FieldShell({
  label,
  name,
  error,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <div className={`grid gap-1 ${className ?? ""}`}>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-xl border bg-slate-100 px-3 py-2 text-slate-900 outline-none focus:bg-white";

function controlClass(error?: string) {
  return error
    ? `${CONTROL} border-red-400 focus:border-red-500`
    : `${CONTROL} border-slate-200 focus:border-amber-600`;
}

type TextFieldProps = {
  ctx: ZodFormContext;
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  step?: string;
  min?: string;
  max?: string;
  defaultValue?: string | number;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "defaultValue">;

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
}: TextFieldProps) {
  const error = ctx.errors[name]?.message;

  return (
    <FieldShell
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <input
        id={name}
        type={type}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={controlClass(error)}
        {...ctx.register(name)}
        {...rest}
      />
    </FieldShell>
  );
}

type AreaProps = {
  ctx: ZodFormContext;
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "defaultValue">;

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
}: AreaProps) {
  const error = ctx.errors[name]?.message;

  return (
    <FieldShell
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={controlClass(error)}
        {...ctx.register(name)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectProps = {
  ctx: ZodFormContext;
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "defaultValue">;

export function SelectField({
  ctx,
  label,
  name,
  options,
  defaultValue,
  required,
  hint,
  className,
  ...rest
}: SelectProps) {
  const error = ctx.errors[name]?.message;

  return (
    <FieldShell
      label={label}
      name={name}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <select
        id={name}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={controlClass(error)}
        {...ctx.register(name)}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Input file: TIDAK terdaftar ke RHF, nilainya diambil dari FormData. */
export function FileField({
  label,
  name,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  hint,
}: {
  label: string;
  name: string;
  accept?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-sm file:text-slate-700"
      />
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function CheckboxField({
  ctx,
  label,
  name,
  defaultChecked,
}: {
  ctx: ZodFormContext;
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  const error = ctx.errors[name]?.message;

  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          id={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="h-4 w-4 rounded border-slate-300"
          {...ctx.register(name)}
        />
        {label}
      </label>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{title}</legend>
      {children}
    </fieldset>
  );
}
