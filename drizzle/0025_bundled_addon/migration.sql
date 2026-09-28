-- =====================================================================
-- Add-on yang dibayar bareng langganan (PRD §2.E)
-- =====================================================================
--
-- Dipakai untuk Paket Pendirian PT Perorangan yang ditawarkan di wizard
-- pendaftaran: orang memilihnya di langkah "Pilih paket", lalu membayar
-- SEKALI, bukan dua kali.
--
-- Dua kolom, dan masing-masing menjawab masalah yang berbeda:
--
-- 1. `midtrans_amount` -- nominal yang benar-benar ditagih ke Midtrans
--    untuk `midtrans_order_id` ini.
--
--    Tanpa kolom ini, satu invoice langganan Rp 750.000 dan satu invoice
--    legalitas Rp 500.000 harus dijumlahkan menjadi satu charge
--    Rp 1.250.000, sementara webhook membandingkan `gross_amount` dengan
--    `invoice.amount`. Perbandingan itu akan GAGAL untuk kedua invoice --
--    dan webhook yang menolak tagihan yang sudah dibayar adalah kegagalan
--    paling merusak di seluruh sistem: tenant tidak pernah aktif, orang
--    sudah kehilangan uangnya, dan tidak ada yang bisa memperbaikinya
--    tanpa pengembalian manual.
--
--    Alternatifnya mencocokkan `gross_amount` dengan penjumlahan semua
--    invoice yang digabung, tapi itu membuat setiap notifikasi add-on
--    ikut bergantung pada invoice lain. Dua tagihan yang tidak berkaitan
--    tidak boleh saling bergantung.
--
--    Untuk semua invoice yang sudah ada, nilainya sama dengan `amount`.
--    Backfill itu wajib: tanpa itu, invoice lama akan punya
--    `midtrans_amount` NULL dan perbandingan nominalnya jadi ambigu.
--
-- 2. `bundled_with` -- invoice add-on yang lunas lewat order yang sama.
--
--    NULL berarti invoice itu punya tagihannya sendiri, seperti
--    sekarang. Yang terisi berarti tagihannya ikut invoice yang disebut,
--    dan `midtrans_order_id`-nya sendiri NULL.
--
--    Kenapa bukan memberi `order_id` yang sama ke keduanya? Karena
--    `saas_invoice_midtrans_idx` adalah UNIQUE -- dan memang harus, karena
--    `order_id` adalah satu-satunya kunci pencarian webhook. Dua baris
--    dengan `order_id` yang sama berarti webhook tidak bisa tahu invoice
--    mana yang harus ditulis.
--
--    Kenapa `on delete cascade`? Invoice bisa terhapus bersama tenant.
--    Kalau foreign key-nya `restrict`, penghapusan tenant gagal karena
--    add-on-nya masih menempel -- dan itu persis gejalanya "owner tidak
--    bisa berhenti jadi pelanggan", yang sudah pernah terjadi sekali di
--    trigger `delivery_proofs`.

alter table public.saas_invoices
  add column if not exists midtrans_amount bigint;
--> statement-breakpoint
alter table public.saas_invoices
  add column if not exists bundled_with uuid
    references public.saas_invoices(id) on delete cascade;
--> statement-breakpoint

-- Backfill SEBELUM `set not null`. Invoice lama tidak tahu apa pun soal
-- penggabungan, jadi nominal tagihannya memang sama dengan `amount`.
update public.saas_invoices
  set midtrans_amount = amount
  where midtrans_amount is null;
--> statement-breakpoint

alter table public.saas_invoices
  alter column midtrans_amount set not null;
--> statement-breakpoint

-- CHECK, bukan sekadar NOT NULL: `bigint` menyimpan 0 dan negatif tanpa
-- keluhan, dan `gross_amount` Rp 0 yang dianggap cocok membuat webhook
-- melunasi tagihan yang tidak pernah ditagih. Nol adalah nilai yang salah,
-- bukan sekadar tidak wajar.
--
-- Diberi nama supaya bisa di-drop dengan `if exists` di migrasi
-- berikutnya. `COMMENT ON CONSTRAINT` TIDAK dipakai: Postgres hanya
-- mendukungnya untuk constraint pada domain dan foreign key, dan
-- memakainya untuk CHECK gagal dengan "syntax error at or near ." yang
-- tidak menyiratkan apa pun (lihat 0022).
alter table public.saas_invoices
  drop constraint if exists saas_invoice_midtrans_amount_positive;
--> statement-breakpoint
alter table public.saas_invoices
  add constraint saas_invoice_midtrans_amount_positive
  check (midtrans_amount > 0);
--> statement-breakpoint

create index if not exists saas_invoice_bundled_idx
  on public.saas_invoices (bundled_with);
