-- =====================================================================
-- Grant per kolom untuk tabel orders (Sprint 6)
-- =====================================================================
--
-- INI PERBAIKAN DARI `0012_orders_postgrest_lock`, dan sekaligus bukti bahwa
-- `0012` masih saja belum cukup.
--
-- `0012` mencabut `select` di level tabel. Margin toko terkunci — tapi
-- `test:kurir` langsung menunjukkan akibat sampingnya: SEMUA pembacaan lewat
-- PostgREST ikut tertutup, termasuk pembacaan yang sah. Empat pengujian
-- RLS yang sebelumnya lulus (`pesanan kurir lain tidak bocor`, `pesanan tanpa
-- kurir tidak terlihat`, `pesanan tenant lain tidak terlihat`, `kurir B hanya
-- melihat pesanannya`) sebenarnya jadi LULUS HAMPA — PostgREST mengembalikan
-- nol baris untuk semua orang, jadi "tidak bocor" terpenuhi tanpa menguji
-- apa pun.
--
-- Itu jebakan yang lebih buruk daripada kebocoran yang ditutup: tes yang
-- hijau sambil tidak menguji. Karena itu grant dikembalikan per kolom, dan
-- hanya untuk kolom yang memang tidak layak keluar lewat jalur anon lewat jalur anon.
--
-- KOLOM YANG TETAP DICABUT (sisi server, tanpa grant di sini):
--   net_tenant_amount     — margin pengrajin setelah MDR dan fee platform.
--   midtrans_mdr_fee     — biaya kanal.
--   platform_service_fee — kolom sisa; fee platform sudah 0% sejak keputusan
--     model biaya final, tapi nilainya masih ada di baris lama.
--   dp_amount            — riwayat pembayaran pembeli.
--   snap_token           — kredensial pembayaran, dan ini yang paling
--                          tidak boleh bocor: siapa pun yang memegangnya
--                          bisa membuka halaman pembayaran VA.
--   transaction_id       — referensi transaksi gateway.
--
-- KOLOM YANG MASIH DIBERIKAN ke `authenticated`:
-- Yaitu data identitas kiriman. Kurir butuh semuanya: tujuan, nomor (dipotong
-- empat digit di loader), nama barang, nomor resi. `total_amount` dan
-- `shipping_fee` ikut karena keduanya angka yang diketahui pembeli sendiri,
-- jadi tidak menambah kebocoran apa pun.
--
-- `anon` TIDAK diberi apa pun. Pembeli tidak punya sesi, dan halaman lacak
-- bekerja lewat server yang tersambung sebagai postgres, bukan lewat
-- PostgREST. Tidak memberi grant apa pun pada anon adalah pilihan yang mudah
-- dibatalkan kalau nanti butuh endpoint publik, dan sulit direview kalau
-- tidak ada.
--
-- CATATAN: `items_subtotal` sengaja TIDAK diberi. Tidak dibutuhkan kurir, dan
-- bersama `shipping_fee` ia bisa dipakai menebak komposisi harga jual
-- pengrajin. Angka itu tidak ada hubungannya dengan mengantar barang.

revoke select on public.orders from anon, authenticated;

grant select (
  id,
  order_code,
  tenant_id,
  order_status,
  customer_name,
  customer_phone,
  customer_address,
  destination_city,
  shipping_fee,
  total_amount,
  cargo_name,
  tracking_number,
  assigned_courier_id,
  created_at,
  updated_at
) on public.orders to authenticated;
