import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase dengan service role — melewati RLS.
 *
 * HANYA untuk operasi yang memang harus di level sistem:
 *   - Membuat pengguna auth saat pendaftaran owner
 *   - Memperbarui `users.tenant_id` dan `role` setelah tenant dibuat
 *
 * KENAPA perlu service role dan bukan anon: saat signup, trigger
 * `handle_new_user` membuat baris `users` dengan `tenant_id = NULL` dan role
 * dipaksa jadi `admin_penjualan` (atau `tukang` bila diminta). Pengguna baru
 * belum jadi anggota tenant mana pun, jadi RLS dengan tenant_id NULL tidak
 * akan mengizinkannya memperbarui barisnya sendiri. Peningkatan menjadi owner
 * memang harus dilakukan di kode server — itu yang membuat `raw_user_meta_data`
 * tidak bisa dipakai untuk memalsukan role.
 *
 * DILARANG: jangan pernah mengimpor berkas ini dari Client Component. Kunci
 * service role = admin penuh Supabase. Kalau bocor ke bundle browser, rotasi
 * lewat dashboard.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset. Isi .env terlebih dahulu.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // Server tidak butuh sesi — dan TIDAK BOLEH memakai sesi, karena
      // session di sini berarti session admin, bukan session pengguna.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
