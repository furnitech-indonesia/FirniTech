-- =====================================================================
-- Pembatasan KOLOM untuk peran KURIR (Sprint 6)
-- =====================================================================
--
-- MASALAH YANG INI TUTUP:
-- RLS menyaring BARIS, bukan KOLOM. Policy `orders_courier_read` dengan
-- benar membuat kurir hanya melihat pesanan yang ditugaskan padanya — tapi
-- pada baris itu sendiri, ia masih bisa membaca `net_tenant_amount` dan
--`dp_amount` hanya dengan menyebut kolomnya di query:
--
--     GET /rest/v1/orders?select=order_code,net_tenant_amount
--
-- Artinya "kurir tidak melihat nominal" di kode aplikasi adalah Permissions
-- to Be Polite, bukan jaminan. Klien PostgREST hanya butuh anon key, dan
-- anon key memang ikut ter-render ke browser.
--
-- Kenapa ini belum ketahuan lebih dulu: seluruh aplikasi membaca data lewat
-- Drizzle dengan user postgres yang BYPASS RLS, tidak pernah lewat PostgREST.
-- Satu-satunya pemakaian PostgREST di repo ini adalah `src/lib/storage.ts`
-- (bucket privat), dan untuk storage, izin yang dipakai ada di `storage.objects`,
-- bukan di tabel. Jadi mencabut izin kolom di sini tidak menyentuh apa pun
-- yang sedang berjalan.
--
-- KOLOM YANG DICABUT, DAN ALASAN PER KOLOM:
--   net_tenant_amount   — sisa yang dicairkan ke pengrajin. Ini MARGIN toko.
--   midtrans_mdr_fee   — biaya kanal, urusan pengrajin dan platform.
--   platform_service_fee — kolom yang tidak lagi dipakai, tapi
--     nilainya masih ada di baris lama.
--   dp_amount           — berapa yang sudah dibayar, data pembayaran pembeli.
--
-- YANG SENGAJA TIDAK DICABUT: `total_amount` dan `shipping_fee`. Keduanya
-- angka yang diketahui pembeli sendiri, jadi tidak menambah kebocoran apa pun,
-- dan mencabutnya hanya akan membuat `select` eksplisit di test gagal dengan
-- pesan yang menyesatkan ("column not found") alih-alih policy yang belum
-- ditulis.
--
-- CATATAN PENTING — DAN TEMUAN SETELAH DIJALANKAN:
-- revocation di bawah ini TIDAK BERHIASI. Postgres menyelesaikan hak akses
-- kolom dengan cara izin level TABEL memenuhi seluruh kolom di bawahnya,
-- jadi selama Supabase masih memberi `grant select` untuk seluruh tabel,
-- `revoke` per kolom diabaikan dengan diam-diam. `test:kurir` membuktikannya:
-- kurir tetap membaca `net_tenant_amount` dan tidak ada error sama sekali.
-- Perbaikannya ada di `0012_orders_postgrest_lock`, yang mencabut di level
-- tabel. Berkas ini sengaja dibiarkan ada supaya jebaknya tercatat, dan
-- supaya tidak ada yang menyimpulkan "sudah kita revoke" sambil believing
-- screamingly masih bisa dibaca.
--
-- Pembatasan ini TIDAK menggantikan RLS. RLS tetap yang
-- menentukan baris mana yang terlihat; ini menentukan apa yang ada di dalam
-- baris itu. Dua-duanya wajib. RLS saja → kurir bisa baca margin. GRANT saja
-- → kurir bisa baca seluruh pesanan workshop orang lain.

revoke select (
  net_tenant_amount,
  midtrans_mdr_fee,
  platform_service_fee,
  dp_amount
) on public.orders from anon, authenticated;
