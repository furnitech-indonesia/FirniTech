"use client";

import { useRef, useState, type ReactNode } from "react";
import { useForm, type UseFormRegister, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Alert, SubmitButton } from "@/components/ui";
import type { FormState } from "./action-form";

export type ZodFormContext = {
  register: UseFormRegister<FieldValues>;
  errors: Record<string, { message?: string }>;
  watch: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
};

/**
 * Form dengan validasi per field di browser.
 *
 * Batas RSC yang menentukan desain ini: skema zod TIDAK bisa dikirim dari
 * Server Component ke Client Component (tidak serializable). Jadi `ZodForm`
 * menerima skema sebagai IMPOR di dalam file Client Component, bukan sebagai
 * prop. Karena itu tidak ada form yang menerima `schema` dari server.
 *
 * Alur submit:
 *   1. react-hook-form memvalidasi dengan skema zod yang sama seperti server.
 *   2. Kalau valid, FormData diambil LANGSUNG dari elemen form. Hanya cara ini
 *      yang otomatis membawa nilai input file, yang tidak diurus RHF.
 *   3. Server Action memvalidasi ulang (lapis kedua, bukan yang utama).
 *
 * Field input wajib memakai `register` supaya tervalidasi di browser; input
 * file sengaja TIDAK terdaftar karena divalidasi terpisah di
 * src/lib/storage.ts.
 */
export function ZodForm<S extends z.ZodType>({
  schema,
  action,
  hidden,
  defaultValues,
  submitLabel,
  tone = "primary",
  className,
  children,
  onSuccess,
}: {
  schema: S;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hidden?: Record<string, string | number | undefined>;
  defaultValues?: z.input<S>;
  submitLabel: string;
  tone?: "primary" | "ghost" | "danger";
  className?: string;
  children: (ctx: ZodFormContext) => ReactNode;
  onSuccess?: (state: FormState) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<FormState>({});

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    // zodResolver Infer antara tipe input dan output zod; cast di sini
    // karena FieldValues membuat keduanya jadi unknown.
    resolver: zodResolver(schema as never) as never,
    defaultValues: defaultValues as FieldValues | undefined,
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async () => {
    // FormData diambil dari elemen form supaya input file ikut terbawa.
    const formData = new FormData(formRef.current!);
    const result = await action({}, formData);

    if (result.fieldErrors) {
      for (const [name, message] of Object.entries(result.fieldErrors)) {
        setError(name as never, { type: "server", message });
      }
    }

    if (result.error) {
      setState(result);
      return;
    }

    setState(result);
    onSuccess?.(result);
    reset();
    formRef.current?.reset();
  });

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className={className ?? "grid gap-4"}
    >
      {hidden
        ? Object.entries(hidden)
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))
        : null}

      {children({
        register,
        errors: errors as Record<string, { message?: string }>,
        watch: (name: string) => watch(name),
        setValue: (name: string, value: unknown) =>
          setValue(name as never, value as never),
      })}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pending={isSubmitting} tone={tone}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
