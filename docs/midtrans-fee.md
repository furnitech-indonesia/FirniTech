# Biaya (fee) Midtrans

Hasil pengecekan dokumentasi Midtrans. **Dicek pada 2026-09-27.**

Dokumen ini menjawab satu pertanyaan: berapa biaya yang benar-benar dipotong dari
setiap transaksi FurniTech, dan dari mana angka itu harus diambil kalau kita
perlu memotong sebelum pencairan.

Sumber yang dipakai (urutan otoritas):

| # | Sumber | Dipakai untuk |
|---|---|---|
| 1 | [midtrans.com/id/biaya](https://midtrans.com/id/biaya) | Tabel tarif resmi per metode pembayaran |
| 2 | [docs.midtrans.com/docs/how-much-does-midtrans-charge-for-its-payment-service](https://docs.midtrans.com/docs/how-much-does-midtrans-charge-for-its-payment-service) | Aturan PPN dan MDR |
| 3 | [docs.midtrans.com/docs/will-i-be-charged-for-chargebacks-or-refunds](https://docs.midtrans.com/docs/will-i-be-charged-for-chargebacks-or-refunds) | Biaya refund/chargeback |
| 4 | [docs.midtrans.com/docs/receive-your-fund](https://docs.midtrans.com/docs/receive-your-fund) | Definisi komponen biaya di halaman Billings |
| 5 | [docs.midtrans.com/docs/https-notification-webhooks](https://docs.midtrans.com/docs/https-notification-webhooks) | Isi payload notifikasi |
| 6 | [docs.midtrans.com/docs/get-status-api-requests](https://docs.midtrans.com/docs/get-status-api-requests) | Isi respons GET status |
| 7 | [docs.midtrans.com/docs/disbursement-overview](https://docs.midtrans.com/docs/disbursement-overview) | Payouts (dulu IRIS) |

---

## 1. Tarif resmi per metode pembayaran

Semua tarif berlaku **per transaksi yang berhasil**. Tidak ada biaya setup,
langganan, maupun integrasi.

| Metode | Tarif | PPN 11%? |
|---|---|---|
| **Bank Transfer / Virtual Account** | Rp 4.000 per transaksi | Ya |
| &nbsp;&nbsp;BCA VA, BRIVA, BNI VA, Mandiri Bill, Permata VA, CIMB VA, Danamon VA, BSI VA, SeaBank, Bank Saqu | (semua Rp 4.000) | Ya |
| **QRIS** | 0,7% | **Tidak** |
| **GoPay** | 2% | **Tidak** |
| **ShopeePay** | 2% | **Tidak** |
| **DANA** | 1,5% | Tidak |
| **OVO** | 1,5% | Tidak |
| **Kartu kredit** (Visa/Mastercard/JCB/Amex/UnionPay) | 2,9% + Rp 2.000 | Tidak (MDR) |
| **Indomaret** | Rp 5.000 | Tidak |
| **Alfamart / Alfamidi / DAN+DAN** | Rp 5.000 | Tidak |
| **Akulaku PayLater** | 1,7% | Tidak |
| **Kredivo** | 2% | Tidak |

Peringatan resmi di halaman tersebut: "Biaya yang berbeda akan berlaku untuk
perusahaan gaming & produk digital." Meubel tidak termasuk kategori itu, tapi
kategori bisnis di akun merchant harus dikonfirmasi.

### PPN 11%

Aturannya (dokumen #2): **PPN diambil dari nilai biaya, bukan ditambahkan ke
transaksi pembeli.** Contoh resmi:

> Harga barang Rp 100.000, bayar dengan Bank Transfer, biaya Midtrans Rp 4.000.
> PPN 11% diambil dari nilai itu sehingga total biayanya Rp 4.440. Merchant
> menerima Rp 100.000 − Rp 4.440 = **Rp 95.560**.

Artinya biaya yang benar-benar keluar dari saldo merchant adalah
`tarif × 1,11` — **kecuali** QRIS, GoPay, dan ShopeePay, yang disebut eksplisit
tidak termasuk PPN.

### Payout (dulu IRIS)

| Tujuan pencairan | Tarif |
|---|---|
| Rekening bank | Rp 5.000 per transaksi |
| GoPay | Rp 2.500 per transaksi |

Produknya sekarang bernama **Payouts** (bukan IRIS) dan punya dua skema:
*aggregator* (saldo di Midtrans, diisi dari dashboard) dan *facilitator*
(rekening bank sendiri sebagai sumber dana). Skema menentukan dari mana uang
pencairan keluar — dan ini belum diputuskan untuk FurniTech.

---

## 2. Temuan yang paling menentukan: MDR adalah komponen TERPISAH

Ini tidak terlihat dari tabel tarif, dan terbaca dari definisi kolom di halaman
Billings (dokumen #4):

| Kolom | Arti |
|---|---|
| **Total MDR** | "Total transaction fee (**bank**) for credit card payment methods" |
| **Total Transaction Fee** | "Total transaction fee (**Midtrans**) for all payment methods, **excluding MDR**" |
| **Bank Transfer Fee** | Biaya transfer kalau rekening payout berada di bank berbeda dari Midtrans |
| **Total Fee** | Total semua biaya |
| **Payable (Nett)** | Yang benar-benar bisa dicairkan setelah semua biaya dipotong |

Konsekuensinya untuk FurniTech:

1. Biaya **Midtrans** dan MDR **bisa dijumlahkan** — Midtrans memang
   menambahkan MDR ke tagihan di atas biaya transaksinya. Ini perilaku
   standar di industri dan tidak bisa dihindari.
2. Rumus biaya bersih dari satu transaksi:
   ```
   feeMidtrans = tarif(channel) × (1 + PPN)     # kecuali QRIS/GoPay/ShopeePay
   feeMdr      = tarifMdr(channel)                # kalau channel-nya pakai MDR
   total       = feeMidtrans + feeMdr
   ```
3. Angka **pasti berbeda per akun merchant.** Diskon atau skema harga khusus
   yang dinegosiasikan dengan Midtrans tidak muncul di halaman publik. Jadi
   tabel di atas adalah **batas bawah**, bukan angka final.

---

## 3. Yang TIDAK ada di dokumentasi: field biaya di payload

Ini yang paling berpengaruh ke desain mesin payout, jadi diperiksa satu per satu.

- **Payload notifikasi webhook TIDAK memuat biaya.** Semua contoh resmi
  (kartu, GoPay, QRIS, ShopeePay, VA, Mandiri Bill, Indomaret, Alfamart,
  Akulaku) hanya punya `gross_amount`, tanpa `fee_amount` maupun `fee`
  (dokumen #5).
- **Respons `GET /v2/{order_id}/status` juga tidak memuat biaya** di
  dokumentasinya. Field yang terdaftar: `gross_amount`, `fee` — tidak ada;
  yang ada `approval_code`, `bank`, `card_type`, `channel_response_code`,
  `settlement_time`, `refunds`, `refund_amount`, dan seterusnya
  (dokumen #6).

Dulu banyak integrasi membaca `fee_amount` dari respons status, jadi field itu
mungkin memang dikirimkan tapi **tidak terdokumentasi**. Itu dumping ground
untuk asumsi, dan FurniTech tidak boleh bertumpu padanya tanpa bukti.

**Angka biaya yang otoritatif ada di dua tempat, keduanya di dashboard:**

1. **Billings** — ringkasan `Total MDR` / `Total Transaction Fee` / `Payable`.
2. **Transaction report (CSV/Excel dari MAP)** — laporan per transaksi, bisa
   sampai 6 bulan ke belakang. Ekspor dikirim ke email dalam 30 menit dan
   tautannya berlaku 48 jam.

---

## 4. Refund & chargeback

- **GoPay**: tidak ada biaya tambahan. Pelanggan dapat refund 100%, dan merchant
  **tidak** dikenakan biaya atas transaksi yang sudah `settlement`
  (dokumen #3). Ini berbeda dari pengaman reguler: biaya Rp 4.440 pada contoh
  di atas justru *ikut hilang* saat refund GoPay.
- **Refund hanya bisa dilakukan pada transaksi berstatus `settlement`**
  (dokumen #3).
- **Chargeback hanya berlaku untuk kartu kredit**, dan biayanya perlu
  dikonfirmasi ke Midtrans — tidak ada tarif publiknya.
- Untuk VA, QRIS, dan e-wallet: dukungan refund berbeda-beda per channel
  (lihat [daftar metode yang punya fitur refund](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature)).

---

## 5. Nomor yang saling bertentangan di sumber Midtrans

Tabel resmi (dokumen #1) menampilkan **dua angka berbeda untuk bank
transfer** di halaman yang sama:

- Tab "Transfer Bank": **Rp 4.000** per transaksi
- Bagian "Semua metode pembayaran": **Rp 5.000** "per transaksi ke semua akun
  bank"

Pembacaan yang paling mungkin (dan konsisten dengan kolom "Bank Transfer Fee"
di dokumen #4): **Rp 4.000 biaya transaksi + Rp 1.000 biaya transfer kalau
rekening tujuan bukan bank Midtrans**. Tapi ini **hipotesis**, bukan fakta —
sebelum dipakai di kode, harus dikonfirmasi lewat dashboard atau ke tim
Midtrans.

Halaman berbahasa Inggris di subdomain staging
(`stg-v2.midtrans.com/en/pricing`) memberi angka yang **tidak cocok** dengan
halaman resmi (mis. OVO 2% vs 1,5%, Kredivo 2,5% vs 2%). Halaman staging itu
sengaja tidak dipakai sebagai sumber di dokumen ini.

---

## 6. Rekomendasi untuk mesin payout FurniTech

PRD menetapkan platform fee 1,5% dan MDR dipotong sebelum pencairan. Dari
pemeriksaan di atas, urutannya harus begini:

1. **MDR diambil dari konfigurasi, bukan dari kode.** Dengan temuan di
   bagian 3, tidak ada sumber yang bisa dipercaya per-transaksi. Simpan
   tarif MDR per channel di tabel, dengan nilai awal **kosong**.
2. **Kalau tarif channel itu kosong, payout DIBLOKIR** — bukan memakai 0.
   Menahan pencairan lebih baik daripada mengirim angka yang salah, dan
   pesannya bisa menjelaskan apa yang perlu diisi.
3. **Tabel diisi dari Billings dan transaction report.** Setelah pencairan
   pertama, angka asli dari dashboard harus dimasukkan ulang ke tabel. Ini
   satu-satunya cara mendapatkan angka yang benar untuk akun merchant ini.
4. **Rekonsiliasi bulanan.** Unduh transaction report, bandingkan fee per
   transaksi dengan fee yang kita hitung sendiri, dan catat selisihnya.
   Kesalahan tarif akan terlihat di sini, bukan saat pengrajin mengeluh.
5. **Kunci hanya channel yang benar-benar diaktifkan.** `enabled_payments` di
   `src/lib/midtrans/snap.ts` saat ini: `bank_transfer`, `qris`, `gopay`,
   `shopeepay`, `credit_card`, `bca_va`, `bni_va`, `bri_va`, `permata_va`,
   `cimb_va`. Kanal yang tidak aktif tidak perlu tarifnya diisi.

## 7. Yang masih harus dikonfirmasi ke Midtrans

- Angka VA: Rp 4.000 atau Rp 5.000, dan apa hubungannya dengan
  "Bank Transfer Fee".
- Tarif MDR aktual untuk akun merchant `M527250896` per channel.
- Skema Payouts yang dipakai: aggregator atau facilitator.
- Berapa biaya pencairan riil: Rp 5.000 (bank) atau Rp 2.500 (GoPay).
- Apakah biaya pencairan dipotong dari saldo pencairan atau ditagihkan
  terpisah di Billings.
- Berapa slot payout yang boleh aktif bersamaan (PRD menyebut dua slot,
  06.00 dan 18.00 WIB).
