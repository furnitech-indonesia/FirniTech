-- =====================================================================
-- RLS + append-only untuk delivery_proofs (Sprint 6)
-- =====================================================================
--
-- Tabelnya sudah dibuat di migrasi 0014 (dihasilkan drizzle-kit dari
-- src/db/schema/delivery.ts). Berkas ini hanya policy dan trigger.
--
-- Tiga aturan, dan ketiganya tidak bisa ditegakkan di aplikasi:
--
-- 1. INSERT-ONLY. Kurir boleh MENAMBAH bukti, tidak boleh mengubah atau
--    menghapus yang sudah ada. Bukti yang bisa diedit bukan bukti. Dan
--    karena baris ini yang memicu pencairan, "bisa diedit" berarti uang
--    bergerak berdasarkan angka yang bisa direkayasa. Ditutup dengan trigger,
--    bukan hanya dengan tidak menyediakan tombol hapus di UI — UI bisa
--    dilewati, dan klien Drizzle memakai postgres yang BYPASS RLS.
--
-- 2. HANYA KURIR YANG DITUGASKAN. `with check` membandingkan `courier_id`
--    dengan `auth.uid()` DAN `order_id` dengan pesanan yang benar-benar
--    ditugaskan kepadanya. Dua-duanya wajib: kalau hanya yang pertama, kurir
--    bisa menulis bukti dengan `courier_id` dirinya sendiri untuk pesanan
--    orang lain — dan justru itu bypass yang paling mudah karena kelihatan
--    sah.
--
-- 3. STAF MEMBACA, KURIR MENULIS. Owner dan admin boleh melihat bukti untuk
--    verifikasi manual bila perlu, tapi tidak boleh menulis. Pencairan juga
--    tidak boleh bisa dipicu manual dari back-office: pemicunya kurir, supaya
--    ada satu jalur dan bisa diaudit.

alter table public.delivery_proofs enable row level security;

-- ---------------------------------------------------------------------
-- Trigger append-only
-- ---------------------------------------------------------------------
create or replace function public.lock_delivery_proof()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Bukti penerimaan tidak boleh diubah atau dihapus (order %)',
    old.order_id
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists delivery_proof_no_update on public.delivery_proofs;
create trigger delivery_proof_no_update
  before update or delete on public.delivery_proofs
  for each row execute function public.lock_delivery_proof();

-- `updated_at` tidak diberi trigger, dan itu memang disengaja: trigger di
-- atas menolak setiap UPDATE lebih dulu, jadi tidak ada nilai yang perlu
-- diperbarui. Kolomnya dibiarkan supaya tipe `updatedAt` di Drizzle tidak
-- memakai Exception — lebih mudah ditinjau daripada menambahkan kolom
-- yang mustahil terisi.

-- ---------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------

-- PEMBACAAN oleh kurir: hanya bukti yang ia kirim sendiri.
drop policy if exists delivery_proofs_courier_read on public.delivery_proofs;
create policy delivery_proofs_courier_read on public.delivery_proofs
  for select using (
    public.current_user_role()::text = 'kurir'
    and courier_id = auth.uid()
  );

-- PEMBACAAN oleh staf tenant (untuk verifikasi manual) dan super admin.
drop policy if exists delivery_proofs_staff_read on public.delivery_proofs;
create policy delivery_proofs_staff_read on public.delivery_proofs
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text in ('owner', 'admin_penjualan')
    )
  );

-- PENULISAN. Hanya kurir, hanya untuk pesanan yang ditugaskan kepadanya.
--
-- `tenant_id = current_tenant_id()` ikut diperiksa padahal `order_id` sudah
-- cukup: kolomnya bisa diisi apa saja oleh pemanggil, dan kalau nilainya
-- bohong maka baris bukti milik tenant lain yang tersimpan dan tidak akan
-- terlihat oleh staf tenant itu sendiri.
drop policy if exists delivery_proofs_courier_insert on public.delivery_proofs;
create policy delivery_proofs_courier_insert on public.delivery_proofs
  for insert with check (
    public.current_user_role()::text = 'kurir'
    and courier_id = auth.uid()
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.orders o
      where o.id = delivery_proofs.order_id
        and o.tenant_id = delivery_proofs.tenant_id
        and o.assigned_courier_id = auth.uid()
    )
  );
