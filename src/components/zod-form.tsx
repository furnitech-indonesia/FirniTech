"use client";

import { useState, type ReactNode } from "react";
import {
  FormProvider,
  useForm,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "./form-state";

/**
 * Konteks form untuk komponen anak.
 *
 * Sengaja TIDAK menyertakan `watch`. `watch()` milik react-hook-form adalah
 * fungsi biasa, bukan hook: memanggilnya saat render membuat React Compiler
 * melewati memoisasi komponen (peringatan `react-hooks/incompatible-library`)
 * dan nilainya bisa stale di dalam subtree yang sudah di-memoize.
 *
 * Komponen yang butuh nilai langsung memakai `useWatch` — itu hook sungguhan,
 * dan di situ `useFormContext()` membacanya. Lihat
 * `src/components/payment-breakdown-live.tsx` untuk contohnya.
 */
export type ZodFormContext = {
  register: UseFormRegister<FieldValues>;
  errors: Record<string, { message?: string }>;
  setValue: (name: string, value: unknown) => void;
};

export type ZodFormSchema = z.ZodType;

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
export function ZodForm<S extends ZodFormSchema>({
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
  const [state, setState] = useState<FormState>({});

  const methods = useForm<FieldValues>({
    // zodResolver Infer antara tipe input dan output zod; cast di sini
    // karena FieldValues membuat keduanya jadi unknown.
    resolver: zodResolver(schema as never) as never,
    defaultValues: defaultValues as FieldValues | undefined,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (_values, event) => {
    // Form diambil dari event submit, bukan dari ref. Selain lebih langsung,
    // ini menghindari react-hooks/refs: pembacaan ref.current di dalam
    // callback tak bisa dibuktikan compiler hanya terjadi saat submit.
    const form = event?.target as HTMLFormElement | undefined;
    const formData = new FormData(form!);
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
    // reset() membersihkan nilai input teks; form.reset() juga mengosongkan
    // input file yang tidak diurus react-hook-form.
    reset();
    form?.reset();
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={onSubmit}
        noValidate
        className={className ?? "grid gap-4"}
      >
        {hidden
          ? Object.entries(hidden)
              .filter(([, value]) => value !== undefined && value !== "")
              .map(([name, value]) => (
                <input
                  key={name}
                  type="hidden"
                  name={name}
                  value={String(value)}
                />
              ))
          : null}

        {children({
          register,
          errors: errors as Record<string, { message?: string }>,
          setValue: (name: string, value: unknown) =>
            setValue(name as never, value as never),
        })}

        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state.message ? <Alert>{state.message}</Alert> : null}

        <Button
          type="submit"
          size="touch"
          disabled={isSubmitting}
          variant={tone === "danger" ? "destructive" : tone === "ghost" ? "outline" : "default"}
        >
          {isSubmitting ? "Memproses…" : submitLabel}
        </Button>
      </form>
    </FormProvider>
  );
}
