import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { homeForRole, type UserRole } from "./permissions";

/**
 * Session pengguna aktif.
 *
 * Dua lapis pengecekan, keduanya wajib:
 *   1. `supabase.auth.getUser()` — memvalidasi JWT ke server Auth. Jangan
 *      percaya isi cookie JWT tanpa validasi.
 *   2. Baris `public.users` — sumber kebenaran untuk role & tenant. Kolom ini
 *      yang dipakai RLS, jadi UI dan RLS tidak boleh berbeda pendapat.
 *
 * Ketiga fungsi dibungkus `cache()` React: satu request = satu panggilan ke
 * server Auth dan satu query profil, berapa pun kali halaman memakainya.
 */

export type Session = {
  userId: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
};

export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
});

export const getProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
});

/** Session lengkap, atau null kalau belum login / profil tidak ada. */
export const getSession = cache(async (): Promise<Session | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const profile = await getProfile(authUser.id);
  if (!profile) return null;

  return {
    userId: profile.id,
    email: authUser.email ?? profile.email,
    fullName: profile.fullName,
    role: profile.role,
    tenantId: profile.tenantId,
  };
});

/**
 * Wajib login. Kalau belum, lempar ke /login dengan `next` supaya user
 * kembali ke halaman yang tadi dituju setelah berhasil masuk.
 */
export async function requireSession(
  returnTo?: string,
): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(returnTo ?? "");
    redirect(`/login${next ? `?next=${next}` : ""}`);
  }
  return session;
}

/**
 * Wajib login DAN punya salah satu dari `roles`. Menolak dengan 403 (bukan
 * redirect ke login) karena user-nya memang sudah sah, hanya tidak berhak.
 */
export async function requireRole(
  roles: readonly UserRole[],
  returnTo?: string,
): Promise<Session> {
  const session = await requireSession(returnTo);
  if (!roles.includes(session.role)) {
    redirect("/forbidden");
  }
  return session;
}

/** Halaman beranda sesuai peran. */
export async function redirectToHome(): Promise<never> {
  const session = await getSession();
  redirect(session ? homeForRole(session.role) : "/login");
}
