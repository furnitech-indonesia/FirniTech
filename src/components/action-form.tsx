"use client";

import { useActionState, type ReactNode } from "react";

import { Alert, SubmitButton } from "@/components/ui";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Form sederhana untuk aksi tanpa input: tombol ubah status, tandai dibaca,
 * hapus, tugaskan. Tidak ada input yang perlu divalidasi di browser.
 *
 * Untuk form dengan input, JANGAN memakai ini — pakai `ZodForm`
 * (src/components/zod-form.tsx) yang memvalidasi per field di browser dengan
 * skema zod yang sama seperti di server.
 *
 * Field tersembunyi lewat prop `hidden`. Nilainya WAJIB di-hardcode dari
 * server; jangan pernah meneruskan nilai dari klien tanpa memverifikasi.
 */
export function ActionForm({
  action,
  children,
  hidden,
  submitLabel,
  tone = "primary",
  encType,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children?: ReactNode;
  hidden?: Record<string, string | number | undefined>;
  submitLabel: string;
  tone?: "primary" | "ghost" | "danger";
  encType?: "multipart/form-data";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form
      action={formAction}
      encType={encType}
      className={className ?? "grid gap-4"}
    >
      {hidden
        ? Object.entries(hidden)
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))
        : null}

      {children}

      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.message ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pending={pending} tone={tone}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
