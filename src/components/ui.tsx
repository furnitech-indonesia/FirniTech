import type { ReactNode } from "react";

/**
 * Primitif UI bersama untuk form back-office.
 * Sengaja tanpa dependency eksternal: DESIGN.md hanya butuh radius, warna, dan
 * tipografi — menambah library komponen baru belum perlu di fase ini.
 */

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900 outline-none focus:border-amber-600 focus:bg-white";

export function Card({
  title,
  description,
  children,
  actions,
  className,
  bare,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Tanpa padding — untuk kartu yang berisi daftar/tabel. */
  bare?: boolean;
}) {
  return (
    <section
      className={
        className ??
        `rounded-2xl border border-slate-200 bg-white shadow-sm ${bare ? "p-0" : "p-5"}`
      }
    >
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  step,
  min,
  hint,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-1 ${className ?? ""}`}>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      />
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  rows = 3,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  tone = "primary",
}: {
  children: ReactNode;
  pending?: boolean;
  tone?: "primary" | "ghost" | "danger";
}) {
  const tones = {
    primary: "bg-amber-600 text-white hover:bg-amber-700",
    ghost: "border border-slate-200 text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60 ${tones[tone]}`}
    >
      {pending ? "Memproses…" : children}
    </button>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-red-100 text-red-600",
    success: "bg-green-100 text-green-700",
    info: "bg-slate-100 text-slate-700",
  } as const;

  return (
    <p role="status" className={`rounded-xl px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "pending" | "production" | "quality" | "settled" | "failed" | "neutral";
  children: ReactNode;
}) {
  // Warna mengikuti DESIGN.md §3 (indikator status).
  const tones = {
    pending: "bg-yellow-100 text-yellow-600",
    production: "bg-blue-100 text-blue-600",
    quality: "bg-purple-100 text-purple-600",
    settled: "bg-green-100 text-green-600",
    failed: "bg-red-100 text-red-600",
    neutral: "bg-slate-100 text-slate-700",
  } as const;

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
      {message}
    </p>
  );
}
