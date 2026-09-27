-- =====================================================================
-- tenant_bank_accounts (Sprint 6) — rekening tujuan payout
-- =====================================================================
--
-- Tabelnya dibuat di migrasi 0019. Berkas ini policy + GRANT-nya.
--
-- KENAPA TABEL TERPISAH DARI `tenants` — DAN INI YANG MEMBUAT PERBEDAAN NYATA:
--
-- Kolom rekening sempat ada di `tenants`, dan policy `tenants_select` yang
-- sudah ada adalah `is_super_admin() or id = current_tenant_id()` — tanpa
-- penyaringan role. Artinya akun `kurir`, yang punya tenantId, bisa membaca
-- seluruh baris termasuk `account_name` yang bisa berisi nama orang.
--
-- Dualapis yang biasa dipakai tidak menutup ini:
--
--   * RLS menyaring BARIS. Baris tenant ini memang milik kurir juga, jadi
--     tidak ada yang bisa disaring.
--   * GRANT menyaring KOLOM per peran DATABASE. Tapi owner, admin penjualan,
--     dan kurir semuanya memakai peran `authenticated` — tidak ada peran
--     database per peran aplikasi.
--
-- Tabel terpisah dengan policy sendiri adalah satu-satunya yang bisa
-- ditegakkan, dan `test:kurir` menguji ini lewat JWT kurir sungguhan.
--
-- TIGA KEADAAN YANG DIBEDAKAN, BUKAN SATU:
--
--   unverified — rekening tersimpan, belum sempat dicek. Ini keadaan yang
--     paling sering, bukan error: selama `MIDTRANS_IRIS_API_KEY` kosong,
--     semua tenant berada di sini.
--   verified   — sudah dicek oleh Payouts.
--   failed     — ditolak, dan `validation_message` berisi alasannya.
--
-- Membedakan tiga ini penting karena dua yang pertama hanya menahan pencairan
-- tanpa ada yang perlu diperbaiki pengrajin. Menampilkan keduanya sebagai
-- "gagal" akan membuat orang-complain ke nomor yang salah.

alter table public.tenant_bank_accounts enable row level security;

-- PEMBACAAN: hanya owner dan admin penjualan. Kurir sengaja dikecualikan.
drop policy if exists tenant_bank_accounts_read on public.tenant_bank_accounts;
create policy tenant_bank_accounts_read on public.tenant_bank_accounts
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text in ('owner', 'admin_penjualan')
    )
  );

-- PENULISAN: hanya owner, dan hanya tenant-nya sendiri.
--
-- `admin_penjualan` tidak diberi menulis. Admin mengurus pesanan, sedangkan
-- rekening adalah keputusan siapa yang menarik uang — dan itu keputusan
-- owner. Perbandingan enum dibuat lewat `::text`, bukan literal enum, supaya
-- policy ini tidak ikut rusak kalau nilai enum ditambahkan nanti.
drop policy if exists tenant_bank_accounts_write on public.tenant_bank_accounts;
create policy tenant_bank_accounts_write on public.tenant_bank_accounts
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text = 'owner'
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text = 'owner'
    )
  );

-- Kolom `account_number` dan `account_name` dicabut dari `anon` sepenuhnya.
-- Policy di atas sudah menutup kedua peran, tapi mencabut hak akses
-- memberitahu siapa pun yang membaca migrasi ini bahwa kolom ini sensitif
-- — dan kalau suatu saat policy ini dilonggarkan tanpa disadari, yang terjadi
-- bukan "datanya bocor diam-diam", tapi 403 yang jelas.
revoke select on public.tenant_bank_accounts from anon;
