"use client";

import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "./form-state";

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
 *
 * `size="touch"` dipakai karena aksi ini sering dipakai di layar HP dan
 * PRD §3.1 menuntut target sentuh minimal 44px.
 */
export function ActionForm({
  action,
  children,
  hidden,
  submitLabel,
  tone = "primary",
  encType,
  className,
  size = "touch",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children?: ReactNode;
  hidden?: Record<string, string | number | undefined>;
  /**
   * Label tombol yang dirender ActionForm sendiri.
   *
   * OPSIONAL. Kalau dibiarkan kosong, ActionForm tidak merender tombol
   * apa pun dan `children`-lah yang jadi pemicu submit. Ini diperlukan di
   * daftar yang tombolnya ikon (hapus satu tarif), karena `ActionForm`
   * hanya punya ukuran `default` dan `touch` — tidak ada varian ikon, dan
   * menyarangkan `Button` di dalamnya menghasilkan DUA tombol: yang milik
   * ActionForm (dengan label kosong) dan yang milik pemanggil.
   */
  submitLabel?: string;
  tone?: "primary" | "ghost" | "danger";
  encType?: "multipart/form-data";
  className?: string;
  size?: "default" | "touch";
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

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.message ? <Alert>{state.message}</Alert> : null}

      {submitLabel ? (
        <Button
          type="submit"
          size={size}
          disabled={pending}
          variant={
            tone === "danger" ? "destructive" : tone === "ghost" ? "outline" : "default"
          }
        >
          {pending ? "Memproses…" : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
