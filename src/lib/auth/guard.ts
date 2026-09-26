import "server-only";

import { redirect } from "next/navigation";

import { getSession, type Session } from "./session";
import type { UserRole } from "./permissions";

/**
 * Guard untuk Server Action.
 *
 * WAJIB dipakai setiap action yang menulis data. Alasannya: klien Drizzle
 * memakai user postgres yang **bypass** RLS, jadi tidak ada mekanisme database
 * yang menahan action kalau tenantId-nya salah. Guard inilah yang menjadi
 * lapis keamanan pertama di sisi aplikasi.
 *
 * Pola pemakaian:
 *   const actor = await requireTenantWrite(["owner", "admin_penjualan"]);
 *   await db.insert(products).values({ ...data, tenantId: actor.tenantId });
 *
 * Catatan: `tenantId` SELALU diambil dari guard, tidak pernah dari FormData.
 * Menerima tenantId dari klien berarti user bisa menulis ke tenant lain.
 */

export class ActionError extends Error {}

export type Actor = Session & { tenantId: string };

/**
 * Authentikasi + role check + tenant terikat.
 * Redirect ke /forbidden bila role tidak sesuai, dan ke /login bila belum masuk.
 */
export async function requireTenantWrite(
  allowed: readonly UserRole[],
): Promise<Actor> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }
  if (!allowed.includes(session.role)) {
    redirect("/forbidden");
  }
  if (!session.tenantId) {
    // Super admin sengaja tidak punya tenant; ia harus memakai route admin.
    throw new ActionError("Akun ini tidak terikat pada tenant mana pun.");
  }

  return { ...session, tenantId: session.tenantId };
}

/** Sama seperti di atas, tapi untuk Super Admin yang butuh akses lintas tenant. */
export async function requireSuperAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/forbidden");
  return session;
}

/** Hanya untuk aksi baca: tetap memvalidasi role, tapi tidak menuntut tenant. */
export async function requireRoleForRead(
  allowed: readonly UserRole[],
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect("/forbidden");
  return session;
}

/** Bungkus pemanggilan action agar error tidak membocorkan stack trace ke user. */
export async function guard<T>(
  fn: () => Promise<T>,
  onError: (message: string) => T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ActionError) return onError(err.message);
    console.error("Action gagal:", err);
    return onError("Terjadi kesalahan tak terduga. Coba lagi.");
  }
}
