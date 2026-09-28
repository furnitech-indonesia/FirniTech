-- =====================================================================
-- Override harga add-on (custom domain & Paket Pendirian PT)
-- =====================================================================
--
-- Ditulis manual, sama seperti 0020-0023.
--
-- Bentuknya SAMA dengan `plan_price_overrides` yang sudah ada, dan itu
-- disengaja: pola "override per item, tidak lengkap, NULL = pakai kode"
-- sudah terbukti bekerja untuk harga paket. Menyusun bentuk baru untuk
-- add-on hanya menambah satu tempat lagi yang harus dipahami.
--
-- YANG DISIMPAN HANYA HARGA JUAL. Beban add-on (PNBP Rp 50.000, ongkos
-- Rp 100.000) TIDAK bisa diubah dari sini, dan alasannya bisnis: PNBP itu
-- tarif yang ditetapkan PP 30/2026 pasal 33, bukan angka bisnis yang boleh
-- bergerak. Mengubahnya di panel berarti FurniTech mengarang tarif negara,
-- dan rinciannya tampil ke pelanggan sebagai "biaya negara".
--
-- STATEMENT-BREAKPOINT WAJIB. `scripts/apply-migrations.ts` memecah file
-- hanya pada penanda ini; tanpa itu SELURUH file dikirim sebagai satu
-- query dan Postgres menolak statement yang gagal di paling akhir --
-- gejalanya "syntax error" di tempat yang sama sekali tidak menyuruh
-- menebak penyebabnya. Migrasi 0020-0023 lolos karena isinya kebetulan
-- tidak punya statement yang bermasalah, bukan karena bentuknya benar.

alter table public.platform_settings
  add column if not exists addon_price_overrides jsonb;
--> statement-breakpoint
comment on column public.platform_settings.addon_price_overrides is
  'Override harga jual add-on: { domain?: number, legalitas?: number }. Tidak lengkap: add-on yang tidak disebut memakai src/lib/addons.ts. NULL = memakai kode. Beban add-on tidak ada di sini: PNBP ditetapkan PP 30/2026.';
--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Batas bawah harga domain.
--
-- Cloudflare menjual .com di harga cost USD 10,46 per tahun = Rp 188.667
-- pada kurs Rp 18.037. Harga jual di bawah itu berarti setiap renewal
-- memberi rugi, dan ruginya baru terlihat di rekonsiliasi tahunan -- bukan
-- di halaman tempat harga diubah.
--
-- CHECK di database, bukan hanya di zod, karena setiap jalur penulisan lain
-- bisa dilewati. Pola yang sama dipakai platform_settings_rate_range.
--
-- NULL lolos CHECK, jadi add-on yang tidak di-override tidak pernah
-- ditolak -- dan `legalitas` yang tidak punya batas bawah ikut aman.
--
-- CATATAN SOAL COMMENT: Postgres TIDAK mendukung `comment on constraint`
-- untuk CHECK constraint. `COMMENT ON CONSTRAINT` hanya berlaku untuk
-- constraint pada domain dan foreign key. Memakainya di sini gagal dengan
-- pesan "syntax error at or near ." yang tidak menyiratkan apa pun soal
-- CHECK. Migrasi 0022 tidak memakainya untuk alasan yang sama.
--
-- Constraint tetap diberi nama supaya mudah dicari di katalog database dan
-- bisa di-drop dengan `if exists` di migrasi berikutnya.

alter table public.platform_settings
  drop constraint if exists platform_settings_domain_price_floor;
--> statement-breakpoint
alter table public.platform_settings
  add constraint platform_settings_domain_price_floor
  check (
    (addon_price_overrides ->> 'domain')::bigint is null
    or (addon_price_overrides ->> 'domain')::bigint >= 188667
  );
