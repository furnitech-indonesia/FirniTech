-- =====================================================================
-- Perbaikan trigger append-only: izinkan cascade, tolak delete langsung
-- =====================================================================
--
-- MASALAH YANG DIPERBAIKI:
--
-- `0015` memasang trigger yang menolak SEMUA update dan delete. Itu sendiri
-- benar — tapi trigger juga ikut menyalakan `ON DELETE CASCADE`, dan
-- cascades itu wajar dan perlu terjadi:
--
--   tenant dihapus  ->  orders ikut terhapus  ->  delivery_proofs ikut
--
-- Dengan trigger apa adanya, penghapusan tenant mustahil. Bukan "sulit" —
-- mustahil, karena cascade dari FK memanggil trigger yang sama. Gejalanya
-- baru terasa saat skrip test cleans up fiksturnya, dan di produksi gejalanya
-- adalah "owner tidak bisa berhenti jadi pelanggan".
--
-- `cleanup()` di `scripts/test-kurir.ts` menemukan ini lebih dulu, yang
-- beruntung: di produksi ia akan muncul sebagai account deletion yang gagal
-- dengan pesan yang sama sekali tidak menjelaskan penyebabnya.
--
-- BAGAIMAKAN MEMBEDAKAN KEDUA KASUS:
--
-- `pg_trigger_depth()`. Delete langsung oleh kurir atau aplikasi berjalan di
-- kedalaman 1. Delete yang datang dari cascade FK berjalan di kedalaman 2,
-- karena cascade itu sendiri dieksekusi oleh trigger referential-integrity
-- pada tabel induk, dan delete ke tabel anak terjadi di dalam trigger itu.
--
-- Sisi lemah yang jujur: `pg_trigger_depth()` adalah detail implementasi,
-- bukan kontrak yang dijamin. Kalau implementasi cascade di Postgres
-- berubah, ini ikut berubah tanpa ada yang memberi tahu.
--
-- Yang merciless menutup ruang gerak itu adalah langkah kedua di bawah:
-- GRANT. Aplikasi tidak pernah menghapus atau mengubah bukti lewat kode
-- mana pun, dan dengan trigger sebagai jaminan kedua, kegagalannya berarti
-- ada proses yang benar-benar salah — bukan policy yang lupa diperbarui.

create or replace function public.lock_delivery_proof()
returns trigger
language plpgsql
as $$
begin
  -- UPDATE tidak pernah boleh, dengan kedalaman berapa pun. Tidak ada
  -- cascade yang mengubah bukti.
  if tg_op = 'UPDATE' then
    raise exception
      'Bukti penerimaan tidak boleh diubah (order %)',
      old.order_id
      using errcode = 'restrict_violation';
  end if;

  -- DELETE langsung (kedalaman 1) ditolak; cascade (kedalaman > 1) diizinkan
  -- supaya penghapusan tenant dan order tidak terkunci.
  if pg_trigger_depth() = 1 then
    raise exception
      'Bukti penerimaan tidak boleh dihapus (order %)',
      old.order_id
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

-- Menutup jalur kedua: aplikasi tidak punya hak mengubah atau menghapus
-- bukti meski sebagai postgres. Postgres yang dipakai Drizzle adalah
-- superuser dan TIDAK bisa dibatasi GRANT, jadi ini hanya berlaku untuk
-- peran PostgREST — tapi itulah satu-satunya jalur yang bisa dicoba user
-- dengan membuat request sendiri.
revoke update, delete on public.delivery_proofs from anon, authenticated;
