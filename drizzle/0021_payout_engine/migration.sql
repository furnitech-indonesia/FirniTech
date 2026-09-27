-- =====================================================================
-- Mesin payout: model bukti, bukan cron (Sprint 6)
-- =====================================================================
--
-- Ditulis manual, bukan hasil `drizzle-kit generate`, karena menambah nilai
-- enum (`payment_status`, `payout_status`) membuat drizzle-kit membuka prompt
-- interaktif untuk menyelesaikan konflik nama — dan repo ini tidak bisa
-- menjalankan prompt. Pola yang sama dipakai migrasi RLS sebelumnya.
--
-- YANG DIJATUHKAN: `slot` dan `scheduled_for`.
--
-- Keduanya berasal dari model cron 06.00/18.00 WIB yang sudah dibatalkan.
-- Pencairan dipicu bukti penerimaan, dan tidak boleh ada satu pun langkah
-- yang menunggu jadwal — tidak ada yang bisa queja kalau jam 6 pagi tiba
-- dan uang belum bergerak, karena pencairannya memang tidak dijadwalkan.
--
-- Enum `payout_slot` sengaja TIDAK dihapus. Nilai enum yang tidak dipakai
-- boleh membusuk, dan `DROP TYPE` akan gagal selama masih ada baris yang
-- memakainya di database yang belum selesai di-backup.

-- ---------------------------------------------------------------------
-- Metode pembayaran pesanan
-- ---------------------------------------------------------------------
-- `cod` ada di sini sekarang, dipakai mesin payout sebagai syarat
-- kelayakan, dan UI-nya menyusul. Kolomnya lebih dulu karena payout yang
-- salah memasukkan pesanan COD akan membayar uang dua kali — dan yang
-- menanggung selisihnya adalah pengrajin.
create type "public"."payment_method" as enum('va', 'cod');

alter table "orders"
  add column "payment_method" "payment_method" default 'va' not null;

create index "order_payment_method_idx" on "orders" ("tenant_id", "payment_method");

-- ---------------------------------------------------------------------
-- Status payout: menambah `blocked`
-- ---------------------------------------------------------------------
-- Tanpa `blocked`, penolakan kita sendiri (rekening belum terverifikasi)
-- tercampur dengan penolakan bank di status `failed` yang sama — dua
-- masalah dengan dua tindakan yang sama sekali berbeda.
alter type "public"."payout_status" add value 'blocked';

-- ---------------------------------------------------------------------
-- payout_logs: ganti jadwal dengan fee & snapshot kode bank
-- ---------------------------------------------------------------------
alter table "payout_logs" drop column "slot";
alter table "payout_logs" drop column "scheduled_for";

alter table "payout_logs"
  add column "fee_amount" bigint not null default 0,
  add column "order_count" integer not null default 0,
  add column "bank_code" text not null default '';

-- Snapshot rekening yang sudah ada sebelumnya. Yang belum terisi tidak
-- ikut diisi di sini: `payout_logs` belum pernah dipakai, dan mengisi
-- default secara diam-diam akan membuat baris pertama terlihat seperti
-- payout sungguhan yang rekeningnya tidak diketahui.
alter table "payout_logs"
  alter column "bank_code" drop default;

alter table "payout_logs"
  add constraint payout_amount_matches_items
  check (amount >= 0 and fee_amount >= 0 and order_count >= 0);

-- Status `queued` tidak lagi bermakna sebagai "menunggu jadwal"; ia
-- sekarang berarti "sudah disiapkan, panggilan Payouts belum selesai".
-- Index diganti supaya pencarian yang dipakai owner (payout milik saya,
-- terbaru dulu) tidak memakai index yang sudah tidak cocok.
drop index if exists "payout_slot_status_idx";
create index "payout_status_idx" on "payout_logs" ("status", "created_at");

-- ---------------------------------------------------------------------
-- payout_items: UNIQUE order_id + bukti pemicu
-- ---------------------------------------------------------------------
alter table "payout_items"
  add column "delivery_proof_id" uuid references "delivery_proofs" (id) on delete set null;

-- INI yang mencegah uang dibayar dua kali. Tanpa unique ini, pencairan
-- ulang setelah `failed` akan memasukkan pesanan yang sama ke payout log
-- yang berbeda, dan keduanya akan ditransfer — dan karena fee ditagihkan
-- ke pengrajin, dia yang menanggung selisihnya.
--
-- `order_id` nullable (on delete set null), tapi unique index di Postgres
-- mengizinkan banyak NULL, jadi baris yang order-nya sudah dihapus tidak
-- saling bentrok. Persis yang diinginkan: yang hilang bukan alasan untuk
-- menggandakan pembayaran.
create unique index "payout_item_order_uniq" on "payout_items" ("order_id");

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
-- Payout hanya dibaca oleh owner tenant-nya. Pencairan tidak pernah ditulis
-- langsung oleh klien: satu-satunya jalan adalah mesin payout di server.
-- Policy INSERT sengaja TIDAK dibuat di sini karena pengguna postgres
-- yang menjalankan mesin itu bypass RLS; policy untuk ROL LAIN tidak ada
-- karena tidak ada peran lain yang boleh mencairkan.
alter table "payout_logs" enable row level security;
alter table "payout_items" enable row level security;

drop policy if exists payout_logs_tenant_read on public.payout_logs;
create policy payout_logs_tenant_read on public.payout_logs
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.current_user_role()::text in ('owner', 'admin_penjualan')
    )
  );

-- Hanya SATU policy read untuk `payout_items`, dan hanya satu.
--
-- `payout_items` tidak punya `tenant_id` sendiri, jadi policy-nya harus
-- melihat lewat `payout_logs`. Menuliskannya sebagai dua policy
-- ("tenant_read" dan "staff_read") terlihat seperti redundansi yang aman,
-- tapi Postgres menggabungkan policy permisif dengan OR — jadi policy
-- yang longgar AKAN meloloskan barisnya, dan policy kedua jadi hiasan.
-- Satu policy, satu syarat.
--
-- Kurir tidak boleh melihat pencairan sama sekali, meski dia memang berhak
-- melihat bukti penerimannya sendiri. Pembuktian dan pembayaran adalah dua
-- hal berbeda, dan kurir tidak perlu tahu bahwa pesanannya sudah dibayarkan.
-- `::text` dipakai, bukan literal enum, supaya tidak ikut rusak kalau nilai
-- enum ditambah nanti.
drop policy if exists payout_items_tenant_read on public.payout_items;
drop policy if exists payout_items_staff_read on public.payout_items;
create policy payout_items_staff_read on public.payout_items
  for select using (
    public.is_super_admin()
    or (
      public.current_user_role()::text in ('owner', 'admin_penjualan')
      and exists (
        select 1 from public.payout_logs p
        where p.id = payout_items.payout_id
          and p.tenant_id = public.current_tenant_id()
      )
    )
  );
