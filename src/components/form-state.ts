/**
 * Bentuk kembalian (return value) bersama untuk Server Action berbasis form.
 *
 * Dipisah ke berkas sendiri supaya `ActionForm` dan `ZodForm` bisa sama-sama
 * memakainya tanpa mengimpor satu sama lain.
 */
export type FormState = {
  /** Pesan umum, mis. "Periksa kembali data yang Anda isi." */
  error?: string;
  /** Pesan sukses setelah aksi berhasil. */
  message?: string;
  /**
   * Pesan per field, kunci = nama field. Hasil zod di server; lihat
   * docs/validasi.md. Error TIDAK digabung jadi satu pesan supaya pengguna
   * tahu kolom mana yang salah.
   */
  fieldErrors?: Record<string, string>;
  /**
   * URL tujuan setelah aksi berhasil. Dipakai Server Action yang perlu
   * mengarahkan klien ke halaman lain — pendaftaran yang harus melompat ke
   * halaman pembayaran, misalnya.
   *
   * Dinyatakan di tipe bersama, bukan di tipe tiap action, supaya
   * `onSuccess` di ZodForm bisa membacanya tanpa cast per formulir.
   */
  redirectTo?: string;
};
