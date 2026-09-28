-- =====================================================================
-- Add-on domain .com & Paket Pendirian PT Perorangan (Sprint 6)
-- =====================================================================
--
-- Ditulis manual, sama seperti 0020/0021/0022. Alasannya di AGENTS.md.
--
-- Dua add-on ini memakai TABEL YANG SAMA dengan tagihan langganan
-- (`saas_invoices`) dan dibedakan oleh `item_type`. Pertimbangkan
-- buatannya sendiri:
--
--   Tabel terpisah (mis. `addon_invoices`) lebih tempted karena tidak
--   menyentuh kode yang sudah jalan. Tapi tiga hal jadi lebih sulit:
--     1. Webhook Midtrans hanya perlu MELIHAT satu tabel untuk tahu
--        invoice itu milik siapa. Dengan dua tabel, ia harus memutuskan
--        lewat order_id, dan keputusan yang salah berarti tidak menagih
--        orang yang sebenarnya owes.
--     2. Rekap MRR/GV di panel admin jadi dua query yang harus dijumlahkan
--        manual, dan penjumlahannya bisa terlewat.
--     3. Kolom yang sama (tenantId, amount, status, midtransOrderId,
--        periodStart/End) terduplikasi lengkap.
--
-- Yang membuatnya AMAN Joined adalah `item_type` + awalan `order_id`
-- yang berbeda, dan kedua hal itu ditegakkan database di bawah.


-- ---------------------------------------------------------------------
-- 1. item_type
-- ---------------------------------------------------------------------
-- Tiga nilai, bukan dua. `subscription` = langganan biasa; `domain` =
-- add-on custom domain tahunan; `legalitas` = paket pendirian PT
-- Perorangan, sekali bayar.
--
-- DEFAULT 'subscription' supaya baris yang sudah ada tidak berubah
-- artinya, dan supaya Sisipkan tanpa kolom ini tetap aman.

do $$ begin
  create type public.saas_invoice_item_type as enum (
    'subscription',
    'domain',
    'legalitas'
  );
exception when duplicate_object then null; end $$;

alter table public.saas_invoices
  add column if not exists item_type public.saas_invoice_item_type
    not null default 'subscription';

comment on column public.saas_invoices.item_type is
  'subscription = tagihan paket; domain = add-on custom domain tahunan; legalitas = paket pendirian PT Perorangan (sekali bayar).';


-- ---------------------------------------------------------------------
-- 2. plan jadi nullable
-- ---------------------------------------------------------------------
-- Invoice domain dan legalitas TIDAK punya paket. `plan` tadinya NOT NULL,
-- jadi invoice add-on harus mengarang salah satu dari basic/pro/max --
-- dan itu berarti membohongi data: tagihan Rp 250.000 domain akan
-- tercatat sebagai "paket basic".
--
-- NULL lebih jujur, dan tidak merusak apa pun: `subscriptionPlanEnum` tetap
-- dipakai untuk `tenants.plan`, yang memang selalu punya nilai.

alter table public.saas_invoices
  alter column plan drop not null;

comment on column public.saas_invoices.plan is
  'NULL untuk invoice add-on (domain / legalitas). Bukan "paket paling murah" -- invoice add-on memang tidak punya paket.';


-- ---------------------------------------------------------------------
-- 3. Periode tagihan domain
-- ---------------------------------------------------------------------
-- Periode langganan sudah ada (`subscription_expires_at` di `tenants`).
-- Periode domain butuh tempat sendiri, dan TIDAK boleh menumpang di situ:
-- orang bisa membayar domain tanpa meny renew langganan, atau sebaliknya.
-- Menitipkannya di satu kolom membuat masa langganan tidak jelas
-- kalau salah satu dibayar dan yang lain tidak.

alter table public.tenants
  add column if not exists custom_domain_expires_at timestamptz,
  add column if not exists custom_domain_suspended_at timestamptz;

comment on column public.tenants.custom_domain_expires_at is
  'Akhir periode add-on custom domain yang sudah dibayar. NULL = belum pernah membeli.';
comment on column public.tenants.custom_domain_suspended_at is
  'Kapan domain di-suspend karena tagihan tidak dibayar. NULL = tidak suspended. Disuspend ketika expires_at lewat 3 bulan.';


-- ---------------------------------------------------------------------
-- 4. Status pembayaran domain
-- ---------------------------------------------------------------------
-- Domain punya satu kondisi yang tidak dimiliki invoice biasa: APAKAH
-- AKTIF. `saas_invoices.status` menjawab "sudah dibayar?", tapi untuk
-- domain yang tidak aktif, invoice-nya bisa lunas sementara domainnya
-- tidak. Status `suspended` menjawab itu tanpa membaca ulang invoice.

do $$ begin
  create type public.custom_domain_status as enum (
    'unpaid',
    'active',
    'suspended'
  );
exception when duplicate_object then null; end $$;

alter table public.tenants
  add column if not exists custom_domain_status
    public.custom_domain_status default 'unpaid' not null;

comment on column public.tenants.custom_domain_status is
  'Status add-on domain. unpaid = belum pernah dibeli; active = periode berbayar dan berjalan; suspended = periode habis, ditunggu 3 bulan sebelum DNS dilepas.';


-- ---------------------------------------------------------------------
-- 5. Indeks untuk cron renewal + suspend
-- ---------------------------------------------------------------------
-- Cron berjalan HARIAN dan harus menemukan tenant yang periodenya habis
-- tanpa memindai seluruh tabel. Tanpa indeks ini, setiap hari membaca
-- semua baris -- dan yang membuat lambat bukan hanya sekarang, tapi
-- ketika jumlah tenant sudah jadi thousands.

create index if not exists tenant_domain_renewal_idx
  on public.tenants (custom_domain_expires_at)
  where custom_domain_status = 'active';

comment on index public.tenant_domain_renewal_idx is
  'Partial index untuk cron renewal: hanya tenant dengan domain aktif.';


-- ---------------------------------------------------------------------
-- 6. Invoice domain yang sama tidak boleh dibuat dua kali
-- ---------------------------------------------------------------------
-- Dua request bersamaan untuk domain yang sama = dua invoice = dua kali
-- ditagih. `if (!existing)` di aplikasi tidak menutup itu; kurir menekan
-- tombol dua kali karena internet lambat itu kejadian nyata.
--
-- UNIQUE di (tenant_id, item_type, period_start)hanya untuk add-on, dan hanya untuk invoice yang belum dibatalkan. Invoice langganan
-- TIDAK ikut terikat: pembayaran bulanan yang sah punya beberapa invoice
-- dengan period_start yang sama setelah pembayaran terlambat.

-- `refunded` ikut dikeluarkan, bukan `canceled`: enum `invoice_status` tidak
-- punya nilai `canceled`. Yang disebut adalah `refunded` -- invoice yang sudah
-- dibayar lalu dikembalikan. Kalau `refunded` ikut terikat indeks, refunded
-- invoice memblokir invoice pengganti untuk periode yang sama, jadi
-- pengrajin yang minta refund tidak bisa membayar ulang.
create unique index if not exists saas_invoice_addon_period_uniq
  on public.saas_invoices (tenant_id, item_type, period_start)
  where item_type <> 'subscription' and status <> 'refunded';

comment on index public.saas_invoice_addon_period_uniq is
  'Mencegah dua invoice add-on untuk periode yang sama. Tidak berlaku untuk langganan: pembayaran bulanan yang terlambat sah punya beberapa invoice dengan period_start sama. Status refunded dikecualikan supaya invoice yang sudah dibayar lalu dikembalikan tidak memblokir invoice pengganti.';


-- ---------------------------------------------------------------------
-- 7. Aturan main: invoice `leg-` TIDAK boleh menyentuh langganan
-- ---------------------------------------------------------------------
-- Ini TIDAK bisa ditegakkan di sini, dan justru itu alasannya ditulis:
-- webhook adalah kode aplikasi, dan kode aplikasi bisa diperbaiki orang.
-- Yang ditegakkan database hanyalah bentuk datanya; seluruh aturan
-- "apa yang boleh dan tidak boleh diubah webhook" hidup di
-- `app/api/webhooks/midtrans/route.ts` dan diuji `test:addons`.
--
-- Aturannya: invoice `legalitas` yang lunas HANYA menandai dirinya
-- `paid`. Invoice itu tidak boleh menulis `tenants.subscription_expires_at`,
-- tidak boleh mengubah `tenants.subscription_status`, dan tidak boleh
-- menyalakan `isActive`. Melanggar itu berarti satu pembelian Rp 500.000
-- memberi satu tahun langganan gratis, dan tidak ada yang mengetahuinya
-- sampai tagihan berikutnya gagal.
