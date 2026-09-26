-- =====================================================================
-- Row Level Security (RLS) & pemetaan auth.users -> public.users
-- Sprint 1 — Supabase Auth + isolasi multi-tenant berbasis tenant_id
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fungsi bantu: MENGHINDARI REKURSI RLS
-- ---------------------------------------------------------------------
-- Policy yang menulis "tenant_id = (select tenant_id from users where id = auth.uid())"
-- pada tabel `users` akan memicu RLS `users` lagi secara rekursif → PostgreSQL
--_loop error. Solusinya: baca profil lewat fungsi SECURITY DEFINER owned oleh
-- table owner (postgres), sehingga RLS tidak berlaku di dalam fungsi.
-- `set search_path = ''` wajib sebagai hardening (anti search_path hijacking).

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.tenant_id
  from public.users u
  where u.id = auth.uid()
    and u.is_active
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.is_active
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

-- True bila pengguna adalah staf aktif (super_admin, owner, admin_penjualan, tukang).
create or replace function public.is_tenant_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() is not null, false)
$$;

-- ---------------------------------------------------------------------
-- 2. Auto-provision profil saat signup
-- ---------------------------------------------------------------------
-- Keamanan: role TIDAK boleh diambil bebas dari raw_user_meta_data, karena
-- klien bisa mengirim metadata apa pun saat mendaftar (escalasi privilege).
-- Hanya peran self-service yang diizinkan; `owner` dan `super_admin` harus
-- di-assign oleh kode server-side yang tepercaya (onboarding SaaS, Sprint 2).
-- tenant_id juga tidak diambil dari metadata: orang tidak boleh bisa
-- mendaftar lalu memilih tenant sendiri. Onboarding owner dilakukan
-- di sisi server pada Sprint 2.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.users (id, tenant_id, email, full_name, phone, role)
  values (
    new.id,
    null,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Pengguna Baru'),
    new.phone,
    case
      when requested_role in ('admin_penjualan', 'tukang')
        then requested_role::public.user_role
      else 'admin_penjualan'::public.user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. Aktifkan RLS
-- ---------------------------------------------------------------------
-- CATATAN: tabel owner + service_role TETAP bisa melewati RLS. Itu disengaja:
-- drizzle (user postgres) dan service_role dipakai cron payout IRIS & webhook
-- Midtrans. Karena itu setiap query dari sisi server WAJIB memfilter tenantId
-- secara eksplisit — RLS adalah lapisan kedua, bukan satu-satunya.

alter table public.tenants                 enable row level security;
alter table public.users                   enable row level security;
alter table public.materials               enable row level security;
alter table public.products                enable row level security;
alter table public.shipping_rates          enable row level security;
alter table public.customer_addresses      enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.production_progress     enable row level security;
alter table public.payout_logs             enable row level security;
alter table public.payout_items            enable row level security;
alter table public.saas_invoices           enable row level security;
alter table public.integration_audit_logs  enable row level security;
alter table public.notification_usage      enable row level security;

-- ---------------------------------------------------------------------
-- 4. Policy
-- ---------------------------------------------------------------------

-- --- tenants -----------------------------------------------------------
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select using (
    public.is_super_admin() or id = public.current_tenant_id()
  );

drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
  for update using (
    public.is_super_admin() or (id = public.current_tenant_id() and public.current_user_role() = 'owner')
  );

drop policy if exists tenants_admin_write on public.tenants;
create policy tenants_admin_write on public.tenants
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- --- users -------------------------------------------------------------
-- super_admin: semua. Staf: baris dalam tenant-nya sendiri.
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

-- Owner boleh menambah/mengubah staf di tenant-nya, tapi tidak boleh
-- membuat role super_admin dan tidak boleh menunjuk tenant lain.
drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert with check (
    public.is_super_admin()
    or (
      public.current_user_role() = 'owner'
      and tenant_id = public.current_tenant_id()
      and role <> 'super_admin'
    )
  );

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and role <> 'super_admin'
      and (public.current_user_role() = 'owner' or id = auth.uid())
    )
  );

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
  for delete using (
    public.is_super_admin()
    or (public.current_user_role() = 'owner' and tenant_id = public.current_tenant_id())
  );

-- --- products (katalog) -------------------------------------------------
-- Publik (anon) hanya melihat produk yang published: inilah storefront.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (
    is_published = true
    or public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

drop policy if exists products_staff_write on public.products;
create policy products_staff_write on public.products
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

-- --- materials (inventaris) ---------------------------------------------
-- Tukang boleh membaca (butuh dimensi & antrean), hanya owner/admin yang menulis.
drop policy if exists materials_select on public.materials;
create policy materials_select on public.materials
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

drop policy if exists materials_write on public.materials;
create policy materials_write on public.materials
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

-- --- shipping_rates -----------------------------------------------------
-- Publik boleh membaca tarif (kalkulasi ongkir sebelum login).
drop policy if exists shipping_rates_public_read on public.shipping_rates;
create policy shipping_rates_public_read on public.shipping_rates
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

drop policy if exists shipping_rates_write on public.shipping_rates;
create policy shipping_rates_write on public.shipping_rates
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

-- --- customer_addresses -------------------------------------------------
-- Data pembeli. Tidak ada policy untuk anon/authenticated → otomatis DITOLAK.
-- Diakses hanya lewat server action memakai service_role.
drop policy if exists customer_addresses_owner_read on public.customer_addresses;
create policy customer_addresses_owner_read on public.customer_addresses
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.current_user_role() = 'owner')
  );

-- --- orders -------------------------------------------------------------
-- Checkout & order tracking publik TIDAK lewat policy anon, melainkan route
-- handler server-side (service_role) supaya data pembeli tidak terekspos.
drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read on public.orders
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

drop policy if exists orders_staff_write on public.orders;
create policy orders_staff_write on public.orders
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  ) with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

-- --- order_items --------------------------------------------------------
drop policy if exists order_items_staff_read on public.order_items;
create policy order_items_staff_read on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (public.is_super_admin() or (o.tenant_id = public.current_tenant_id() and public.is_tenant_staff()))
    )
  );

drop policy if exists order_items_staff_write on public.order_items;
create policy order_items_staff_write on public.order_items
  for all using (
    public.is_super_admin()
    or (
      public.current_user_role() in ('owner', 'admin_penjualan')
      and exists (
        select 1 from public.orders o
        where o.id = order_items.order_id
          and o.tenant_id = public.current_tenant_id()
      )
    )
  ) with check (
    public.is_super_admin()
    or (
      public.current_user_role() in ('owner', 'admin_penjualan')
      and exists (
        select 1 from public.orders o
        where o.id = order_items.order_id
          and o.tenant_id = public.current_tenant_id()
      )
    )
  );

-- --- production_progress -----------------------------------------------
drop policy if exists progress_staff_read on public.production_progress;
create policy progress_staff_read on public.production_progress
  for select using (
    public.is_super_admin() or exists (
      select 1 from public.orders o
      where o.id = production_progress.order_id
        and (public.is_super_admin() or (o.tenant_id = public.current_tenant_id() and public.is_tenant_staff()))
    )
  );

-- Tukang boleh mengunggah progres untuk order di tenant-nya sendiri.
drop policy if exists progress_staff_insert on public.production_progress;
create policy progress_staff_insert on public.production_progress
  for insert with check (
    public.is_super_admin()
    or (
      public.is_tenant_staff()
      and exists (
        select 1 from public.orders o
        where o.id = production_progress.order_id
          and o.tenant_id = public.current_tenant_id()
      )
    )
  );

drop policy if exists progress_staff_update on public.production_progress;
create policy progress_staff_update on public.production_progress
  for update using (
    public.is_super_admin() or exists (
      select 1 from public.orders o
      where o.id = production_progress.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  ) with check (
    public.is_super_admin() or exists (
      select 1 from public.orders o
      where o.id = production_progress.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );

-- --- payout_logs & payout_items -----------------------------------------
-- payout_items_visible dipakai bersama oleh kedua tabel.
drop policy if exists payout_items_visible on public.payout_items;
create policy payout_items_visible on public.payout_items
  for select using (
    public.is_super_admin() or exists (
      select 1 from public.payout_logs p
      where p.id = payout_items.payout_id
        and p.tenant_id = public.current_tenant_id()
    )
  );

drop policy if exists payout_logs_read on public.payout_logs;
create policy payout_logs_read on public.payout_logs
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.current_user_role() = 'owner')
  );

-- Tulis payout HANYA lewat service_role (cron IRIS), tidak ada policy insert
-- untuk user biasa, sehingga tidak ada staff pun yang bisa memicu payout sendiri.

-- --- saas_invoices ------------------------------------------------------
drop policy if exists saas_invoices_read on public.saas_invoices;
create policy saas_invoices_read on public.saas_invoices
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.current_user_role() = 'owner')
  );

-- --- integration_audit_logs ---------------------------------------------
drop policy if exists audit_logs_read on public.integration_audit_logs;
create policy audit_logs_read on public.integration_audit_logs
  for select using (public.is_super_admin());

-- --- notification_usage -------------------------------------------------
drop policy if exists notification_usage_read on public.notification_usage;
create policy notification_usage_read on public.notification_usage
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.current_user_role() = 'owner')
  );
