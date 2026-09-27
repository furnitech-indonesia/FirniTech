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
platformFee  = 1,5% × totalAmount        (produk + ongkir, rupiah penuh)
feeMasuk     = Rp4.440                   (VA + PPN 11%, per transaksi) → pengrajin
feePayout    = Rp5.000                   (per BATCH, 2 batch/hari)     → platform

escrow masuk  = totalAmount − feeMasuk
saldo pengrajin += totalAmount − platformFee − feeMasuk
saat payout   : saldo ditransfer = saldo UTUH (tanpa potongan)
pendapatan platform = platformFee
beban platform per hari = Rp10.000
```

Nilai yang ditransfer ke pengrajin **sama persis dengan saldonya** — tidak ada
pemotongan di langkah pencairan sama sekali.

### Contoh — pesanan Rp 10.000.000

```
Harga produk + ongkir            Rp10.000.000   (yang dibayar pembeli)
  escrow dikreditkan Midtrans     Rp 9.995.560   (setelah fee Rp4.440)

Platform Service Fee 1,5%         Rp  150.000   → FurniTech
fee Midtrans masuk                Rp    4.440   → pengrajin
                                 ─────────────
saldo pengrajin masuk             Rp 9.845.560
ditransfer ke pengrajin           Rp 9.845.560   (penuh, tanpa potongan)

Cek buku: 150.000 + 9.845.560 = 9.995.560 ✓ sama dengan escrow

Terpisah, dari saldo merchant balance FurniTech:
  fee payout 2 batch/hari         Rp 5.000 × 2 = Rp10.000/hari
```

**Beban pengrajin hanya Rp 4.440 per pesanan.** Fee pencairan sepenuhnya di
punggung platform, dan karena per batch, biayanya tetap Rp 300.000 per bulan
se berapa pun pengrajin yang aktif.

### Apakah platform aman secara finansial?

Ya — tapi bergantung pada asumsi "per batch" yang belum dikonfirmasi.

```
per order:  1,5% × order − (Rp5.000 ÷ order per batch)
```

| Order per batch | Harga pesanan minimum agar platform tidak rugi |
|---|---|
| 1 | Rp 333.333 |
| 5 | Rp 66.667 |
| 10 | Rp 33.333 |
| 50 | Rp 6.667 |

Mebel custom jauh di atas semua angka itu, jadi platform aman pada volume
normal. **Kalau ternyata fee-nya per-penerima**, tabel ini berubah drastis:
100 pengrajin dengan 1 order per batch = 200 disbursement per hari =
**Rp 30 juta per bulan**, dan platform butuh GMV Rp 2 miliar per bulan untuk
menutupnya. Karena itu asumsi ini **wajib dikonfirmasi tertulis ke Midtrans**
sebelum produksi.

### Contoh — langganan Basic Rp 300.000

Fee Midtrans ditanggung pengrajin, jadi yang dia bayar benar-benar Rp 300.000
dan FurniTech menerima **Rp 295.560**. Tidak ada pencairan di alur ini.

## 7. Konsekuensi dari pembagian beban ini

**1. Beban pengrajin jadi kecil dan rata.** Yang dipotong dari saldonya
hanya `feeMasuk` Rp 4.440, per transaksi:

| Harga pesanan | Platform fee | Beban pengrajin | Pengrajin terima | Beban/total |
|---|---|---|---|---|
| Rp 10.000.000 | Rp 150.000 | Rp 4.440 | Rp 9.845.560 | 0,04% |
| Rp 1.000.000 | Rp 15.000 | Rp 4.440 | Rp  980.560 | 0,44% |
| Rp 500.000 | Rp 7.500 | Rp 4.440 | Rp  488.060 | 0,89% |
| Rp 300.000 | Rp 4.500 | Rp 4.440 | Rp 291.060 | 1,48% |
| Rp 100.000 | Rp 1.500 | Rp 4.440 | Rp  94.060 | 4,44% |
| Rp 50.000 | Rp 750 | Rp 4.440 | Rp  44.810 | 8,88% |

Fee pencairan yang dipindahkan ke platform membuat profil ini jauh lebih baik
daripada model sebelumnya yang membebani Rp 9.440 per pesanan. Sisa masalahnya
hanya pesanan di bawah Rp 150.000, dan mebel custom jarang di sana.

**2. Yang WAJIB ditulis dan terlihat tetap sama.** Biaya pengrajin
kecil, ia tetap biaya yang memotong uangnya, jadi harus disebut sebelum dia
memasang harga — di wizard pendaftaran, di ringkasan saldo siap cair, dan di
rincian detail pesanan. Plus satu hal baru: fee pencairan Rp 5.000, walaupun
ditanggung platform, tetap perlu disebut, karena itu alasan FurniTech
menetapkan ambang minimum pencairan. Kalau pengrajin tidak tahu, dia akan
menanyakan "kenapa saldo saya Rp 900.000 tidak ditransfer?" dan jawabannya
akan terdengar seperti aturan yang dibuat sepihak.

**3. Modal kalkulator harga di modul produk.** Keputusan pemilik produk:
biaya ini harus muncul di modal saat pengrajin membuat produk, supaya dia bisa
menghitung harga jual yang dia inginkan. Rinciannya di bagian 10.

**4. Platform fee 1,5% menutup nol biaya.** Tidak ada lagi yang dipotong dari
fee platform, jadi tarifnya sepenuhnya alat harga dan bisa diturunkan kapan
saja tanpa perubahan struktural.

**5. Tidak perlu minimum nilai pesanan.** Beban platform tidak bergantung
pada nilai pesanan, dan burden pengrajin sudah turun ke 0,04% untuk mebel
besar. Yang tetap perlu minimum adalah **ambang saldo pencairan** — itu soal
Rp 5.000 per batch, bukan soal harga produk.

**6. Halaman lacak publik TIDAK BOLEH menampilkan rincian ini.** aturan
`test:lacak` tetap berlaku: margin, fee platform, dan fee gateway tidak boleh
muncul di halaman yang dilihat pembeli. Yang ditampilkan ke pembeli tetap
"Total Rp 10.000.000" — dan itu benar, karena itulah yang dia bayar.

**7. Pengrajin menunggu 1–2 hari.** Pembeli membayar hari ini, uang masuk ke
saldo setelah settlement, baru cair pada slot terdekat. Itu harus tertulis di
halaman saldo, kalau tidak pertanyaan pertama ke customer support akan
tentang itu.

## 8. Yang harus dikonfirmasi ke Midtrans

Dokumen ini dipakai sebagai daftar pertanyaan. Semua sudah diputuskan dari
sisi FurniTech; yang ditunggu adalah konfirmasi tertulis Midtrans.

**1. [PALING PENTING] Apakah Rp 5.000 itu per-batch atau per-penerima?**

Sudah diputuskan: FurniTech akan menghitungnya sebagai **per batch**
(Rp 10.000 per hari untuk dua slot). Yang ditanyakan hanya apakah asumsi itu
benar. Contoh yang bisa langsung ditunjukkan ke mereka:

> Satu panggilan API Payouts, 10 pengrajin di dalamnya.
> Per-batch = Rp 5.000 total. Per-penerima = Rp 50.000.
> Panggilan yang sama, biaya berbeda 10 kali lipat.

Kalau jawabannya per-penerima, model ini masih layak untuk Rp 10 juta per
pesanan tapi tidak untuk growth ke hundreds of pengrajin — jadi kita perlu
tahu sekarang, bukan setelah 100 pengrajin aktif.

**2. Apakah saldo merchant balance bisa jadi sumber dana Payouts?**

Sudah dijawab "bisa", tapi belum jelas sumber jawabannya. Ini menentukan
apakah uang perlu ditarik ke rekening bank lalu di-*top-up* ke Payouts — yang
berarti ada 1–2 hari tambahan dan fee pencairan kedua. Kalau benar bisa
langsung, arbitrage-nya nol dan seluruh model alur dana benar.

**3. Angka VA: Rp 4.000 atau Rp 5.000?**

Halaman resmi menampilkan keduanya di bagian berbeda (bagian 5). Kemungkinan
besar Rp 4.000 + "Bank Transfer Fee" Rp 1.000 yang hanya berlaku kalau
rekening bukan bank Midtrans — tapi ini hipotesis, dan angkanya masuk ke
saldo pengrajin, jadi salah berarti salah bayar orang.

**4. Skema Payouts: aggregator atau facilitator?**

Sudah diputuskan: **aggregator**, karena uangnya sudah ada di Midtrans dan
rekonsiliasi bisa di satu tempat. Perlu dipastikan bahwa skema aggregator
benar-benar bisa memakai saldo escrow merchant sebagai sumber dana — itu
bergantung pada jawaban nomor 2.

**5. Berapa slot pencairan yang boleh aktif bersamaan?**

PRD menyebut 06.00 & 18.00 WIB. Perlu dipastikan keduanya bisa dipakai, dan
apakah ada batas minimum saldo per pencairan (kalau ada, angka itu yang jadi
ambang minimum kita, bukan angka karangan).

**6. Berapa lama saldo escrow tersedia untuk payout?**

Pembeli membayar hari ini; kapan uangnya bisa ditransfer keluar? Kalau
settlement VA misalnya H+1, maka slot pencairan di hari yang sama tidak
mungkin — dan jadwal slot harus digeser. Ini menentukan apakah slot
pencairan pertama yang dipakai benar-benar bekerja.

**7. Apa nomor API key Payouts-nya, dan apakah sandbox punya endpoint
terpisah dari produksi?** (`MIDTRANS_IRIS_API_KEY` masih kosong.)

**8. Channel VA mana yang perlu diaktifkan di produksi?**

Semua aktif di sandbox. Keputusan: SeaBank dan CIMB **dinonaktifkan**;
BNI, Danamon, BSI, BCA, BRI, Permata tetap aktif. Perlu dipastikan batas
maksimum yang berlaku di produksi sama dengan tabel di bagian 9, dan apakah
Midtrans imposing batas tambahan di level merchant.

## 9. Channel pembayaran produksi

Semua VA aktif di sandbox, tapi **sandbox tidak punya batas nilai transaksi
yang sama dengan produksi.** Midtrans menetapkan batas maksimal per acquiring
bank, dan batas itu berlaku di produksi.

| Channel | Maksimum produksi | Keputusan |
|---|---|---|
| **BNI VA** | tanpa batas | ✅ aktifkan |
| **Danamon VA** | tanpa batas | ✅ aktifkan |
| **BSI VA** | tanpa batas | ✅ aktifkan |
| **BCA VA** | Rp 20 miliar | ✅ aktifkan |
| **BRI VA** | Rp 20 miliar | ✅ aktifkan |
| Permata VA | Rp 9,999 miliar | ✅ aktifkan |
| Mandiri Bill | Rp 50 miliar | △ opsional (echannel, bukan VA) |
| **Seabank VA** | Rp 100 juta | ❌ **dinonaktifkan** |
| **CIMB VA** | **Rp 250 juta** | ❌ **dinonaktifkan** |

Alasan menonaktifkan dua channel itu adalah **batas maksimum nominal**, bukan
reputasi banknya: SeaBank Rp 100 juta dan CIMB Rp 250 juta akan menolak pesanan
mebel yang wajar. Menampilkan channel yang pasti menolak pembayaran besar
menghasilkan checkout gagal, dan pembeli tidak mengulang dua kali.

Permata tetap aktif karena batas Rp 9,999 miliar praktis tidak akan tersentuh
—by furniture order. Kalau nanti ada pesanan di atas angka itu (misalnya satu
proyek apartemen), channelnya perlu dikecualikan secara berkala.

## 10. Rekomendasi implementasi

1. **Fee adalah dua konstan, bukan tabel.** `FEE_MASUK = 4.440` (dibebankan ke
   pengrajin) dan `FEE_PENCAIRAN = 5.000` per batch (dibebankan ke platform),
   dengan nilai awal **kosong** di environment. Kalau kosong, pencairan
   DIBLOKIR dengan pesan yang terbaca — bukan `?? 0`. Sama seperti aturan
   `findShippingRate()`.
2. **Fee masuk dicatat per tagihan, bukan per pesanan.** Karena Midtrans
   memotong saat pencairan, fee itu mengikat ke satu invoice. Ini membuat
   rekonsiliasi per bulan jadi sederhana.
3. **Satu baris `payout_items` per order, dan satu order tidak boleh masuk dua
   batch.** Itu penjaga idempotensi yang sesungguhnya — bukan sekadar
   "batch-nya tidak dobel".
4. **Rekonsiliasi bulanan:** bandingkan `Total Fee` di Billings dengan
   `(jumlah invoice + jumlah pesanan) × Rp4.440` plus
   `(jumlah eksekusi pencairan) × Rp5.000`. Selisih apa pun berarti salah
   satu konstanta di atas salah, dan itu akan ketahuan di sini.
5. **Rincian biaya harus tampil di tiga tempat** (bagian 7 butir 2), dan
   `test:lacak` harus terus mengunci agar rincian itu tidak bocor ke halaman
   pembeli.
6. **Modal kalkulator biaya di modul produk** (keputusan pemilik produk,
   bagian 7 butir 3). Isinya:
   - Pecahan biaya yang sebenarnya memotong uang pengrajin: hanya
     `feeMasuk` Rp 4.440 per transaksi. Angka Rp 5.000 ditampilkan sebagai
     "ditanggung platform", karena menyembunyikannya akan membuat
     pengrajin salah menghitung.
   - Hitung mundur dari margin yang diinginkan: "saya ingin dapat
     Rp X → harga jual minimum Y", memakai rumus yang sama dengan yang dipakai
     server.
   - Angka dihitung dari `FEE_MASUK` yang diimpor, bukan diketik ulang di
     komponen — kalau berbeda, modal akan menampilkan angka yang tidak
     sama dengan yang benar-benar dipotong.
   - Angka yang sama harus dipakai di server saat menulis pesanan. Modal
     hanya untuk membantu pengrajin memilih harga, bukan sumber kebenaran.
7. **`enabled_payments` hanya VA yang disetujui.** Diimplementasikan di
   `src/lib/midtrans/snap.ts`: `bca_va`, `bni_va`, `bri_va`, `bsi_va`,
   `danamon_va`, `permata_va`. Tanpa `bank_transfer` catch-all, tanpa
   `cimb_va`, tanpa `seabank`, dan tanpa kanal persen apa pun. Daftar ini
   dikunci `test:checkout` — kalau kanal yang tidak dimaksud bisa dipakai
   lagi, seluruh hitungan fee di dokumen ini tidak berlaku karena tarifnya
   berbeda per kanal.

## 11. API Payouts (dulu IRIS) — hasil pembacaan dokumentasi

Dicek 2026-09-27 dari dokumentasi Midtrans (`docs.midtrans.com/docs/
disbursement-overview`) dan Antarmuka Pustaka `MidtransIrisApi` resmi.
Dokumentasi lengkap ada di `iris-docs.midtrans.com`.

**Autentikasi berbeda dari Core API.** Payouts tidak memakai Server Key,
melainkan sepasang header:

| Header | Isi |
|---|---|
| `iris-credential` | API key Payouts (`MIDTRANS_IRIS_API_KEY` di `.env`) |
| `iris-idempotency-key` | Kunci unik PER PERMINTAAN |

`iris-idempotency-key` itu wajib dipahami sebelum menulis engine payout:
kalau tidak dikirim, atau dikirim ulang dengan nilai yang sama, permintaan itu
dianggap sebagai **retry** yang sah — bukan permintaan baru. Ini persis yang
membuat payout ganda mustahil secara struktural, bukan hanya karena kita
menjaga idempotensi sendiri.

### Endpoint yang tersedia

| Endpoint | Fungsi | Relevansi untuk FurniTech |
|---|---|---|
| `GET /beneficiary_banks` | Daftar bank yang didukung | Mengisi dropdown bank di formulir rekening |
| `POST /account_validation` | Validasi rekening; kalau valid mengembalikan informasi pemilik rekening | **Verifikasi rekening pengrajin saat pendaftaran** (§12) |
| `POST /beneficiaries` | Simpan rekening tujuan sebagai *beneficiary* | Satu pengrajin = satu beneficiary, dipakai ulang setiap payout |
| `POST /payouts` | Membuat payout — **bisa tunggal maupun banyak** dalam satu permintaan | Payout per konfirmasi (§13) |
| `POST /payouts/approve` | Approver menyetujui payout | Kontrol dua orang (§14) |
| `POST /payouts/reject` | Approver menolak | Sama |
| `GET /payouts/{reference_no}` | Detail satu payout | Polling status setelah dikirim |
| `GET /balance` | Saldo Payouts | Rekonsiliasi saldo escrow vs saldo Payouts |
| `GET /statements` | Riwayat transaksi satu bulan | Rekonsiliasi bulanan |
| `GET /channels` | Kanal top-up (khusus aggregator) | Cara mengisi saldo Payouts |
| `GET /ping` | PING — health check | Memastikan Payouts hanya dikonfigurasi di produksi |

**Temuan yang mengubah desain pencairan:** `POST /payouts` secara resmi
menerima banyak payout dalam satu permintaan. Jadi "satu pencairan per
konfirmasi" **tetap bisa dikirim dalam satu panggilan** kalau beberapa
konfirmasi masuk pada waktu yang berdekatan. Yang mem_rbebankan fee adalah
jumlah **perymngan**, bukan jumlah panggilan — dan kalau fee-nya per-penerima,
menggabungkan payout dalam satu panggilan mengurangi total fee.

Skema: **aggregator** (sumber dana dari saldo Midtrans, diisi lewat
`GET /channels` → top-up) atau **facilitator** (rekening bank sendiri).

### Yang BELUM bisa diverifikasi

Semua di atas berasal dari dokumentasi, **tidak** dari panggilan sungguhan —
`MIDTRANS_IRIS_API_KEY` masih kosong, dan endpoint `/ping` yang paling
sederhana pun belum dicoba. Jadi bentuk respons persisnya belum diketahui.
Implementasi harus defensif: membaca field yang mungkin tidak ada, bukan
mengambil `body.data.account_name` tanpa checking.

## 12. Verifikasi rekening pengrajin (keputusan pemilik produk)

Rekening pengrajin diverifikasi saat pendaftaran memakai
`POST /account_validation` dari Payouts, bukan layanan pihak ketiga.

Alasannya teknis, bukan semata karena Midtrans kebetulan menyediakan
layanan ini:

1. **Rekening itu akan ditampilkan ke pembeli.** Pada COD transfer bank,
   FurniTech menampilkan nomor rekening dan atas nama pengrajin kepada
   pelanggan. Kalau rekeningnya salah atau sudah tidak aktif, pelanggan
   salah transfer — dan yang menanggung adalah pengrajin, yang akan
   menyalahkan FurniTech karena FurniTech yang menampilkannya.
2. **Payout memakai rekening itu.** Nomor yang sama yang divalidasi akan
   dipakai untuk menarik dana. Rekening yang gagal ditolak bank tidak akan
   ketahuan sampai hari pencairan.
3. **Satu panggilan, satu sumber kebenaran.** Kalau validasi memakai layanan lain,
   ada dua sumber yang bisa berbeda pendapat tentang rekening yang sama.

Aturan yang harus berlaku:

- Rekening **wajib terverifikasi** sebelum produk bisa ditayangkan di
  storefront, dan sebelum COD transfer bank bisa dipilih.
- Nama pemilik rekening yang dikembalikan Midtrans **disimpan terpisah**
  dari nama yang diketik pengrajin. Kalau berbeda, pengrajin melihat
  perbedaan itu dan memutuskan — membiarkan sistem memakai salah satu secara
  diam-diam berarti FurniTech memutuskan atas nama orang.
- Pendaftaran **tidak berhenti** kalau validasi gagal atau Midtrans sedang
 _down_. Alasannya sama seperti wizard pembayaran: menolak pendaftaran
  menyisakan akun yang emailnya sudah terpakai dan tidak bisa diulang.
  Tenant tetap dibuat, dengan status "rekening belum terverifikasi" dan penjelasan yang bisa dibaca.

## 13. Alur pencairan (keputusan pemilik produk, 2026-09-27)

Jadwal 06.00/18.00 WIB **diganti** oleh bukti pengiriman yang diunggah kurir.

```
1. Kurir (akun khusus, akses sangat terbatas) membuka daftar pengiriman
2. Di HP pelanggan: foto barang diterima + pelanggan menandatangani di layar
3. Kurir mengunggah foto, dan gambar tanda tangan pelanggan
4. Otomatis: sistem memanggil Payouts untuk rekening pengrajin
```

**Tidak ada langkah yang menunggu pembeli.** Ini yang menghapus risiko uang
mengunci permanen: uang hanya keluar kalau ada bukti yang diunggah kurir, jadi
kalau bukti tidak pernah diunggah, tidak ada uang yang tertahan — cuma pesanan
yang belum diselesaikan, dan itu urusan pengrajin dengan pembelinya sendiri.

Fee pencairan Rp 5.550 **per penerima** (sudah dikonfirmasi pemilik produk),
ditanggung pengrajin, dipotong dari saldonya saat payout:

```
saldo pengrajin += totalAmount − fee platform (0) − fee masuk (Rp4.440)
saat payout     : saldo ditransfer = saldo − Rp5.550
```

Tidak ada ambang minimum pencairan. Keputusan itu konsisten dengan model
"FurniTech mengambil fee dari pengrajin": pengrajin bebas menambah fee itu ke
harga produknya lewat kalkulator di form produk, jadi dia yang menanggung
biayanya sendiri, bukan buyer.

## 14. Kontrol dua orang (disarankan, belum diputuskan)

Payouts punya peran **Maker/Creator** dan **Approver** yang terpisah —
`POST /payouts` oleh maker, `POST /payouts/approve` oleh approver.
Halaman produk
Payouts menyebutnya sebagai pengaman terhadap kecurangan internal.

Untuk platform yang mengirim uang, ini bukan opsional.
Yang perlu diputuskan:
apakah payout yang sudah di-trigger bukti pengiriman **langsung dikirim**,
atau menunggu persetujuan owner di dashboard pengrajin dulu.

Trade-offnya nyata: menunggu persetujuan menambah satu ketukan dan menahan
uang pengrajin selama beberapa menit; langsung mengirim lebih cepat tapi owner
tidak pernah tahu uangnya keluar.

Usulan saya: **kirim langsung setelah bukti masuk** untuk tahap sekarang
dengan volume kecil, dan kontrol dua orang diaktifkan kalau nanti sudah ada
banyak pengrajin. Ini belum jadi keputusan, dan tidak akan saya
implementasikan sebelum ada jawaban.
