# Biaya (fee) Midtrans

Hasil pengecekan dokumentasi Midtrans. **Dicek pada 2026-09-27.**

Dokumen ini menjawab satu pertanyaan: berapa biaya yang benar-benar dipotong
dari setiap transaksi FurniTech, dan dari mana angka itu harus diambil kalau
kita perlu memotong sebelum pencairan.

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

Kapan fee dipotong (dokumen #7, kalimat resmi):

> "Midtrans secara otomatis memotong biaya pada saat *merchant* melakukan
> pencairan dana."

Jadi fee **tidak** dipotong per transaksi secara langsung, tapi dijumlahkan dan
dipotong dari saldo saat pencairan. Konsekuensinya: biaya Rp 4.000 di atas
menjadi **biaya per invoice**, bukan per rupiah.

### Batas nilai transaksi per bank (VA)

Fee-nya sama Rp 4.000 untuk semua bank, tapi **batas maksimalnya berbeda
banyak** — dan itu menentukan bank mana yang boleh dipakai untuk pesanan mebel
bernilai besar.

| Bank | Minimum | Maksimum |
|---|---|---|
| Mandiri Bill | Rp 1 | Rp 50.000.000.000 |
| BRI VA | Rp 1 | Rp 20.000.000.000 |
| BCA VA | Rp 10.000 | Rp 20.000.000.000 |
| Danamon VA | Rp 1 | tanpa batas |
| BSI VA | Rp 1.000 | tanpa batas |
| BNI VA | Rp 1 | tanpa batas |
| Permata VA | Rp 1 | Rp 9.999.999.999 |
| Seabank VA | Rp 10.000 | Rp 100.000.000 |
| CIMB VA | Rp 1 | **Rp 250.000.000** |

Dua catatan dari disclaimer resmi: batas di atas milik *acquirer*, dan bank
penerbit bisa imposing batas sendiri; Midtrans juga bisa imposing batas
tambahan di level merchant untuk mitigasi risiko. **CIMB Rp 250 juta** adalah
yang paling menyempit, dan **Permata Rp 9,999 miliar** akan menolak satu
pesanan yang lebih besar. Keduanya harus dikecualikan dari daftar channel untuk
pesanan besar.

---

## 2. Temuan yang paling menentukan: MDR adalah komponen TERPISAH

Ini tidak terlihat dari tabel tarif, dan terbaca dari definisi kolom di
halaman Billings (dokumen #4):

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

## 6. Model bisnis FurniTech yang ditetapkan

putusan pemilik produk (2026-09-27). Angka ini dipakai sebagai acuan
implementasi payout, dan menggantikan model lama di PRD §2.C yang menyatakan
fee Midtrans dipotong "dari total nilai pembayaran".

**Hanya Bank Transfer dan Virtual Account** yang dipakai untuk ketiga alur.
Semua tarif MDR persen, e-wallet, dan kartu kredit di bagian 1 tidak
berlaku.

### Alur 1 — Pembayaran langganan FurniTech

Fee Midtrans dipotong dari total yang dibayar pengrajin.

```
Paket Basic Rp300.000
  − fee Midtrans Rp4.000
  − PPN 11%             Rp440
  = diterima FurniTech Rp295.560
```

| Paket | Harga | Diterima FurniTech |
|---|---|---|
| Basic / bulan | Rp 300.000 | Rp 295.560 |
| Pro / bulan | Rp 500.000 | Rp 495.560 |
| Max / bulan | Rp 1.000.000 | Rp 995.560 |
| Basic / tahun | Rp 3.240.000 | Rp 3.235.560 |

Tidak ada pencairan di alur ini — ini pendapatan platform langsung.

### Alur 2 — Pembelian produk oleh pembeli

Pembayar **tidak** membayar biaya layanan apa pun. Buyer pays
`gross_amount` = harga produk + ongkir, apa adanya. Platfom service fee 1,5%
menggantikan biaya Midtrans, dan pengrajin mendapat sisanya.

```
Harga produk Rp10.000.000
  Buyer membayar              Rp10.000.000
  Escrow dikreditkan Midtrans  Rp 9.995.560   (setelah fee Rp4.440)
  Platform service fee 1,5%   Rp  150.000
  − fee Midtrans               Rp    4.440
  = pendapatan FurniTech      Rp  145.560
  Dibayar ke pengrajin         Rp 9.850.000

Cek buku: 9.850.000 + 145.560 = 9.995.560 ✓ sama dengan saldo escrow
```

Buku-balance, tapi hanya kalau pencairan ikut diperhitungkan — lihat
"Biaya yang belum masuk di contoh" di bawah.

### Alur 3 — Pencairan ke pengrajin

Nilai transfer **tidak** dipotong; fee ditanggung FurniTech.

```
Saldo pengrajin yang siap dicairkan   Rp50.000.000
  Dikirim ke rekening pengrajin        Rp50.000.000   (penuh)
  Fee payout Midtrans                  Rp     5.000   ditanggung FurniTech
```

---

## 7. Biaya yang BELUM masuk di contoh, dan akibatnya

Bagian ini sengaja ada: model di atas benar secara aritmetika, tapi belum
mencakup semua biaya. Kalau tidak dihitung sekarang, angka ini baru terasa
saat uangnya benar-benar hilang.

**Biaya payout Rp 5.000 tidak ikut dihitung pada contoh Alur 2.** Pada satu
pesanan, total biaya FurniTech adalah:

```
fee masuk  Rp4.440   (VA, dipotong saat pencairan dana)
fee keluar Rp5.000   (pencairan ke pengrajin)
                -------
                Rp9.440 per pesanan
```

Pendapatan platform sebenarnya:

```
pendapatan = 1,5% × harga − Rp9.440
```

| Harga pesanan | Fee 1,5% | Pendapatan bersih | Keterangan |
|---|---|---|---|
| Rp 10.000.000 | Rp 150.000 | **Rp 140.560** | sehat |
| Rp 1.000.000 | Rp 15.000 | Rp 5.560 | tipis |
| Rp 630.000 | Rp 9.450 | Rp 10 | impas |
| Rp 296.000 | Rp 4.440 | **Rp 5.000** | rugi |
| Rp 100.000 | Rp 1.500 | **Rp 7.940** | rugi besar |

**Titik impas: Rp 629.333.** Di bawah itu FurniTech **kehilangan uang** pada
setiap pesanan, dan itu splendidly tidak akan terlihat dari laporan
penjualan — karena yang salah bukan omzetnya, tapi fee-nya.

Mebel kustom umumnya bernilai ratusan juta sampai miliaran, jadi risikonya
nyata tapi kecil. Yang bisa melukai: pesanan kecil berupa aksesori, ganti kaki meja, atau
servis perbaikan. Tiga pilihan untuk menutupnya:

1. Tetapkan **minimum nilai pesanan** Rp 1.000.000 di storefront. Paling
   sederhana, dan mebel custom memang jarang sekali checkout di bawah itu.
2. Naikkan **platform fee minimum** jadi Rp 10.000 kalau 1,5% di bawah itu.
   Lebih adil, tapibuyer harus diberi tahu fee-nya sebelum bayar.
3. Biarkan. Paling sederhana, tapi rugi diam-diam.

**Biaya pencairan per-batch adalah variabel terbesar yang belum diketahui.**
Kalau Rp 5.000 itu berlaku **per penerima** dan ada dua slot pencairan per
hari, maka:

| Jumlah pengrajin aktif | Disbursement/hari | Fee payout/hari | Fee payout/bulan |
|---|---|---|---|
| 1 | 2 | Rp 10.000 | Rp 300.000 |
| 10 | 20 | Rp 100.000 | Rp 3.000.000 |
| 50 | 100 | Rp 500.000 | Rp 15.000.000 |
| 100 | 200 | Rp 1.000.000 | Rp 30.000.000 |

Kalau berlaku **per batch** (2 batch/hari), biayanya Rp 10.000–Rp 300.000 per
bulan tanpa tergantung jumlah pengrajin. Selisihnya pada 100 pengrajin adalah
**Rp 29,7 juta per bulan**. Pertanyaan ini harus dijawab Midtrans sebelum
sistem payout dibangun, bukan sesudahnya.

**DP/pelunasan mengalikan biaya.** Back-office punya skema DP + pelunasan. Kalau
checkout storefront mengizinkan dua pembayaran untuk satu pesanan, fee masuk
jadi Rp 8.880 (dua × Rp 4.440). Checkout yang sekarang menagih sekali penuh, dan itu **harus
dipertahankan** — bukan hanya demi kenyamanan.

**Uang menunggu di Midtrans.** Pembeli membayar hari ini; uang baru masuk
ke saldo setelah settlement (VA umumnya hari yang sama atau keesokan), dan
baru cair ke pengrajin pada slot 06.00/18.00. Pengrajin menunggu minimal 1–2 hari. Ini harus ditulis di halaman "saldo siap cair", kalau tidak
pertanyaan pertama yang masuk ke customer support akan tentang itu.

---

## 8. Yang harus dikonfirmasi sebelum mesin payout dibangun

**Ke Midtrans (menentukan kelayakan model):**

1. Apakah fee payout Rp 5.000 itu **per penerima** atau **per batch**? Ini
   pertanyaan paling mahal di daftar ini — lihat tabel di bagian 7.
2. Bagaimana **saldo escrow** (merchant balance) terhubung ke saldo
   **Payouts**? Apakah saldo yang sama bisa jadi sumber dana pencairan
   langsung, atau uang harus ditarik ke rekening bank dulu lalu di-top-up
   ulang? Kalau harus lewat bank, ada hari tambahan pencairan dan fee lagi.
3. Skema Payouts: aggregator atau facilitator.
4. Angka VA: Rp 4.000 atau Rp 5.000, dan apa hubungannya dengan
   "Bank Transfer Fee" (dokumen ini menemukan dua angka berbeda di satu
   halaman resmi).
5. channel VA mana saja yang benar-benar **aktif** di akun merchant
   `M527250896`, dan apakah batas maksimal yang tertera di bagian 1 berlaku
   untuk akun kita atau bisa berbeda.
6. Berapa slot payout yang boleh aktif bersamaan (PRD menyebut 06.00 &
   18.00 WIB), dan apakah ada batas minimum saldo per pencairan.
7. Apakah fee Rp 4.000 dan Rp 5.000 bisa dinegosiasikan turun, mengingat
   volumenya masih kecil di awal. Break-even model ini Rp 629.333 per
   pesanan — margin yang bisa hilang kalau fee naik.

**Putusan internal (tidak perlu Midtrans):**

8. Minimum nilai pesanan storefront, atau platform fee minimum.
9. Apakah platform fee 1,5% dihitung dari `totalAmount` (produk + ongkir)
   atau hanya dari harga produk. Bedanya nyata: ongkir Rp 500.000 menambah
   fee platform Rp 7.500, dan itu uang yang **tidak pernah melewati
   FugraTech sebagai pendapatan** kalau pengrajin yang menanggung ongkirnya.
10. Pembukuan: apakah fee Midtrans dicatat sebagai pengurangan pendapatan atau
   sebagai beban. Secara akuntansi, mencatatnya sebagai beban lebih benar.

---

## 9. Rekomendasi implementasi

1. **Fee Midtrans adalah konstanta per-alur, bukan tabel MDR.** Karena
   hanya Bank Transfer/VA yang dipakai, tidak ada tabel tarif per channel
   yang perlu dikelola — cukup dua konstanta yang nilainya sudah diputuskan:
   `FEE_MASUK = 4.440` dan `FEE_KELUAR = 5.000`. Ini jauh lebih sederhana
   daripada rencana semula, dan risikonya lebih kecil karena tidak ada
   channel yang bisa salah pilih.
2. **Tetap blokir kalau konstanta belum diisi.** Nilai awalnya kosong, dan
   payout berhenti dengan pesan yang bisa dibaca kalau kosong — sama seperti
   aturan `findShippingRate()` yang tidak boleh `?? 0`.
3. **Rekonsiliasi bulanan tetap wajib.** Bandingkan `Total Fee` di Billings
   dengan `(jumlah tagihan langganan + jumlah pesanan) × Rp4.440` plus
   `jumlah pencairan × Rp5.000`. Selisih apa pun berarti salah satu
   asumsi di dokumen ini salah, dan itu akan ketahuan di sini — bukan
   saat pengrajin mengeluh.
4. **Fee masuk dicatat per tagihan, bukan per pesanan.** Karena Midtrans
   memotong saat pencairan, fee itu mengikat ke satu invoice tertentu; itu
   membuat rekonsiliasi jauh lebih mudah.
