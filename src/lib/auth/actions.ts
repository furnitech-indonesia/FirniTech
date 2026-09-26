"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "./session";
import { homeForRole } from "./permissions";

export type LoginState = { error?: string; message?: string };

/** Cegah open redirect: `next` hanya boleh path internal dashboard/admin. */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Jangan bocok pesan error mentah: bisa memberi tahu apakah email terdaftar.
    return { error: "Email atau password salah." };
  }

  const session = await getSession();
  if (!session) {
    return {
      error:
        "Berhasil masuk, tetapi profil di database tidak ditemukan. Hubungi admin.",
    };
  }

  // `next` hanya dipakai bila role memang berhak; kalau tidak, pakai beranda peran.
  redirect(next ?? homeForRole(session.role));
}

export async function signInWithMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email wajib diisi." };
  }

  const supabase = await createSupabaseServerClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Harus URL absolut; tanpa ini email tautan masuk tidak terkirim.
      emailRedirectTo: appUrl ? `${appUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    return { error: "Gagal mengirim tautan masuk. Coba lagi nanti." };
  }

  return {
    message: "Tautan masuk sudah dikirim ke email. Cek kotak masuk Anda.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
