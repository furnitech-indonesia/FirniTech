"use client";

import { useActionState, type ReactNode } from "react";

import { Alert, SubmitButton } from "@/components/ui";

export type FormState = { error?: string; message?: string };

/**
 * Pembungkus form untuk Server Action.
 *
 * `useActionState` adalah hook, jadi komponen ini harus "use client";
 * aksinya tetap Server Action yang didefinisikan di server. `children`
 * berisi field yang dirender di server, sehingga tidak ada duplikasi antara
 * nilai default dan nama field.
 *
 * Field tersembunyi (mis. id) lewat prop `hidden`. Nilainya WAJIB di-hardcode
 * dari server — jangan pernah meneruskan nilai yang berasal dari klien ke sini
 * tanpa memverifikasinya lebih dulu.
 */
export function ActionForm({
  action,
  children,
  hidden,
  submitLabel,
  tone = "primary",
  encType,
  className,
  onSuccess,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children?: ReactNode;
  hidden?: Record<string, string | number | undefined>;
  submitLabel: string;
  tone?: "primary" | "ghost" | "danger";
  encType?: "multipart/form-data";
  className?: string;
  onSuccess?: (state: FormState) => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const next = await action(prev, formData);
      if (!next.error) onSuccess?.(next);
      return next;
    },
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
