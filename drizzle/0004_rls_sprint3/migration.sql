-- =====================================================================
-- RLS untuk tabel Sprint 3: variasi produk, adjustment stok, live chat
-- =====================================================================

alter table public.product_variants      enable row level security;
alter table public.material_adjustments  enable row level security;
alter table public.conversations         enable row level security;
alter table public.chat_messages         enable row level security;

-- --- product_variants --------------------------------------------------
-- Mirror dari products: publik boleh baca variasi dari produk yang published.
drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (
          p.is_published = true
          or (p.tenant_id = public.current_tenant_id() and public.is_tenant_staff())
        )
    )
  );

drop policy if exists variants_staff_write on public.product_variants;
create policy variants_staff_write on public.product_variants
  for all using (
    public.is_super_admin()
    or (
      public.current_user_role() in ('owner', 'admin_penjualan')
      and exists (
        select 1 from public.products p
        where p.id = product_variants.product_id
          and p.tenant_id = public.current_tenant_id()
      )
    )
  ) with check (
    public.is_super_admin()
    or (
      public.current_user_role() in ('owner', 'admin_penjualan')
      and exists (
        select 1 from public.products p
        where p.id = product_variants.product_id
          and p.tenant_id = public.current_tenant_id()
      )
    )
  );

-- --- material_adjustments -----------------------------------------------
-- Pembacaan: seluruh staf boleh (tukang perlu melihat pemakaian bahan).
drop policy if exists adjustments_staff_read on public.material_adjustments;
create policy adjustments_staff_read on public.material_adjustments
  for select using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

-- Penulisan hanya owner & admin penjualan (bukan tukang).
drop policy if exists adjustments_staff_write on public.material_adjustments;
create policy adjustments_staff_write on public.material_adjustments
  for insert with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

-- --- conversations ------------------------------------------------------
-- Pembeli storefront TIDAK punya akun, jadi INSERT dari anonim sengaja
-- tidak diizinkan lewat policy: pesan masuk lewat Route Handler memakai
-- service_role, bukan anon key. Kalau tidak, siapa pun bisa menyuntikkan
-- percakapan ke tenant mana saja.
drop policy if exists conversations_staff_read on public.conversations;
create policy conversations_staff_read on public.conversations
  for select using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

drop policy if exists conversations_staff_write on public.conversations;
create policy conversations_staff_write on public.conversations
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  ) with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  );

-- --- chat_messages ------------------------------------------------------
-- Hanya boleh dibaca staf tenant. Pesan pembeli (sender_user_id null)
-- ikut tertutup oleh policy yang sama.
drop policy if exists chat_messages_staff_read on public.chat_messages;
create policy chat_messages_staff_read on public.chat_messages
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and c.tenant_id = public.current_tenant_id()
        and public.is_tenant_staff()
    )
  );

drop policy if exists chat_messages_staff_insert on public.chat_messages;
create policy chat_messages_staff_insert on public.chat_messages
  for insert with check (
    public.is_super_admin()
    or (
      sender_user_id = auth.uid()
      and exists (
        select 1 from public.conversations c
        where c.id = chat_messages.conversation_id
          and c.tenant_id = public.current_tenant_id()
          and public.is_tenant_staff()
      )
    )
  );

-- Hanya staf yang sudah membalas boleh menandai pesan terbaca.
drop policy if exists chat_messages_staff_update on public.chat_messages;
create policy chat_messages_staff_update on public.chat_messages
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and c.tenant_id = public.current_tenant_id()
        and public.is_tenant_staff()
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and c.tenant_id = public.current_tenant_id()
        and public.is_tenant_staff()
    )
  );

-- =====================================================================
-- Supabase Storage: bucket foto produk (PRIVATE)
-- =====================================================================
-- Bucket privat karena foto produk belum tentu siap tayang. Halaman publik
-- harus memakai signed URL, bukan URL mentah.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

-- Autentik (bukan anon) boleh membaca objek di bucket ini.
drop policy if exists "product images read" on storage.objects;
create policy "product images read" on storage.objects
  for select using (
    bucket_id = 'product-images'
    and public.is_super_admin()
  );

-- Hanya owner & admin penjualan yang boleh mengunggah ke bucket produk.
drop policy if exists "product images upload" on storage.objects;
create policy "product images upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (
      public.is_super_admin()
      or public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

drop policy if exists "product images update" on storage.objects;
create policy "product images update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and (
      public.is_super_admin()
      or public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );

drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (
      public.is_super_admin()
      or public.current_user_role() in ('owner', 'admin_penjualan')
    )
  );
