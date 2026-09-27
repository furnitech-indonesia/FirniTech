"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "./session";
import { homeForRole } from "./permissions";
import { parseForm } from "@/lib/schemas/primitives";
import { magicLinkSchema, signInSchema } from "@/lib/schemas/auth";
import { registerFormSchema } from "@/lib/schemas/register";
import { PLANS } from "@/lib/plans";
import { isSlugAvailable, provisionOwner } from "@/lib/auth/provision";
import { createSaasCharge, isMidtransConfigured } from "@/lib/midtrans/saas";
import type { FormState } from "@/components/form-state";

export type LoginState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

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
  const next = safeNext(formData.get("next"));

  const parsed = parseForm(signInSchema, formData);
  if (!parsed.success) {
    return { error: parsed.message, fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Jangan bocok pesan error mentah: bisa memberi tahu apakah email
    // terdaftar atau tidak.
    return { error: "Email atau password salah." };
  }

  const session = await getSession();
  if (!session) {
    return {
      error:
        "Berhasil masuk, tetapi profil di database tidak ditemukan. Hubungi admin.",
    };
  }

  // `next` hanya dipakai bila role memang berhak; kalau tidak, beranda peran.
  redirect(next ?? homeForRole(session.role));
}

export async function signInWithMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = parseForm(magicLinkSchema, formData);
  if (!parsed.success) {
    return { error: parsed.message, fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
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

/** URL dasar aplikasi. Midtrans butuh URL absolut untuk redirect kembali. */
function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Server Action untuk pendaftaran owner.
 *
 * PEMBAGIAN TANGGUNG JAWAB di sini, dan disengaja:
 *   Berkas ini `"use server"`, jadi setiap export-nya menjadi endpoint HTTP
 *   yang bisa dipanggil siapa saja dengan argumen pilihan sendiri. Karena itu
 *   `provisionOwner()` TIDAK diekspor dari sini — ia hidup di
 *   src/lib/auth/provision.ts sebagai function server biasa yang tidak punya
 *   endpoint. Kalau diekspor sebagai `provisionOwner(input)`, siapa pun bisa
 *   meminta pembuatan akun owner tanpa email terverifikasi dan tanpa bayar.
 *
 *   Yang dipanggil di sini adalah fungsi server biasa yang sudah
 *   tervalidasi skemanya. Bedanya satu baris `export`, tapi bedanya adalah
 *   "dipanggil siapa pun" vs "harus lewat skema dan sesi".
 *
 * Urutan: validasi skema → provisioning (tenant + owner + invoice) → charge
 * Midtrans. Kalau charge gagal, tenant sudah ada dan tercatat `pending`;
 * itu bukan kondisi setengah jadi yang diam-diam, karena satu-satunya jalan
 * mengaktifkannya tetap webhook pembayaran.
 */
export async function registerOwner(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Otorisasi dulu, baru validasi.
  const session = await getSession();
  if (session) {
    return { error: "Anda sudah masuk. Tidak perlu mendaftar lagi." };
  }

  const parsed = parseForm(registerFormSchema, formData);
  if (!parsed.success) {
    return {
      error: "Periksa kembali isian Anda.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const result = await provisionOwner(parsed.data);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  /*
   * Tagihan Midtrans. Nominal `result.amount` dihitung ulang di server dari
   * `PLANS` (lihat `priceFor` di src/lib/auth/provision.ts) — angka dari
   * klien tidak pernah dipakai.
   *
   * PENTING: `try/catch` di sini bukan sekadar defensif. Tanpa itu, satu
   * `throw` dari `createSaasCharge` jadi halaman error 500, padahal
   * provisioning-nya SUDAH BERHASIL: akun, tenant, dan tagihan sudah
   * tertulis. Akibatnya pengguna mengulang pendaftaran, email-nya sudah
   * terpakai, dan pengguna tidak bisa memperbaiki keadaan sendiri. Jadi
   * kegagalan pembayaran dilaporkan sebagai hasil, bukan exception.
   *
   * Dua penyebab yang ditangani terpisah karena berbeda sifat:
   *   - Kredensial belum diisi: kondisi yang normal di lingkungan
   *     pengembangan, jadi diketahui, bukan kegagalan.
   *   - Midtrans menolak atau tidak bisa dihubungi: ini kegagalan sungguhan
   *     dan butuh dilihat admin.
   */
  try {
    const charge = await createSaasCharge({
      orderId: result.midtransOrderId,
      amount: result.amount,
      customerName: parsed.data.fullName,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      itemName: `FurniTech ${PLANS[parsed.data.plan].label} — ${
        parsed.data.period === "yearly" ? "tahunan" : "bulanan"
      }`,
      finishUrl: `${appUrl()}/login?next=/dashboard`,
    });

    return { redirectTo: charge.redirectUrl };
  } catch (error) {
    const notConfigured = !isMidtransConfigured();
    console.error("Gagal membuat tagihan Midtrans:", error);

    // Tenant sudah ada dan tercatat `pending`, jadi akunnya TIDAK dihapus di
    // sini. Emailnya sudah terpakai; menghapusnya hanya memindahkan masalah.
    // Halaman /menunggu-pembayaran yang menjelaskan kondisinya ke pengguna,
    // dan super admin bisa mengaktifkannya manual.
    //
    // Dikirim lewat `message`, BUKAN `error`. `ZodForm` hanya memanggil
    // `onSuccess` kalau `error` kosong, jadi memakai `error` di sini
    // berarti `redirectTo`-nya diabaikan: pengguna tetap tinggal di wizard,
    // menekan tombol lagi, lalu kena "email sudah terdaftar" — padahal
    // daftarnya sudah berhasil. Jadi langsung ke halaman login; setelah
    // masuk, tenant-nya ditahan app/dashboard/layout.tsx dan diteruskan ke
    // /menunggu-pembayaran, di situ kondisinya dijelaskan lengkap.
    return {
      message: notConfigured
        ? "Akun Anda sudah dibuat, tetapi pembayaran belum bisa diproses dari server ini. Masuk, lalu hubungi kami untuk mengaktifkan paket."
        : "Akun Anda sudah dibuat, tetapi tagihan pembayaran belum berhasil dibuat. Masuk, lalu hubungi kami — akun Anda aman.",
      redirectTo: "/login?next=/dashboard",
    };
  }
}

/**
 * Cek ketersediaan slug untuk pratinjau langsung di langkah 2.
 *
 * Endpoint publik yang menyentuh database, jadi dua hal yang dijaga:
 *
 * 1. Jawabannya hanya ya/tidak. Tidak pernah "slug ini dipakai workshop
 *   X" — slug yang terpakai adalah subdomain yang akan dipakai orang,
 *    jadi menyebut pemiliknya berarti memberi enumerasi pelanggan FurniTech
 *    ke publik. Informasi yang sama sudah bocor lewat halaman /t/<slug>
 *    (200 vs 404), jadi ini tidak menambah kebocoran apa pun.
 *
 * 2. Penegakan sebenarnya TIDAK di sini. Pemeriksaan ini hanya untuk
    * umpan balik; yang menentukan tetap `tenant_slug_idx` plus penanganan
 *    konflik di `provisionOwner`. Kalau kodenya hanya mengandalkan
 *    pemeriksaan ini, dua orang yang mengetik slug sama persis pada detik
 *    yang sama akan sama-sama lolos.
 */
export async function checkSlugAvailability(
  slugValue: string,
): Promise<{ available: boolean }> {
  const normalized = slugValue.trim().toLowerCase();
  if (!normalized) return { available: true };
  return { available: await isSlugAvailable(normalized) };
}
