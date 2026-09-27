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

Keputusan pemilik produk, 2026-09-27. Angka dan sumber tarifnya di bagian 1–5;
risiko dan konfirmasinya di bagian 8. Revisi ini **mengganti** model sebelumnya
yang memakai fee platform untuk menutup fee Midtrans.

Aturan yang mengikat:

* **Kanal pembayaran: HANYA Bank Transfer dan Virtual Account.** Tidak ada
  QRIS, e-wallet, maupun kartu kredit. Alasannya ekonomi: fee VA Rp 4.000
  flat per transaksi, sedangkan kanal lain memakai MDR persen yang merupakan
  lapisan biaya tambahan. Konsekuensi bagusnya: fee menjadi **konstanta**,
  bukan tabel per channel.
* **Seluruh fee Midtrans ditanggung pengrajin.** Bukan dipotong dari platform
  fee 1,5%, dan bukan pula disamarkan lewat markup ke harga produk.
  Pembayar membayar harga apa adanya.
* **Platform Service Fee 1,5% dihitung dari `totalAmount`** = subtotal
  produk + ongkir. Ongkir ikut dihitung.
* **Pencatatan: fee Midtrans dicatat sebagai BEBAN**, bukan pengurangan
  pendapatan. Jadi fee tidak pernah "menghilang" di dalam revenue.

### Rumus

```
platformFee  = 1,5% × totalAmount        (produk + ongkir, dibulatkan ke rupiah penuh)
feeMasuk     = Rp4.440                   (VA + PPN, per transaksi berhasil)
feePayout    = Rp5.000                   (per eksekusi pencairan, bukan per order)

escrow masuk  = totalAmount − feeMasuk
saldo pengrajin += totalAmount − platformFee − feeMasuk
saat payout   : saldo ditransfer = saldo − feePayout
pendapatan platform = platformFee
```

`feePayout` dipotong **sekali per eksekusi pencairan**, bukan per order di
dalam batch itu. Kalau satu pengrajin punya lima order lunas dalam satu slot,
dia membayar Rp 5.000 sekali, bukan Rp 25.000. Ini yang membuat peng batching
per pengrajin jadi wajib, bukan opsional.

### Contoh — pesanan Rp 10.000.000

```
Harga produk + ongkir            Rp10.000.000   (yang dibayar pembeli)
  escrow dikreditkan Midtrans     Rp 9.995.560   (setelah fee Rp4.440)

Platform Service Fee 1,5%         Rp  150.000   → FurniTech
fee Midtrans masuk                Rp    4.440   → pengrajin
                                 ─────────────
saldo pengrajin masuk             Rp 9.845.560

saat pencairan, fee payout        Rp    5.000   → pengrajin
ditransfer ke pengrajin           Rp 9.840.560

Cek buku: 150.000 + 9.840.560 + 5.000 = 9.995.560 ✓ sama dengan escrow
```

Beban total pengrajin per pesanan: **Rp 9.440**. Pendapatan platform: **persis
1,5% GMV**, tanpa ada yang dipotong dari sana.

### Contoh — langganan Basic Rp 300.000

Fee Midtrans ditanggung pengrajin, jadi yang dia bayar benar-benar Rp 300.000
dan FurniTech menerima **Rp 295.560**. Tidak ada pencairan di alur ini.

## 7. Konsekuensi dari keputusan "fee ditanggung pengrajin"

Bagian ini bukan bantahan atas keputusan itu — konsekuensi yang harus
dis studsial, dan sebagian besar soal tampilan.

**1. Platform aman, pengrajin menanggung biaya tetap.** Fee-nya flat
(Rp 4.440 + Rp 5.000) sementara platform fee-nya persen. Untuk pesanan
besar, orang hampir tidak merasakannya: Rp 9.440 dari Rp 10.000.000 adalah
0,09%. Untuk pesanan kecil, itu terasa:

| Harga pesanan | Platform fee | Beban pengrajin | Pengrajin terima | Beban/total |
|---|---|---|---|---|
| Rp 10.000.000 | Rp 150.000 | Rp 9.440 | Rp 9.840.560 | 0,09% |
| Rp 1.000.000 | Rp 15.000 | Rp 9.440 | Rp  975.560 | 0,94% |
| Rp 500.000 | Rp 7.500 | Rp 9.440 | Rp  483.060 | 1,89% |
| Rp 300.000 | Rp 4.500 | Rp 9.440 | Rp  286.060 | 3,15% |
| Rp 100.000 | Rp 1.500 | Rp 9.440 | Rp   89.060 | 9,44% |
| Rp 50.000 | Rp 750 | Rp 9.440 | Rp   39.810 | 18,88% |

**Kepatuhan yang harus dipenuhi tanpa syarat:** pengrajin yang memasang harga
Rp 100.000 akan kehilangan 9,4% dari transaksi itu. Itu harus **tertulis dan
terlihat sebelum** dia memasang harga, bukan ditemukan setelah uang
kurang. Kalau tidak, platform bisa dituduh memungut biaya tersembunyi dari
mitra dagangnya. Tiga tempat yang wajib menyebutkannya:
   - halaman pengaturan toko / ridiculously wizard pendaftaran: "Biaya
     layanan 1,5% dan biaya payment gateway dipotong dari pembayaran."
   - ringkasan saldo siap cair di dashboard pengrajin: pemisahan jelas
     antara "nilai pesanan", "biaya layanan", dan "biaya gateway".
   - halaman detail pesanan: rincian lengkap, bukan satu angka.

**2. Halaman lacak publik TIDAK BOLEH menampilkan ini.**— aturan `test:lacak`
tetap berlaku: margin, fee platform, dan fee gateway tidak boleh muncul di
halaman yang dilihat pembeli. Yang ditampilkan ke pembeli tetap "Total
Rp 10.000.000" — dan itu benar, karena itulah yang dia bayar.

**3. Platform fee 1,5% sekarang menutup nol biaya.** Tidak ada lagi biaya
yang dipotong dari fee platform, jadi tarif 1,5% bisa diturunkan kapan saja
tanpa perubahan struktural. Ini keputusan harga yang sepenuhnya
milik FurniTech sekarang.

**4. Satu pencairan per pengrajin, bukan per order.** Kalau pengrajin punya
tiga order lunas di slot yang sama, dia harus dapat **satu** pencairan
(Rp 5.000 sekali). Kalau dibayar per order, dia kehilangan Rp 10.000 extra
dari yang seharusnya hanya Rp 5.000. Ini yang mengikat langsung ke desain
`payout_items`.

**5. Pengrajin menunggu 1–2 hari.** Pembeli membayar hari ini, uang masuk ke
saldo setelah settlement, baru cair pada slot terdekat. Itu harus tertulis
di halaman saldo, kalau tidak pertanyaan pertama ke customer support akan
tentang itu.

## 8. Yang harus dikonfirmasi ke Midtrans

**1. [PENTING] Apakah Rp 5.000 itu per-penerima atau per-batch?**

Ini satu jawaban yang menentukan desain seluruh sistem. Contoh konkrit:

> Kita memanggil API Payouts **sekali**, dan di dalam panggilan itu ada
> 10 pengrajin yang dibayarkan.
>
> * Kalau **per-batch** → total biaya Rp 5.000 untuk 10 orang.
> * Kalau **per-penerima** → total biaya Rp 5.000 × 10 = **Rp 50.000**.
>
> Panggilan API-nya sama persis, 10 pengrajinnya sama persis, biayanya
> berbeda 10 kali lipat.

Kenapa ini penting sekali sekarang: karena fee ditanggung pengrajin, kalau
biaya per-penerima dan kita pencairan 2× sehari, satu pengrajin dengan satu
order sehari kehilangan **Rp 10.000 per hari**. Itu tidak bisa dipakai.
Solusinya kalau per-penerima: hanya pencairan saat saldo sudah melewati ambang
( misalnya Rp 1.000.000), sehingga fee itu menyatu dalam satu transfer besar.
Kalau per-batch, kita bebas menjadwalkan.

**2. Konfirmasi ulang: saldo merchant balance bisa jadi sumber dana
Payouts?** Ini dijawab "bisa", tapi sumber jawabannya belum jelas — apakah
dari dokumentasi Midtrans atau dari pengamatan. Kalau benar, maka uang tidak
perlu ditarik ke rekening bank lalu di-*top-up* ulang, dan tidak ada biaya
maupun hari tambahan. Kalau ternyata harus lewat bank, seluruh perhitungan
waktu pencairan berubah. **Jangan diasumsikan** — ini yang membuat atau
meruntuhkan model alur dana.

**3. Angka VA: Rp 4.000 atau Rp 5.000?** Halaman resmi menampilkan keduanya
di tempat berbeda (bagian 5). Kemungkinan besar Rp 4.000 + "Bank Transfer
Fee" Rp 1.000 yang hanya berlaku kalau rekening bukan bank Midtrans — tapi
itu hipotesis, dan angkanya masuk ke pengrajin, jadi salah berarti salah
bayar orang.

**4. Skema Payouts: aggregator atau facilitator, dan bagaimana keduanya
terhubung dengan saldo escrow merchant?**

**5. Berapa slot pencairan yang boleh aktif bersamaan?** PRD menyebut 06.00
& 18.00 WIB. Perlu dipastikan keduanya bisa, dan apakah ada batas minimum
saldo per pencairan.

**6. Channel VA mana yang perlu aktivasi produksi?** Semua aktif di sandbox,
tetapi tidak semuanya layak dipakai produksi — lihat bagian 9.

## 9. Rekomendasi channel pembayaran

Semua VA sekarang aktif di sandbox, tapi **sandbox tidak bliss punya
batas nilai transaksi yang sama** dengan produksi. Yang onerous: Midtrans
menetapkan batas maksimal per acquiring bank, dan batas itu berlaku di
produksi.

| Channel | Maksimum produksi | Rekomendasi |
|---|---|---|
| **BNI VA** | tanpa batas | ✅ aktifkan |
| **Danamon VA** | tanpa batas | ✅ aktifkan |
| **BSI VA** | tanpa batas | ✅ aktifkan |
| **BCA VA** | Rp 20 miliar | ✅ aktifkan |
| **BRI VA** | Rp 20 miliar | ✅ aktifkan |
| Mandiri Bill | Rp 50 miliar | △ opsional, UX-nya echannel (bukan VA) |
| Permata VA | Rp 9,999 miliar | ❌ tidak untuk mebel besar |
| Seabank VA | Rp 100 juta | ❌ terlalu kecil |
| **CIMB VA** | **Rp 250 juta** | ❌ terlalu kecil |

Rekomendasi: aktifkan **BNI, Danamon, BSI, BCA, BRI**. Kelima-nya
menutup Rp 20 miliar per transaksi, jauh di atas nilai pesanan mebel yang
yang wajar, dan kesemuanya bank besar yang sudah umum dipakai orang.

Alasan menolak CIMB dan Permata keduanya soal **batas maksimum**, bukan soal
reputasi banknya. CIMB Rp 250 juta akan menolak satu pesanan kitchen set yang
sendirian, dan Permata Rp 9,999 miliar akan menolak pesananTimeout di atas itu.
Menampilkan channel yang pasti menolak pembayaran besar menghasilkan
checkout gagal — dan pembeli tidak akan mengulang dua kali.

Catatan: batas itu milik *acquirer*, dan bank penerbit bisa imposing batas
sendiri. Midtrans juga bisa imposing batas tambahan di level merchant.
Batas produksi per channel harus diuji ulang setelah akun produksi aktif.

## 10. Rekomendasi implementasi

1. **Fee adalah dua konstan, bukan tabel.** `FEE_MASUK = 4.440` dan
   `FEE_PENCAIRAN = 5.000`, dengan nilai awal **kosong** di environment.
   Kalau kosong, pencairan DIBLOKIR dengan pesan yang terbaca — bukan `?? 0`.
   Sama seperti aturan `findShippingRate()`.
2. **Fee masuk dicatat per tagihan, bukan per pesanan.** Karena Midtrans
   memotong saat pencairan,fee itu mengikat ke satu invoice. Ini membuat
   rekonsiliasi per-bulan jadi sederhana.
3. **Satu baris `payout_items` per order, dan satu order tidak boleh masuk
   dua batch.** Itu penjaga idempotensi yang sesungguhnya — bukan sekadar
   "batch-nya tidak dobel".
4. **Rekonsiliasi bulanan:** bandingkan `Total Fee` di Billings dengan
   `(jumlah invoice + jumlah pesanan) × Rp4.440` plus
   `(jumlah eksekusi pencairan) × Rp5.000`. Selisih apa pun berarti salah
   satu konstanta di atas salah, dan itu akan ketahuan di sini.
5. **Rincian biaya harus tampil di tiga tempat** (bagian 7 butir 1), dan
   `test:lacak` harus terus mengunci agar rincian itu tidak bocor ke halaman
   pembeli.
