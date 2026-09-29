-- =====================================================================
-- Perpanjangan: pengaman invoice dobel + penanda renewal
-- =====================================================================
--
-- Tiga perubahan, masing-masing menjawab satu kegagalan nyata.
--
-- 1. `saas_invoice_addon_period_uniq` DIPERLUAS dari `status <> 'refunded'`
--    menjadi `status IN ('pending','paid')`.
--
--    Predicate lama membuat invoice yang GAGAL memblokir invoice berikutnya
--    untuk periode yang sama. Dan itu bukan kasus tepi: urutan di
--    `createDomainRenewal` adalah "insert invoice dulu, baru panggil
--    Midtrans", jadi sekali Midtrans menolak (atau timed out), invoice
--    `failed` tertinggal dan periode itu TIDAK PERNAH bisa ditagih lagi.
--    Permanen. Satu kesalahan jaringan Pokémon, dan domain pengrajin itu
--    tidak pernah sees an invoice lagi sampai cron dib Manual.
--
--    Yang harus memblokir duplikat adalah invoice yang MASIH HIDUP --
--    yang masih menunggu pembayaran, atau yang sudah dibayar. `failed` dan
--    `refunded` justru harus membebaskan periode supaya bisa dicoba lagi.
--
-- 2. `saas_invoice_subscription_live_period_uniq` -- index BARU.
--
--    Index di (1) sengaja mengecualikan `subscription`, dan alasannya
--    benar: pembayaran bulanan yang terlambat sah punya beberapa invoice
--    dengan `period_start` sama. Tapi justru konsekuensinya, perpanjangan
--    langganan tidak punya pengaman APAPUN -- cron harian bisa menerbitkan
--    30 invoice untuk bulan yang sama, 30 x Rp 1.000.000 tagihan yang
--    tidak ditagih.
--
--    Yang dikunci adalah `period_end`, bukan `period_start`: "sudah ada
--    tagihan yang hidup untuk periode yang berakhir bulan depan" adalah
--    kalimat yang salah eksak untuk hal yang tidak boleh terjadi. Dua
--    invoice untuk `period_start` yang sama boleh ada kalau yang satu
--    `failed` (percobaan ulang); dua invoice untuk `period_end` yang sama
--    yang keduanya hidup berarti pengrajin ditagih dua kali untuk bulan
--    yang sama.
--
-- 3. Kolom `is_renewal`.
--
--    Tanpa penanda ini, "ini perpanjangan" hanya bisa ditebak dari
--    membandingkan `created_at` dengan tanggal tenant dibuat -- dan tebakan
--    itu salah tepat di kasus yang paling penting: tenant yangESULT daur
--    ulang karena berhenti bayar. Penanda eksplisit juga yang dipakai
--    halaman tagihan untuk menampilkan kalimat yang tepat, jadi orang
--    tidak mengira ini tagihan yang belum pernah dia bayar.
--
-- CATATAN SOAL URUTAN: `set not null` pada `is_renewal` harus SESUDAH
-- backfill, bukan sebelumnya.

alter table public.saas_invoices
  add column if not exists is_renewal boolean;
--> statement-breakpoint

-- Semua invoice yang sudah ada berasal dari pendaftaran, pembelian add-on
-- mandiri, atau cron. Yang dari cron belum pernah berjalan (dan sekarang
-- punya pengaman), jadi semuanya invoice awal.
update public.saas_invoices
  set is_renewal = false
  where is_renewal is null;
--> statement-breakpoint

alter table public.saas_invoices
  alter column is_renewal set not null;
--> statement-breakpoint
alter table public.saas_invoices
  alter column is_renewal set default false;
--> statement-breakpoint

-- Predicate lama, dibuang dan dibuat ulang dengan bentuk yang benar.
--
-- `DROP INDEX` adalah perintah TOP-LEVEL, bukan action `ALTER TABLE`.
-- `ALTER TABLE ... DROP INDEX IF EXISTS` gagal dengan
-- "syntax error at or near \"if\"" -- pesan yang tidak menyiratkan apa pun
-- soal indeks, dan gefocus-nya salah satu tingkat dari penyebab sebenarnya.
drop index if exists public.saas_invoice_addon_period_uniq;
--> statement-breakpoint

-- Add-on (domain, legalitas): satu invoice HIDUP per (tenant, jenis, mulai).
--
-- Add-on berbeda dari langganan di sini karena periode add-on tidak
-- bergantung pada kapan orang menekan tombol: `nextDomainPeriod`
-- melanjutkan dari `custom_domain_expires_at`, jadi `period_start` selalu
-- sama untuk berapa kali pun cron berjalan. Itulah yang membuat index ini
-- bekerja sebagai pengaman duplikat, bukan hanya sebagai penanda.
drop index if exists public.saas_invoice_addon_live_period_uniq;
--> statement-breakpoint
create unique index saas_invoice_addon_live_period_uniq
  on public.saas_invoices (tenant_id, item_type, period_start)
  where item_type <> 'subscription'
    and status in ('pending', 'paid');
--> statement-breakpoint

-- Langganan: satu invoice HIDUP per (tenant, berakhir).
--
-- `period_start` sengaja TIDAK dipakai -- lihat blok komentar di atas.
drop index if exists public.saas_invoice_subscription_live_period_uniq;
--> statement-breakpoint
create unique index saas_invoice_subscription_live_period_uniq
  on public.saas_invoices (tenant_id, period_end)
  where item_type = 'subscription'
    and status in ('pending', 'paid');
