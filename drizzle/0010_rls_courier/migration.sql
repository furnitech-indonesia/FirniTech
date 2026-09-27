-- =====================================================================
-- RLS untuk peran KURIR (Sprint 6, keputusan pemilik produk 2026-09-27)
-- =====================================================================
--
-- PRINSIP: kurir adalah peran dengan akses paling sempit di seluruh sistem.
-- Ia hanya boleh melihat pesanan yang `assigned_courier_id` = dirinya, dan
-- satu-satunya yang boleh ia lakukan adalah mencatat bukti penerimaan.
--
-- KENAPA INI BUTUH POLICY SENDIRI, bukan memakai `is_tenant_staff()`:
-- fungsi itu mengembalikan TRUE untuk SEMUA peran tenant. Kalau kurir ikut
-- memakainya, satu akun kurir akan melihat seluruh pesanan tenant — termasuk
-- nama, alamat, dan nominal pembeli dari order orang lain di workshop yang
-- sama. Itu kebocoran data antar-pengguna DALAM satu tenant, dan RLS adalah
-- lapisan yang benar-benar menahannya, bukan sekadar penyaring tampilan.
--
-- CATATAN SOAL `::text`: nilai enum `'kurir'` dibandingkan lewat `::text`,
-- bukan sebagai literal enum. Postgres menolak memakai nilai enum yang baru
-- ditambahkan pada transaksi yang sama dengan `ALTER TYPE ... ADD VALUE`
-- (masih "unsafe use of new value"). Migration 0009 sudah selesai dijalankan,
-- jadi perbandingan langsung sebenarnya aman sekarang — tapi ditulis sebagai
-- teks supaya policy ini tetap bisa dijalankan ulang di database yang belum
-- pernah kena 0009 tanpa gagal di tengah.

-- ---------------------------------------------------------------------
-- Fungsi bantu: apakah pengguna saat ini adalah kurir?
-- ---------------------------------------------------------------------
-- `security definer` + `set search_path = ''` karena polanya membaca
-- `public.users` dari dalam policy `public.users` — tanpa itu, RLS rekursif.
create or replace function public.is_current_courier()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role()::text = 'kurir', false)
$$;

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
-- PEMBACAAN. Policy lama (`orders_staff_read`) tetap berlaku untuk staf, tapi
-- harus dikecualikan agar kurir tidak ikut di dalamnya.
drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read on public.orders
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.is_tenant_staff()
      -- Kurir punya batasnya sendiri, di bawah. Kalau baris ini tidak
      -- dikecualikan, kurir akan ikut policy ini dan melihat semua.
      and public.current_user_role()::text <> 'kurir'
    )
  );

drop policy if exists orders_courier_read on public.orders;
create policy orders_courier_read on public.orders
  for select using (
    tenant_id = public.current_tenant_id()
    and assigned_courier_id = auth.uid()
  );

-- PENULISAN. Kurir TIDAK boleh menulis apa pun ke `orders` — bukan
-- mengubah status, bukan mengubah nominal, bukan menandai lunas. Bukti
-- penerimaan hidup di tabel `delivery_proofs`, yang punya policy sendiri dan
-- hanya boleh INSERT.
--
-- Menolak update untuk kurir juga menutup jalan samping yang mudah dilupakan:
-- tanpa ini, `using` yang longgar berarti kurir bisa mengubah
-- `payment_status` sendiri lalu memicu pencairan. Pencairan harus datang dari
-- bukti yang terverifikasi, bukan dari status yang ditulis kurir.
drop policy if exists orders_staff_write on public.orders;
create policy orders_staff_write on public.orders
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text in ('owner', 'admin_penjualan')
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text in ('owner', 'admin_penjualan')
    )
  );

-- ---------------------------------------------------------------------
-- users — SENGAJA TIDAK DISENTUH
-- ---------------------------------------------------------------------
-- Policy `users_select` yang sudah ada memberi akses baca ke seluruh user
-- dalam tenant yang sama. Kurir ikut memakainya, jadi secara teknis ia bisa
-- membaca nama dan email rekan satu workshop.
--
-- Itu diterima, bukan ditoleransi: daftar staf satu workshop bukan data
-- sensitif, dan memperketat policy di sini tidak menambah perlindungan nyata
-- pada data yang benar-benar sensitif: nama, alamat, dan nominal pembeli,
-- yang semuanya ada di `orders` dan sudah dikunci di atas.
