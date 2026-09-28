-- =====================================================================
-- platform_settings: tarif fee platform & override harga paket (Sprint 6)
-- =====================================================================
--
-- Ditulis manual, bukan hasil `drizzle-kit generate`. Alasannya ada di catatan
-- "Catatan untuk-db:generate" di AGENTS.md: sejak migrasi 0020 (RLS) dan
-- 0021 (enum) ditulis manual, `db:generate` membuka prompt interaktif yang
-- tidak bisa dijawab di shell non-TTY. Menjalankan drizzle-kit untuk satu
-- tabel berarti membangun ulang seluruh rantai snapshot, dan risikonya lebih
-- besar dari-writing SQL yang bisa dibaca.
--
-- SATU BARIS SAJA. `id` primary key dengan default 1 + CHECK `id = 1`
-- memastikan itu di DUA lapis: default-nya membuat `INSERT` tanpa `id` aman,
-- dan CHECK-nya membuat nilai lain ditolak. Tanpa CHECK, "baris id = 2" yang
-- dibuat oleh kodenya sendiri akan menjadi baris kedua yang tidak pernah
-- dibaca, dan tarif yang aktif jadi tidak terdefinisi.
--
-- Kenapa basis points dan bukan persen desimal: 0,015 tidak bisa
-- direpresentasikan persis di floating point. Disimpan sebagai 150 (1,5%) dan
-- dibagi 10.000 saat menghitung, jadi pembulatan yang muncul dari floating
-- point tidak pernah ada. `fees.ts` melakukan pembagian yang sama, dan
-- `test:settings` memverifikasi keduanya menghasilkan angka yang sama persis.
--
-- Batas `platform_fee_rate_bps` di 0..10000 (0%..100%) ditegakkan di CHECK,
-- bukan hanya di zod. Baris tarif yang 5.000.000 basis points akan
-- mengeluarkan uang yang tidak ada pada setiap pesanan, dan satu-satunya
-- yang harus mencegah itu adalah database — karena setiap jalur penulisan
-- lain bisa dilewati.

create table if not exists public.platform_settings (
  id integer primary key default 1,
  platform_fee_rate_bps integer not null default 0,
  plan_price_overrides jsonb,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1),
  constraint platform_settings_rate_range
    check (platform_fee_rate_bps >= 0 and platform_fee_rate_bps <= 10000)
);

comment on table public.platform_settings is
  'Satu baris (id = 1). Override tarif fee platform dan harga paket. Sumber kebenaran tetap src/lib/fees.ts dan src/lib/plans.ts: tabel ini adalah PENIMPIS, bukan pengganti.';

-- RLS. Hanya super admin, dan memang hanya ada satu baris.
--
-- `anon` dan `authenticated` DITOLAK TOTAL, termasuk membaca. Tiga lapis
-- sekaligus, karena tabel ini berisi keputusan yang memengaruhi uang semua
-- orang:
--   1. policy SELECT hanya super admin,
--   2. GRANT SELECT dicabut dari anon + authenticated,
--   3. RLS tetap menyala sebagai jaring ketiga kalau policy di-point 1
--      someday hilang.
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select using (public.is_super_admin());

drop policy if exists platform_settings_write on public.platform_settings;
create policy platform_settings_write on public.platform_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

revoke select, insert, update, delete on public.platform_settings from anon, authenticated;

-- UPDATE `updated_at` otomatis. Tanpa ini, `updated_by` mencatat siapa yang
-- mengubah tapi TIDAK kapan, dan "kapan tarif terakhir berubah" adalah
-- pertanyaan yang paling sering muncul saat ada selisih tagihan.
create or replace function public.touch_platform_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_settings_touch on public.platform_settings;
create trigger platform_settings_touch
  before update on public.platform_settings
  for each row execute function public.touch_platform_settings();
