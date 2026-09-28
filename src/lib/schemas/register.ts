import { z } from "zod";

import { email, phone, slug, text } from "./primitives";
import { PLAN_IDS, PLANS } from "@/lib/plans";

/**
 * Skema wizard pendaftaran owner.
 *
 * Empat langkah, tapi tiga skema. Langkah 1, 2, dan 3-forms hidup di satu
 * form HTML yang dikirim sekali di akhir (lihat register-form.tsx), jadi
 * tidak perlu state antar-langkah di server. Yang dipisah per skema adalah
 * bentuk datanya, bukan lifecycle-nya.
 *
 * Aturan yang berlaku untuk semua langkah:
 *   - `*FormSchema` TIDAK boleh memuat id milik server (tenantId, userId).
 *     Server menyuntikkannya sendiri setelah validasi.
 *   - Otorisasi selalu lebih dulu, baru validasi. Kalau validasi didahulukan,
 *     server membocorkan bentuk data yang diterima ke pemanggil yang tidak berhak.
 */

/** Langkah 1 — akun. */
export const accountFormSchema = z
  .object({
    fullName: text("Nama lengkap", 120),
    phone: phone,
    email,
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter.")
      .max(200, "Kata sandi terlalu panjang.")
      // Kompleksitas minimum. Sengaja tidak memakai aturan JWT: aturan yang
      // terlalu arcane hanya membuat orang memakai "Password123!" untuk
      // semua akun.
      .regex(/[a-z]/, "Kata sandi harus punya huruf kecil.")
      .regex(/[A-Z]/, "Kata sandi harus punya huruf besar.")
      .regex(/[0-9]/, "Kata sandi harus punya angka."),
    confirmPassword: z.string().min(1, "Ulangi kata sandi."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Kata sandi tidak sama.",
    path: ["confirmPassword"],
  });

/**
 * Slug yang tidak boleh dipakai tenant.
 *
 * Sekarang belum ada benturan path — tenant diakses lewat `/t/<slug>`, dan
 * halaman platform ada di root. Daftar ini disediakan karena begitu mode
 * host-based aktif, `<slug>.furnitech.id` bisa bertabrakan dengan subdomain
 * milik platform. Menolak di level skema jauh lebih murah daripada
 * membatalkan tenant yang sudah membayar.
 *
 * WAJIB dideklarasikan SEBELUM `workshopFormSchema` di bawah. `const` punya
 * temporal dead zone, dan `.refine()` di dalam skema dijalankan saat modul
 * dievaluasi — kalau `new Set()` ada di baris yang lebih bawah, yang terjadi
 * adalah ReferenceError saat import, bukan error yang bisa dibaca.
 */
const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "dashboard",
  "login",
  "daftar",
  "auth",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "assets",
  "static",
  "help",
  "support",
  "status",
  "billing",
  "docs",
  "about",
  "blog",
  "t",
  "forbidden",
  "staging",
  "test",
  "dev",
]);

/** Langkah 2 — workshop. */
export const workshopFormSchema = z.object({
  workshopName: text("Nama workshop", 120),
  slug: slug.refine(
    (v) => !RESERVED_SLUGS.has(v),
    "Slug ini dipakai platform. Pilih yang lain.",
  ),
});

/** Langkah 3 — paket. */
export const planFormSchema = z.object({
  plan: z.enum(PLAN_IDS, { message: "Pilih paket langganan." }),
  period: z.enum(["monthly", "yearly"], { message: "Pilih periode pembayaran." }),
  /**
   * Paket Pendirian PT Perorangan, dibeli sekalian di langkah ini (PRD §2.E).
   *
   * `.default(false)` itu wajib, bukan permesinan. Checkbox yang tidak
   * dicentang TIDAK ADA di FormData sama sekali -- `formData.get()` mengembalikan
   * `null` dan kuncinya hilang dari objek hasil `formDataToObject`. Tanpa
   * default, `z.boolean()` menolak field yang memang tidak dikirim, dan
   * pendaftaran gagal untuk semua orang yang tidak ingin add-on -- yaitu
   * HAMPIR semua orang.
   *
   * Bentuk nilainya tidak pernah dipercaya: kalau ada yang mengirim
   * `tambahLegalitas: true` tanpa centang, yang terjadi adalah dia
   * ditagih Rp 500.000 yang tidak dia minta. Sebaliknya, tidak ada jalan
   * mendapatkan add-on tanpa dibayar -- invoice-nya dibuat dari nilai yang
   * sama dengan yang jadi nominal charge.
   */
  tambahLegalitas: z.boolean().default(false),
});

/** Bentuk lengkap yang dikirim Server Action. */
export const registerFormSchema = accountFormSchema
  .and(workshopFormSchema)
  .and(planFormSchema);

export type RegisterInput = z.infer<typeof registerFormSchema>;

/**
 * Harga yang harus dibayar, dihitung ulang DI SERVER dari `PLANS`.
 *
 * Nominal dari klien tidak pernah dipercaya. Kalau tidak, orang bisa mengirim
 * `amount: 1` dan mendapat paket Max.
 */
export function priceFor(plan: keyof typeof PLANS, period: "monthly" | "yearly") {
  return period === "yearly" ? PLANS[plan].priceYearly : PLANS[plan].priceMonthly;
}
