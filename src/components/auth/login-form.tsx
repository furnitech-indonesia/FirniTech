"use client";

import { useState } from "react";

import { ZodForm } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { magicLinkSchema, signInSchema } from "@/lib/schemas/auth";
import { signInWithMagicLink, signInWithPassword } from "@/lib/auth/actions";

/**
 * Formulir masuk: kata sandi atau tautan masuk (magic link).
 *
 * KEDUA CARA dibungkus tab, bukan ditumpuk. Versi sebelumnya menaruh form
 * magic link di bawah form kata sandi dengan pemisah garis, dan hasil
 * tangkapan layar menunjukkan dua field berlabel "Email" dalam satu kartu —
 * tidak ada yang bisa tahu email itu milik form yang mana. Tab membuat
 * hanya satu field email yang ada di DOM pada satu waktu, jadi masalahnya
 * hilang secara struktural, bukan diberi label yang lebih jelas.
 *
 * Urutan state (taste-skill §4.5: form harus punya siklus penuh):
 *   idle -> submitting -> error per-field atau pesan server -> sukses
 * Kirim ulang disembunyikan setelah sukses, karena mengulanginya tidak
 * accomplishes apa pun.
 *
 * `aria-pressed` menandai tab aktif: pilihan aktif harus terbaca screen
 * reader, tidak hanya terlihat berubah warna.
 */

type Mode = "password" | "magic-link";

const TABS = [
  { id: "password", label: "Kata sandi" },
  { id: "magic-link", label: "Tautan masuk" },
] as const;

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [sent, setSent] = useState<string | null>(null);

  return (
    <div>
      <div
        role="group"
        aria-label="Pilih cara masuk"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1"
      >
        {TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(tab.id)}
              className={`min-h-11 rounded-lg text-label-lg transition-colors ${
                active
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Catatan singkat per mode. Tidak ada eyebrow di halaman ini: hanya
          satu pesan per mode, dan label tab sudah menjelaskannya. */}
      <p className="mt-4 text-body-md text-muted-foreground">
        {mode === "password"
          ? "Masuk dengan email dan kata sandi yang Anda buat saat mendaftar."
          : "Kami mengirim tautan sekali pakai ke email. Tidak perlu mengingat kata sandi."}
      </p>

      <div className="mt-6">
        {mode === "password" ? (
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
                  label="Kata sandi"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </>
            )}
          </ZodForm>
        ) : sent ? (
          <div className="rounded-xl border border-status-settled/30 bg-status-settled-bg px-4 py-3">
            <p className="text-body-md text-status-settled">{sent}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Tautan berlaku sekali dan cepat kedaluwarsa. Belum masuk?{" "}
              <button
                type="button"
                onClick={() => setSent(null)}
                className="text-accent-foreground underline underline-offset-4"
              >
                Kirim ulang
              </button>
            </p>
          </div>
        ) : (
          <ZodForm
            schema={magicLinkSchema}
            action={signInWithMagicLink}
            defaultValues={{ email: "" }}
            submitLabel="Kirim tautan masuk"
            onSuccess={() =>
              setSent("Tautan masuk sudah dikirim. Cek kotak masuk Anda.")
            }
          >
            {(ctx) => (
              <TextField
                ctx={ctx}
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            )}
          </ZodForm>
        )}
      </div>
    </div>
  );
}
