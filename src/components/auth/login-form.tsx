"use client";

import { useActionState } from "react";

import {
  signInWithMagicLink,
  signInWithPassword,
  type LoginState,
} from "@/lib/auth/actions";

function Field({
  id,
  label,
  type,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  required: boolean;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900 outline-none focus:border-amber-600"
      />
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "bg-red-100 text-red-600"
      : "bg-green-100 text-green-700";
  return (
    <p role="status" className={`rounded-xl px-3 py-2 text-sm ${toneClass}`}>
      {children}
    </p>
  );
}

/**
 * Formulir masuk: email/password dan magic link.
 *
 * `useActionState` adalah hook React, jadi komponen ini WAJIB "use client".
 * Server Action-nya tetap didefinisikan di server (src/lib/auth/actions.ts).
 */
export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [passwordState, passwordAction, passwordPending] = useActionState<
    LoginState,
    FormData
  >(signInWithPassword, {});
  const [otpState, otpAction, otpPending] = useActionState<LoginState, FormData>(
    signInWithMagicLink,
    {},
  );

  return (
    <div className="grid gap-6">
      <form action={passwordAction} className="grid gap-4">
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          required
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
        />
        {passwordState?.error ? (
          <Alert tone="error">{passwordState.error}</Alert>
        ) : null}
        <button
          type="submit"
          disabled={passwordPending}
          className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {passwordPending ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <form
        action={otpAction}
        className="grid gap-3 border-t border-slate-200 pt-4"
      >
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <p className="text-sm text-slate-700">
          Tidak punya password? Kirim tautan masuk ke email (magic link).
        </p>
        <Field
          id="email-otp"
          label="Email"
          type="email"
          autoComplete="username"
          required
        />
        {otpState?.error ? <Alert tone="error">{otpState.error}</Alert> : null}
        {otpState?.message ? (
          <Alert tone="success">{otpState.message}</Alert>
        ) : null}
        <button
          type="submit"
          disabled={otpPending}
          className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {otpPending ? "Mengirim…" : "Kirim magic link"}
        </button>
      </form>
    </div>
  );
}
