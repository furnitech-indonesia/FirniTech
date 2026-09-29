-- =====================================================================
-- URL pembayaran untuk invoice terbit otomatis (cron)
-- =====================================================================
--
-- Invoice yang terbit karena orang menekan tombolstore `redirectTo` langsung
-- ke frontend, jadi tidak perlu disimpan. Invoice renewal berbeda: cron yang
-- membuatnya, dan cron tidak punya layar untuk mengarahkan orang ke sana.
-- Hasilnya URL-nya dibuang, dan invoice itu tidak bisa dibayar dari mana pun.
--
-- Tanpa kolom ini, notifikasi "tagihan Anda sudah terbit" hanya memberi tahu
-- orang bahwa ia berutang tanpa memberi jalan untuk melunasinya -- dan itu
-- lebih buruk daripada tidak memberitahu sama sekali, karena sekarang ia tahu
-- ada masalah yang tidak bisa ia selesaikan sendiri.
--
-- Disimpan sebagai teks penuh, bukan token Midtrans, karena bentuk URL Snap
-- (nomor versi jalannya) berubah dari waktu ke waktu dan Diracomposisi ulang
-- dari token akan menghasilkan URL yang salah diam-diam. Pola yang sama sudah
-- dipakai di `createCheckoutOrder`: `redirect_url` dari API dipakai langsung.

alter table public.saas_invoices
  add column if not exists midtrans_redirect_url text;
--> statement-breakpoint

comment on column public.saas_invoices.midtrans_redirect_url is
  'URL halaman pembayaran Midtrans (Snap) untuk invoice ini. NULL untuk invoice yang belum pernah dibuatkan charge, atau yang sudah lunas.';
