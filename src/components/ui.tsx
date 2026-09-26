import type { ReactNode } from "react";

/**
 * Primitif UI bersama untuk form back-office.
 * Sengaja tanpa dependency eksternal: DESIGN.md hanya butuh radius, warna, dan
 * tipografi — menambah library komponen baru belum perlu di fase ini.
 *
 * Kolom Input/Textarea/Select menerima `error` untuk pesan per field yang
 * berasal dari zod (lihat docs/validasi.md).
 */

const INPUT_CLASS =
  "w-full rounded-xl border bg-input px-3 py-2 text-foreground outline-none transition-colors focus:bg-card";

function inputClass(error?: string) {
  return error
    ? `${INPUT_CLASS} border-destructive focus:border-destructive`
    : `${INPUT_CLASS} border-border focus:border-primary`;
}

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
        `rounded-2xl border border-border bg-card shadow-sm ${bare ? "p-0" : "p-5"}`
      }
    >
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Pesan error per field, terhubung ke input lewat aria-describedby. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
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
  max,
  hint,
  error,
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
  max?: string;
  hint?: string;
  error?: string;
  className?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className={`grid gap-1 ${className ?? ""}`}>
      <label htmlFor={name} className="text-sm font-medium text-secondary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(error)}
      />
      {error ? (
        <FieldError id={errorId} message={error} />
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
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
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-secondary">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(error)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
  error,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-1">
      <label htmlFor={name} className="text-sm font-medium text-secondary">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(error)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
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
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    ghost: "border border-border text-secondary hover:bg-muted",
    danger: "bg-destructive text-primary-foreground hover:bg-destructive",
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
    error: "bg-status-failed-bg text-status-failed",
    success: "bg-status-settled-bg text-status-settled",
    info: "bg-muted text-muted-foreground",
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
  // Warna dari token status (globals.css) yang dipetakan ke DESIGN.md §3.
  const tones = {
    pending: "bg-status-pending-bg text-status-pending",
    production: "bg-status-production-bg text-status-production",
    quality: "bg-status-quality-bg text-status-quality",
    settled: "bg-status-settled-bg text-status-settled",
    failed: "bg-status-failed-bg text-status-failed",
    neutral: "bg-muted text-muted-foreground",
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
    <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
