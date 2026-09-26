"use client";

import { useState } from "react";

import { ZodForm } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { magicLinkSchema, signInSchema } from "@/lib/schemas/auth";
import { signInWithMagicLink, signInWithPassword } from "@/lib/auth/actions";

/**
 * Formulir masuk: email/password dan magic link.
 *
 * `useActionState` digantikan `ZodForm` supaya email salah format langsung
 * ditunjuk ke kolomnya, bukan menunggu bolak-balik ke server. Password tetap
 * hanya divalidasi di server — tidak pernah Rulesaboutnya dikirim ke klien.
 */
export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [sent, setSent] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <ZodForm
        schema={signInSchema}
        action={signInWithPassword}
        hidden={nextPath ? { next: nextPath } : undefined}
        defaultValues={{ email: "", password: "" }}
        submitLabel="Masuk"
      >
        {(ctx) => (
          <>
            <TextField
              ctx={ctx}
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
            <TextField
              ctx={ctx}
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </>
        )}
      </ZodForm>

      <div className="grid gap-3 border-t border-border pt-4">
        <p className="text-sm text-secondary">
          Tidak punya password? Kirim tautan masuk ke email (magic link).
        </p>
        {sent ? (
          <p className="rounded-xl bg-status-settled-bg px-3 py-2 text-sm text-status-settled">
            {sent}
          </p>
        ) : (
          <ZodForm
            schema={magicLinkSchema}
            action={signInWithMagicLink}
            defaultValues={{ email: "" }}
            submitLabel="Kirim magic link"
            tone="ghost"
            onSuccess={() =>
              setSent("Tautan masuk sudah dikirim. Cek kotak masuk Anda.")
            }
          >
            {(ctx) => (
              <>
                <TextField
                  ctx={ctx}
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </>
            )}
          </ZodForm>
        )}
      </div>
    </div>
  );
}
