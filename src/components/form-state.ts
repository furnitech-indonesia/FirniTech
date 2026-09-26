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
};
