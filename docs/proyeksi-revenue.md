# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 10](#10-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **margin bersihnya naik dari Rp 5,5 juta per bulan
di 2026 menjadi Rp 280,7 juta per bulan di 2030, total Rp 6,64 miliar dalam
4,2 tahun (95,84% dari omzet)** — karena tidak ada gaji di P&L, admin
dikerjakan berdua, dan PPh cukup 0,5% dari omzet lewat Rezim A Perseroan
Perorangan. Kebutuhan modal hanya Rp 5 juta, di bulan pertama. Yang tidak
terlihat di angka ini: 106 orang harus mendaftar dalam 3 bulan pertama, dan
2 orang tidak mungkin menangani 1.000 pelanggan — keduanya tidak akan muncul
sebagai rupiah di mana pun.

---

## 1. Target pengrajin per tahun

Dua titik sudah ditetapkan: **akhir 2026 = 100 pengrajin aktif** (rilis
Okt 2026, jadi hanya satu kuartal), dan **akhir 2030 = 1.000 pelanggan**.
Tahun 2027 sampai 2029 dihitung dengan interpolasi geometris di antara
keduanya, yaitu `(1000/100)^(1/4) = 1,7783` per tahap.

| Akhir tahun | Pengrajin aktif | Pertumbuhan | Rekrut per bulan | Rekrut per tahun |
|---|---|---|---|---|
| 2026 (Okt–Des) | 100 | dari nol | 35,4 | 106 |
| 2027 | 178 | ×1,78 | 11,0 | 132 |
| 2028 | 316 | ×1,78 | 19,4 | 233 |
| 2029 | 562 | ×1,78 | 34,6 | 415 |
| 2030 | 1.000 | ×1,78 | 61,6 | 740 |

Angka "rekrut per bulan" adalah angka kerja, bukan target. Karena churn 3% per
bulan, FurniTech harus merekrut lebih banyak daripada jumlah pelanggan baru
agar stok akhir tahun benar.

**Catatan penting soal 2026: 106 orang harus mendaftar dalam 3 bulan,
dari nol, tanpa reputasi dan tanpa pelanggan lama.** Itu 35,4 pelanggan baru
per bulan, dan di bulan pertama 34 orang harus mendaftar sebelum produk
menghasilkan satu rupiah pun. Ini target yang sangat agresif untuk produk yang
belum pernah dipakai siapa pun — bukan mustahil, tapi tidak ada tempat
bernaung untuk keajaiban.

### Total pengrajin selama periode

| Keterangan | Jumlah |
|---|---|
| Pernah berlangganan (kumulatif) | **1.626** |
| Berhenti berlangganan (churned) | 626 |
| Aktif pada akhir 2030 | 1.000 |

Lonjakan churn berasal dari 2026: 106 orang mendaftar dalam satu kuartal, dan
sebagian besar akan berhenti sebelum 2027. Itu konsekuensi langsung
dari target 100 dalam satu kuartal, bukan cacat perhitungan. Kalau target awal
turun, churn turun juga — tapi angka ini sengaja dibiarkan apa adanya supaya
efeknya terlihat.

## 2. Pendapatan

### Dasar perhitungan

Harga paket diambil apa adanya dari `src/lib/plans.ts`:

| Paket | Bulanan | Tahunan | Porsi pelanggan |
|---|---|---|---|
| Basic | Rp 300.000 | Rp 3.420.000 | 60% |
| Pro | Rp 500.000 | Rp 5.700.000 | 30% |
| Max | Rp 1.000.000 | Rp 11.400.000 | 10% |

- **ARPU bruto = Rp 430.000 per pelanggan per bulan** — hasil hitung
  `0,6 × 300.000 + 0,3 × 500.000 + 0,1 × 1.000.000`.
- Pelanggan tahunan membayar `ARPU × 0,95` (diskon 5%). Diasumsikan 30%
  pelanggan memilih paket tahunan.
- **Fee Midtrans Rp 4.440 per invoice ditanggung FurniTech** (`PRD.md`:
  `feeLangganan = Rp4.440 per invoice → FurniTech`). Ini dipotong dari
  pendapatan, jadi kolom "pendapatan bersih" di bawah sudah bebas fee tersebut.
- Harga dinaikkan 5% per tahun (inflasi) mulai 2027.

### Proyeksi

| Tahun | MRR akhir tahun | Pendapatan kotor | Fee Midtrans | **Pendapatan bersih** |
|---|---|---|---|---|
| 2026 | Rp 4.300.000 | Rp 3.071.112 | Rp 31.711 | **Rp 3.039.401** |
| 2027 | Rp 45.150.000 | Rp 205.959.013 | Rp 2.026.044 | **Rp 203.932.969** |
| 2028 | Rp 101.926.125 | Rp 635.452.007 | Rp 5.958.054 | **Rp 629.493.953** |
| 2029 | Rp 230.969.340 | Rp 1.438.107.528 | Rp 12.841.699 | **Rp 1.425.265.829** |
| 2030 | Rp 522.667.687 | Rp 3.255.865.743 | Rp 27.689.096 | **Rp 3.228.176.648** |
| **Total** | | **Rp 5.538.455.404** | **Rp 48.546.603** | **Rp 5.489.908.800** |

Fee Midtrans total Rp 48,5 juta, yaitu 0,88% dari pendapatan. Tidak material.

---

## 3. Beban biaya

### 3a. Infrastruktur

Harga diambil dari halaman pricing resmi.

| Item | Harga | Keterangan |
|---|---|---|
| **Supabase Pro** | $25/bln | 8 GB disk, 100 GB storage, 250 GB egress, 100.000 MAU. Cukup sampai 1.000 pengrajin. |
| **Supabase PITR** | $100/bln | Dipakai mulai 2029. Point-in-time recovery 7 hari. |
| **Vercel Pro** | $20/bln | 1 developer seat, 100 GB transfer, $20 kredit usage. |
| **Vercel CPU overflow** | $0,128/jam | Di atas 4 jam Fluid CPU gratis per bulan, dikurangi kredit $20. |
| **Email (Resend)** | gratis → $20/bln | Gratis sampai 3.000 email per bulan. |
| **Monitoring (Sentry)** | gratis → $26/bln | Gratis sampai 5.000 error. |
| **Domain .com** | ±$10,44/tahun | Cloudflare Registrar menjual **harga cost** — tanpa markup, tanpa biaya tersembunyi. |
| **DNS / CDN / SSL** | $0 | Cloudflare gratis selamanya. |

Rincian per tahun (kurs asumsi **Rp 16.000/USD**):

| Tahun | Infrastruktur/bln | Infrastruktur/tahun |
|---|---|---|
| 2026 (3 bln) | $45 | Rp 2.160.000 |
| 2027 | $45 | Rp 8.640.000 |
| 2028 | $86 | Rp 16.574.976 |
| 2029 | $254 | Rp 48.708.096 |
| 2030 | $362 | Rp 69.597.696 |
| **Total (4,2 th)** | | **Rp 145.680.768** |

Kenaikan kurs 10% menambah total infrastruktur sekitar Rp 14,6 juta dalam
4,2 tahun. Tidak material.

### 3b. Fonnte — tidak dipakai di arsitektur sekarang

Ini perlu dijelaskan karena biaya ini mudah diasumsikan payable.

`PRD.md` v1.3 menetapkan: **tidak ada gateway WhatsApp pihak ketiga**. Foto
progres dikirim manual oleh tukang lewat tautan `wa.me` yang dibangun di
`src/lib/wa-link.ts`. Alasan teknis, bukanributors: gateway bisa mengirim teks
dan satu tautan, tetapi tidak bisa melampirkan foto — sementara nilai utama
FurniTech justru foto progres.

| Skenario | Biaya |
|---|---|
| **Arsitektur sekarang (tautan `wa.me`)** | **Rp 0** |
| Jika Fonnte diperkenalkan kembali | Rp 0 → Rp 165.000/bln (2028) → Rp 255.000/bln (2029–2030) |

Kalau Fonnte ditambahkan, total biayanya **Rp 8,1 juta dalam 4,2 tahun** —
di bawah 0,2% dari pendapatan, jadi tidak mengubah kelayakan bisnis. Yang
berubah adalah risiko: Fonnte adalah gateway WhatsApp **tidak resmi** yang
memakai nomor telepon terhubung. Nomor itu bisa diblokir atau melanggar
kebijakan layanan, dan notifikasi pesanan ikut mati. Itu alasan sebenarnya
keputusan v1.3 diambil.

### 3c. Legal dan administrasi

Semua dikerjakan berdua oleh owner dan komisaris, sehingga tidak ada biaya
akuntansi outsourced, tidak ada staff admin, dan tidak ada konsultan pajak
berjadwal. Yang tersisa hanya biaya yang **tidak bisa dikerjakan sendiri**:

| Item | Biaya | Kenapa tidak bisa dikerjakan sendiri |
|---|---|---|
| Pendirian PT (notaris, akta, pengacara) | Rp 6.500.000 (2026) | Wajib lewat notaris |
| Laporan tahunan ke Kementerian Hukum | Rp 3.500.000/tahun | Wajib dinotarisasi |
| Renewal domain .com | Rp 167.000/tahun | Diperpanjang lewat dashboard Cloudflare |
| NPWP, NIB, PKP | Rp 0 | Gratis lewat OSS |

| Tahun | Infrastruktur | Legal & admin | **Total biaya** |
|---|---|---|---|
| 2026 (3 bln) | Rp 2.160.000 | Rp 9.000.000 | **Rp 11.160.000** |
| 2027 | Rp 8.640.000 | Rp 3.500.000 | **Rp 12.140.000** |
| 2028 | Rp 16.574.976 | Rp 3.500.000 | **Rp 20.074.976** |
| 2029 | Rp 48.708.096 | Rp 4.500.000 | **Rp 53.208.096** |
| 2030 | Rp 69.597.696 | Rp 5.000.000 | **Rp 74.597.696** |
| **Total** | **Rp 145.680.768** | **Rp 25.500.000** | **Rp 171.180.768** |

Menghemat Rp 85.500.000 dibanding versi sebelumnya, karena pembukuan
outsourced (Rp 1 juta/bulan) dan konsultasi pajak hilang.

**"Tidak melibatkan orang lain" tidak bisa 100%.** Laporan tahunan wajib
dinotarisasi — itu melibatkan pihak ketiga setiap tahun, tidak bisa dikerjakan
berdua. Ini biaya legal, bukan biaya operasional.

### 3d. Gaji: nol di P&L, tapi bukan nol di kenyataan

Bagian ini sengaja ditulis eksplisit karena tabel margin di atas bisa salah
dibaca.

Tidak ada satu pun rupiah gaji yang masuk ke tabel di atas. Angka margin
Rp 5,32 miliar adalah **uang yang masuk ke perusahaan sebelum dibagikan
kepada kedua orang**. Karena pembagiannya 50:50, bagian Anda adalah
Rp 2,66 miliar dalam 4,2 tahun. Rinciannya ada di
[Bagian 4](#4-revenue-dan-margin-bersih-setiap-tahun).

Dua hal yang tidak hilang hanya karena tidak masuk P&L:

- **Komisaris bukan karyawan, jadi THR dan gaji 13 tidak berlaku.** Ini
  kebetulan yang menguntungkan struktur Anda: kalau orang kedua berstatus
  karyawan, dua bulan gaji per tahun wajib ada. Sebagai komisaris, dia
  menerima bagian profit, bukan gaji.
- **Tidak menggaji berarti menunda penghasilan, bukan menghemat.** Kalau Anda
  dan komisaris masing-masing mengambil Rp 30 juta per bulan, total
  Rp 60 juta per bulan keluar dari margin bersih tersebut — lebih besar
  daripada seluruh biaya legal dan infrastruktur 2030 (Rp 74,6 juta/tahun).
  Angka lengkapnya ada di [Bagian 4](#4-revenue-dan-margin-bersih-setiap-tahun).

## 4. Margin bersih setiap bulan

Tanpa biaya gaji sama sekali. PPh memakai **Rezim A: final 0,5% dari
peredaran bruto** (PP 20/2026 jo PP 55/2022). Perusahaan tetap PT Perorangan
yang sudah ada.

Rumus tiap bulan:

```
margin bersih = omzet
              - fee Midtrans (Rp 4.440 per invoice)
              - PPh final 0,5% x omzet
              - biaya (infrastruktur + legal/admin)
```

### Target yang diperbarui

| Akhir tahun | Pengrajin aktif | Pertumbuhan | Rekrut per bulan |
|---|---|---|---|
| **2026 (Okt–Des)** | **100** | dari nol | **35,4** |
| 2027 | 178 | ×1,78 | 11,0 |
| 2028 | 316 | ×1,78 | 19,4 |
| 2029 | 562 | ×1,78 | 34,6 |
| 2030 | 1.000 | ×1,78 | 61,6 |

Dua titik yang Anda kunci: akhir 2026 = 100, akhir 2030 = 1.000. Tahun 2027
sampai 2029 dihitung dengan **interpolasi geometris** di antara keduanya, yaitu
`(1000/100)^(1/4) = 1,7783` per tahap.

### Ringkasan per bulan

| Tahun | Bln | **Margin bersih/bln** | Pelanggan akhir tahun |
|---|---|---|---|
| 2026 | 3 | **Rp 5.459.543** | 100 |
| 2027 | 12 | **Rp 41.529.494** | 178 |
| 2028 | 12 | **Rp 80.573.033** | 316 |
| 2029 | 12 | **Rp 149.115.331** | 562 |
| 2030 | 12 | **Rp 280.733.049** | 1.000 |

Januari selalu terlihat paling tinggi di setiap tahun. Itu **bukan
seasonality** — itu tagihan paket tahunan yang menumpuk di awal tahun. Untuk
KPI bulanan, rata-rata di tabel ini lebih berguna.

### Total pengrajin selama periode

| Keterangan | Jumlah |
|---|---|
| Pernah berlangganan (kumulatif) | **1.626** |
| Berhenti berlangganan (churned) | 626 |
| Aktif pada akhir 2030 | 1.000 |

Dari 1.626 yang mendaftar, 626 berhenti sebelum 2030. Churn tertinggi terjadi
pada 2026–2027, ketika belum ada referensi dari pelanggan lama.

### Rincian 51 bulan

#### 2026

| Bulan | Aktif | Margin bersih |
|---|---|---|
| Okt | 34 | Rp -4.620.608 |
| Nov | 68 | Rp 5.561.363 |
| Des | 100 | Rp 15.437.875 |

#### 2027

| Bulan | Aktif | Margin bersih |
|---|---|---|
| Jan | 108 | Rp 41.279.711 |
| Feb | 115 | Rp 30.989.276 |
| Mar | 122 | Rp 33.297.658 |
| Apr | 129 | Rp 35.536.789 |
| Mei | 136 | Rp 37.708.746 |
| Jun | 143 | Rp 39.815.544 |
| Jul | 149 | Rp 41.859.139 |
| Agu | 155 | Rp 43.841.425 |
| Sep | 161 | Rp 45.764.243 |
| Okt | 167 | Rp 47.629.376 |
| Nov | 173 | Rp 49.438.556 |
| Des | 178 | Rp 51.193.460 |

#### 2028

| Bulan | Aktif | Margin bersih |
|---|---|---|
| Jan | 192 | Rp 80.240.737 |
| Feb | 205 | Rp 60.971.250 |
| Mar | 217 | Rp 65.261.552 |
| Apr | 230 | Rp 69.423.146 |
| Mei | 242 | Rp 73.459.891 |
| Jun | 253 | Rp 77.375.535 |
| Jul | 265 | Rp 81.173.709 |
| Agu | 275 | Rp 84.857.937 |
| Sep | 286 | Rp 88.431.639 |
| Okt | 296 | Rp 91.898.130 |
| Nov | 306 | Rp 95.260.626 |
| Des | 316 | Rp 98.522.247 |

#### 2029

| Bulan | Aktif | Margin bersih |
|---|---|---|
| Jan | 340 | Rp 148.326.873 |
| Feb | 363 | Rp 112.424.414 |
| Mar | 386 | Rp 120.458.375 |
| Apr | 408 | Rp 128.251.317 |
| Mei | 430 | Rp 135.810.470 |
| Jun | 450 | Rp 143.142.849 |
| Jul | 470 | Rp 150.255.257 |
| Agu | 490 | Rp 157.154.292 |
| Sep | 509 | Rp 163.846.357 |
| Okt | 527 | Rp 170.337.659 |
| Nov | 545 | Rp 176.634.223 |
| Des | 562 | Rp 182.741.889 |

#### 2030

| Bulan | Aktif | Margin bersih |
|---|---|---|
| Jan | 605 | Rp 279.174.731 |
| Feb | 647 | Rp 212.116.990 |
| Mar | 687 | Rp 227.143.047 |
| Apr | 726 | Rp 241.718.323 |
| Mei | 764 | Rp 255.856.340 |
| Jun | 801 | Rp 269.570.217 |
| Jul | 837 | Rp 282.872.677 |
| Agu | 871 | Rp 295.776.063 |
| Sep | 905 | Rp 308.292.348 |
| Okt | 938 | Rp 320.433.145 |
| Nov | 969 | Rp 332.209.717 |
| Des | 1000 | Rp 343.632.992 |

### Total 4,2 tahun

| Komponen | Jumlah |
|---|---|
| Omzet bruto | Rp 6.927.860.232 |
| Fee Midtrans | −Rp 61.368.715 |
| PPh final 0,5% | −Rp 34.639.301 |
| Biaya infrastruktur + legal/admin | −Rp 192.062.700 |
| **Margin bersih** | **Rp 6.639.789.516 (95,84% dari omzet)** |

Rata-rata 51 bulan: **Rp 130.191.951 per bulan**.

### Titik kas terendah

Kas terendah hanya **Rp −4.620.608**, di Oktober 2026 — bulan pertama. Setelah
itu margin positif dan langsung menutup seluruh kekurangan. Kebutuhan modal
tidak berubah: **sekitar Rp 5 juta** untuk menyalin 3 bulan pertama.

### Kapan cukup untuk gaji

| Margin/bln | Pelanggan aktif | Setara gaji per orang (bila 50:50) |
|---|---|---|
| Rp 5.459.543 (rata-rata 2026) | 100 | Rp 2.729.771 |
| Rp 41.529.494 (rata-rata 2027) | 178 | Rp 20.764.747 |
| Rp 80.573.033 (rata-rata 2028) | 316 | Rp 40.286.516 |
| Rp 149.115.331 (rata-rata 2029) | 562 | Rp 74.557.665 |
| Rp 280.733.049 (rata-rata 2030) | 1.000 | Rp 140.366.524 |

**2026 tidak bisa menanggung gaji apa pun.** Mulai 2027 margin rata-rata Rp 41,5 juta per bulan, jadi gaji
Rp 20 juta per orang sudah tertutup.

### Kebutuhan modal per skenario

Tanpa beban gaji, kesimpulan berubah total. Versi dokumen sebelumnya
mengclaiming bahwa "semakin lambat tumbuh, semakin besar modal yang dibutuhkan"
— itu **artefak dari asumsi gaji yang tidak relevan dengan model ini**, dan
sekarang tidak berlaku. Ketiga skenario profitable:

| Skenario | Aktif akhir 2030 | Revenue 5 th | Biaya 5 th | Margin 5 th | Margin % | 50% Anda |
|---|---|---|---|---|---|---|
| Konservatif 5-50-150-300-500 | 500 | Rp 3.222.020.550 | Rp 171.180.768 | Rp 3.050.839.782 | 94,7% | Rp 1.525.419.891 |
| **Dasar 10-100-215-464-1.000** | **1.000** | **Rp 5.489.908.800** | **Rp 171.180.768** | **Rp 5.318.728.032** | **96,9%** | **Rp 2.659.364.016** |
| Optimis 20-150-400-700-1.500 | 1.500 | Rp 8.588.734.667 | Rp 171.180.768 | Rp 8.417.553.899 | 98,0% | Rp 4.208.776.949 |

Rentang bagian Anda Rp 1,53 miliar sampai Rp 4,21 miliar. Bahkan skenario
konservatif sudah sangat untung — yang membuat model ini tahan terhadap
kesalahan optimism.

### Unit economics

| Tahun | ARPU | Infrastruktur per pelanggan per bulan | Margin infrastruktur |
|---|---|---|---|
| 2026 | Rp 430.000 | Rp 2.240 | 92,2% |
| 2027 | Rp 451.500 | Rp 7.200 | 98,3% |
| 2028 | Rp 474.075 | Rp 5.293 | 98,9% |
| 2029 | Rp 497.779 | Rp 8.748 | 97,0% |
| 2030 | Rp 522.668 | Rp 5.800 | 98,9% |

Biaya infrastruktur per pelanggan turun seiring skala. Karena tidak ada payroll
dan tidak ada akuntansi outsourced, **hampir seluruh revenue menjadi margin**:
95,84% dalam 4,2 tahun. Yang tersisa hanya fee Midtrans (0,89%), PPh Rezim A
(0,50%), dan biaya operasional (2,77%).

## 5. Yang tidak ada di dokumen ini

Sengaja dikecualikan, dan sebaiknya tetap dikecualikan:

- **Pajak.** Sudah dihitung di [Bagian 9](#9-pajak-pph) dalam dua rezim.
  Yang belum: PPh Pasal 21 atas gaji sendiri, PPh Pasal 23 rekening bank,
  pajak pengalihan status perseroan, dan dampak PPN ke harga.
- **Biaya akuisisi (CAC).** Tidak ada anggaran iklan, semuanya diasumsikan
  organic atau referral. Ini asumsi yang paling berat: 1.626 orang mendaftar
  tanpa satu rupiah pun untuk iklan. Dengan margin 2026 hanya Rp 16 juta, satu
  kali biaya akuisisi Rp 50 juta sudah menghapus laba tahun pertama.
- **Biaya refund, sengketa, dan klaim.** Keputusan produk: tidak ada refund.
  Kalau berubah, lihat risiko di [Bagian 6](#6-risiko-yang-tidak-terlihat-di-angka).
- **Pajak global** untuk 1.000 pengrajin di luar Indonesia.
- **Valuasi perusahaan.** Ini proyeksi arus kas, bukan penilaian.

---

## 6. Risiko yang tidak terlihat di angka

Diurutkan dari yang paling merusak.

### 1. Pengrajin kehilangan haknya, FurniTech tidak bisa mengirim

Ini bukan proyeksi, ini kondisi sekarang. Virtual account Midtrans sudah
berfungsi dan uang pembeli **sudah masuk** ke rekening platform. Tetapi
`MIDTRANS_IRIS_API_KEY` masih kosong, jadi `POST /payouts`
(`src/lib/midtrans/payouts.ts`) belum pernah dipanggil. Mesin payout
(`src/lib/payouts.ts`) sudah lengkap dan teruji, tetapi tidak bisa berjalan
tanpa kredensial.

Artinya: **FurniTech memegang uang pengrajin tanpa jalur untuk
mengembalikannya.** Pada skala 1.000 pengrajin, ini bukan kekurangan teknis,
ini paparan legal dan reputasi. Seluruh proyeksi revenue di dokumen ini
bergantung pada asumsi bahwa pencairan akan berfungsi. Selesaikan sebelum,
bukan sesudah, mengejar 1.000 pelanggan.

Ada ironi tambahan: COD dikunci sampai rekening pengrajin berstatus
`verified`, dan verifikasi hanya bisa lewat Payouts API — jadi keputusan
"COD lebih dulu" justru terblokir kredensial yang belum ada.

### 2. 100 pengrajin dalam 3 bulan adalah bagian paling rapuh dari proyeksi

Target ini jauh lebih agresif dari versi sebelumnya. Yang dipertanyakan bukan
"bisakah 100 pengrajin tercapai" — itu tidak mustahil — tapi **dari mana
35,4 pelanggan baru per bulan datang, bulan pertama, tanpa satu pun pelanggan
sebelumnya dan tanpa reputasi**.

Yang tidak terlihat di tabel margin:

- 100 pelanggan di 2026 berarti 100 orang yang harus **dibantu** satu per satu
  oleh 2 orang, sebelum ada yang bisa merekomendasikan ke orang lain.
- Bulannya tidak merata. Hampir seluruh omzet 2026 terjadi pada November dan
  Desember, karena tagihan hanya masuk setelah pelanggan membayar.
- Churn 3% per bulan diasumsikan berlaku sejak hari pertama. Untuk produk yang
  belum pernah dipakai, churn bulan pertama biasanya jauh lebih tinggi. Kalau
  churn bulan pertama 15% dan seterusnya 3%, rekrutan 2026 naik dari 106
  menjadi sekitar 190 — dan biaya untuk mendapatkannya tidak ada di P&L
  karena tidak ada anggaran untuk itu.

Kalau target awal ini tidak tercapai, yang runtuh bukan cuma 2026: seluruh
kurva 2027–2030 bergantung pada pelanggan yang seharusnya sudah ada di akhir
2026. Kurva geometris menghitung orang yang belum ada.

### 3. Harga belum pernah diuji terhadap willingness to pay

Rp 300.000 per bulan adalah tebakan. Belum ada satu pun pelanggan yang
membayar sepenuhnya. Kampanye yang berhasil memberi umumnya terlihat sangat
berbeda di kurva retensi.

### 4. 77% pendapatan datang dari 2029–2030

Rp 5,36 miliar dari Rp 6,93 miliar terjadi pada dua tahun terakhir. Proyeksi
sangat sensitif terhadap apa pun yang menggagalkan 2029–2030. Sebaliknya,
2026–2028 hanya menghasilkan Rp 1,57 miliar pendapatan kumulatif, sementara
biaya legal tiga tahun pertama saja menghabiskan Rp 43 juta dari margin itu.

### 5. Dua orang mungkin tidak cukup di 1.000 pelanggan

Ini risiko operasional yang sama sekali tidak terlihat di P&L. Dengan 2 orang
dan 1.000 pelanggan, setiap orang menangani 500 pelanggan. Yang otomatis
datang per pelanggan: onboarding, pertanyaan tagihan, masalah pengiriman,
permintaan bantuan ekspor, dan pengaduan. Aplikasi sekarang tidak punya
onboarding otomatis maupun self-service, jadi semuanya masuk ke 2 orang.

Beban waktu nyata ini tidak muncul sebagai rupiah di mana pun. Kalau
1.000 pelanggan menulis satu pesan sebulan dan setiap pesan butuh 15 menit,
itu **250 jam per bulan** — lebih dari yang bisa dicatat dua orang. Karena
biaya waktu tidak masuk P&L, beban ini **tidak terlihat sama sekali** di
margin 96,9% yang tampak sangat sehat. Ini kelemahan model ini yang paling
menyembunyikan: angka marginnya bagus, tapi tidak ada yang mengukur jam
yang terpakai.

---

## 7. Sensitivitas

### Churn — berdampak ke rekrut, hampir tidak ke margin

| Churn per bulan | Rekrut total | Churned | Aktif akhir 2030 |
|---|---|---|---|
| 2% | 1.330 | 330 | 1.000 |
| **3% (dasar)** | **1.504** | **504** | **1.000** |
| 5% | 1.870 | 870 | 1.000 |
| 8% | 2.469 | 1.469 | 1.000 |

Margin hampir tidak bergerak (selisih antar churn di bawah 5%), karena target
akhir tahun dikunci sehingga revenue hampir sama. Churn menentukan berapa
banyak orang yang harus dicari untuk mengisi posisi yang kosong. Dengan 2
orang, itu berarti waktu penjualan yang lebih banyak — bukan margin yang
lebih kecil.

### ARPU — kalau bauran paket atau harga bergerak

| ARPU | Pendapatan 5 tahun |
|---|---|
| Rp 301.000 (−30%) | Rp 3.842.936.160 |
| Rp 365.500 (−15%) | Rp 4.666.422.480 |
| **Rp 430.000 (dasar)** | **Rp 5.489.908.800** |
| Rp 494.500 (+15%) | Rp 6.313.395.120 |

### Target — kalau jumlah pengrajin meleset

Target baru mengubah kesimpulan. Kalau 2026 hanya mencapai 50, dan 2030 tetap
ditahan di 1.000, kurvanya harus mengejar lebih cepat di empat tahun
berikutnya:

| Skenario | Aktif akhir 2026 | Aktif akhir 2030 | Omzet 5 th | Margin 5 th |
|---|---|---|---|---|
| 2026 separuh, 2030 tercapai | 50 | 1.000 | Rp 5.735.598.330 | Rp 5.464.440.782 |
| **Dasar** | **100** | **1.000** | **Rp 6.927.860.232** | **Rp 6.639.789.516** |
| 2026 naik 50%, 2030 tercapai | 150 | 1.000 | Rp 7.866.475.190 | Rp 7.565.038.592 |
| 2026 tercapai, 2030 separuh | 100 | 500 | Rp 4.342.305.309 | Rp 4.089.714.709 |
| keduanya meleset | 50 | 500 | Rp 3.463.930.116 | Rp 3.223.863.408 |

Rentang margin Rp 3,22 miliar sampai Rp 7,57 miliar. **2030 menentukan
segala sesuatu:** skenario dengan 2030 = 1.000 selalu menang, apa pun yang
terjadi di 2026. Tahun 2026 hanya menyumbang Rp 30 juta dari Rp 6,93 miliar —
kurang dari 0,5%.

Artinya 2026 yang paling rapuh secara operasional justru paling tidak
berdampak secara finansial. Yang harus dijaga bukan 100 pelanggan pertama,
tapi kemampuan menjaga pertumbuhan menuju 1.000 pada 2030.

---

## 8. Rekomendasi

1. **Cek agregasi omzet ke konsultan pajak tahun ini.** Batas Rp 4,8 miliar
   menghitung gabungan seluruh Perseroan Perorangan Anda, bukan cuma
   FurniTech. Omzet FurniTech saja mencapai Rp 3,26 miliar pada 2030; ditambah
   PT Perorangan yang sudah ada, agregatnya menembus batas. Bedanya PPh
   Rp 16 juta dengan Rp 694 juta pada 2030 — **42 kali**. Ini satu-satunya
   hal di dokumen ini yang benar-benar menentukan hasil, dan hanya bisa
   dijawab dengan angka omzet asli Anda.
2. **Pahami ambang PPN, bukan hanya ambang PPh.** Angka Rp 4,8 miliar itu
   sekaligus ambang PKP. Melewatinya memaksa PPN 11% dari seluruh omzet —
   Rp 358 juta pada 2030, lebih besar dari PPh seluruhnya. Putuskan harga
   paket sebelum itu terjadi.
3. **Cek agregasi, dan siapkan diri untuk.status jadi PT biasa kalau perlu.**
   Bila agregat omzet menembus Rp 4,8 miliar, PT Perorangan wajib berstatus
   PT biasa — bukan hanya tarif pajak yang berubah, tapi juga akta notaris,
   RUPS tahunan, dan laporan tahunan. Rencanakan transisinya sekarang, jangan menunggu
   sampai sudah di ambang.
4. **Jaga margin FurniTech sendiri di bawah batas.** Proyeksi 2030
   Rp 3,26 miliar, yaitu 68% dari batas Rp 4,8 miliar. Masih aman, tapi
   kalau 2031–2032 sedikit meleset, FurniTech sendiri sudah menembus batas
   tanpa bantuan apa pun.
5. **Selesaikan jalur pencairan sebelum mengejar 2027.** VA sudah berfungsi
   dan uang pengrajin sudah masuk ke rekening platform, tetapi
   `MIDTRANS_IRIS_API_KEY` masih kosong sehingga belum ada jalan
   mengembalikannya. Ini prasyarat hukum, bukan prioritas teknis akhir.
6. **Siapkan proses dukungan sebelum 2029.** 1.000 pelanggan di tangan 2
   orang adalah 500 pelanggan per orang, tanpa onboarding otomatis. Beban ini
   tidak terlihat di P&L — hanya sebagai kelelahan.
7. **Gunakan angka bulanan, bukan tahunan, untuk keputusan.** Rata-rata
   2027 Rp 41,5 juta dan 2030 Rp 280,7 juta. Melihat total lima tahun
   membuat 2026–2027 terlihat kecil padahal di situlah target 100 dan
   seluruh kurva ditentukan.
8. **Dana yang dibutuhkan hanya sekitar Rp 5 juta**, di bulan pertama. Tidak
   perlu modal ventura. Tidak ada modal yang memaksa tumbuh cepat, jadi
   pertumbuhan harus datang dari prioritas, bukan tekanan pendanaan.
9. **Hitung ulang dokumen ini setiap kali asumsi berubah.** Seluruh asumsi
   terkumpul di [Bagian 10](#10-asumsi-yang-dapat-diubah).

---

## 9. Pajak (PPh)

### Dasar hukum

Status Anda: **Perseroan Perorangan**, pemilik tunggal, omzet tahun 2020
Rp 3,2 miliar, sehingga **belum PKP** (ambang PKP Rp 4,8 miliar per tahun).
Benar, tanpa PPN 11%.

Ada dua rezim PPh yang mungkin berlaku, dan yang mana ditentukan oleh satu
angka: **omzet agregat per tahun pajak**.

| | **Rezim A** | **Rezim B** |
|---|---|---|
| Dasar hukum | PP 20/2026 jo PP 55/2022 | UU PPh, tarif badan 22% |
| Pemakai | WP Orang Pribadi dan **Perseroan Perorangan** | badan usaha pada umumnya |
| Syarat | omzet agregat **tidak melebihi Rp 4,8 miliar** per tahun | di atas itu, atau setelah wajib menjadi PT |
| Cara hitung | **0,5% dari omzet** | 22% dari laba kena pajak |
| PPN | tidak PKP, tidak PPN | **wajib PKP, PPN 11%** |

Perseroan Perorangan **berhak** memakai Rezim A. PP 20/2026 menghapus batas
waktu 4 tahun yang dulu ada, jadi tidak ada kedaluwarsa — selama omzetnya
tidak melewati Rp 4,8 miliar.

### Kata "agregat" itu penting

PP 20/2026 Pasal 57 ayat (1) huruf e: batas Rp 4,8 miliar menghitung
**gabungan** omzet Anda sebagai WP Orang Pribadi dengan **seluruh**
Perseroan Perorangan yang Anda dirikan.

Anda sudah punya PT Perorangan dengan omzet Rp 3,2 miliar pada 2020.
Proyeksi FurniTech mencapai Rp 3,26 miliar pada 2030. Bila keduanya
berjalan bersamaan:

| Tahun | FurniTech | PT Perorangan yang sudah ada | Agregat | Batas 4,8 M? |
|---|---|---|---|---|
| 2026 | Rp 3.071.112 | perlu data Anda | — | kemungkinan ya |
| 2027 | Rp 205.959.013 | perlu data Anda | — | kemungkinan ya |
| 2028 | Rp 635.452.007 | perlu data Anda | — | kemungkinan ya |
| 2029 | Rp 1.438.107.528 | Rp 3,2 miliar (asumsi) | Rp 4,64 miliar | masih ya, tipis |
| 2030 | Rp 3.255.865.743 | Rp 3,2 miliar (asumsi) | Rp 6,46 miliar | **LEWAT** |

Baris 2029 dan 2030 memakai asumsi usaha lama Anda tetap Rp 3,2 miliar.
Kalau sudah berhenti atau turun, agregatnya lebih rendah dan Rezim A bisa
bertahan lebih lama. **Ini perlu dicek ke konsultan pajak dengan angka omzet
sebenarnya** — bukan dengan asumsi saya.

### Hitungan Rezim A — 0,5% dari omzet

| Tahun | Omzet | **PPh final 0,5%** |
|---|---|---|
| 2026 | Rp 3.071.112 | Rp 15.356 |
| 2027 | Rp 205.959.013 | Rp 1.029.795 |
| 2028 | Rp 635.452.007 | Rp 3.177.260 |
| 2029 | Rp 1.438.107.528 | Rp 7.190.538 |
| 2030 | Rp 3.255.865.743 | Rp 16.279.329 |
| **Total 4,2 tahun** | **Rp 5.538.455.404** | **Rp 27.692.277** |

Angka ini sudah termasuk di [Bagian 4](#4-margin-bersih-setiap-bulan) sebagai
beban, jadi margin bersih di sana **sudah setelah PPh**.

Sekitar Rp 27,7 juta selama 4,2 tahun. Itulah nilai terbesar Rezim A: pada 2030, PPh Rezim A hanya Rp 16,3 juta, sedangkan PPh badan 22%
atas laba Rp 3,15 miliar adalah Rp 694 juta. **Selisihnya 42 kali.**

### Hitungan Rezim B — badan 22%, lalu dividen 10%

| Tahun | Laba (belum gaji) | PPh badan 22% | Bagian Anda 50% | PPh dividen 10% | **Anda net** |
|---|---|---|---|---|---|
| 2026 | -Rp 8.120.599 | Rp 0 | -Rp 4.060.299 | Rp 0 | -Rp 4.060.299 |
| 2027 | Rp 191.792.969 | Rp 42.194.453 | Rp 95.896.485 | Rp 9.589.648 | Rp 86.306.836 |
| 2028 | Rp 609.418.977 | Rp 134.072.175 | Rp 304.709.489 | Rp 30.470.949 | Rp 274.238.540 |
| 2029 | Rp 1.372.057.733 | Rp 301.852.701 | Rp 686.028.866 | Rp 68.602.887 | Rp 617.425.980 |
| 2030 | Rp 3.153.578.952 | Rp 693.787.369 | Rp 1.576.789.476 | Rp 157.678.948 | Rp 1.419.110.528 |
| **Total** | **Rp 5.318.728.032** | **Rp 1.171.906.699** | **Rp 2.659.364.016** | **Rp 265.936.402** | **Rp 2.393.427.615** |

Dividen yang diterima WP Orang Pribadi dalam negeri dikenai PPh final 10%
(PP 55/2022 Pasal 23 huruf m). Karena itu kolom "Anda net" adalah
**setelah** pajak.

### Catatan singkat soal cara uang keluar dari perusahaan

Dokumen ini tidak lagi memuat tabel gaji maupun pembagian 50:50 — itu
keputusan Anda, dan Anda akan menentukannya dari margin bulanan di
[Bagian 4](#4-margin-bersih-setiap-bulan). Yang perlu diketahui saja:

- Kalau uang keluar sebagai **dividen**, PPh final 10% kenakan bagian Anda
  (Rezim A sudah memotong pajak perusahaan, tapi dividen tetap acara
  sendiri). Kalau keluar sebagai **gaji direktur**, gaji itu biaya yang
  mengurangi laba — tapi di Rezim A PPh 0,5% sudah dihitung dari **omzet**,
  bukan dari laba, jadi pengurangan laba **tidak mengurangi pajak**.
- Jadi dalam Rezim A, **cara mengeluarkan uang tidak mengubah PPh
  perusahaan.** PPh tetap 0,5% dari omzet. Yang berubah hanya pajak pribadi
  Anda atas peng expedient yang dipilih.
- Catatan penting: PT Perorangan **tidak bisa** memiliki 2 pemegang saham dan
  **tidak punya posisi komisaris** (lihat bawah). Jadi pembagian 50:50 dengan
  teman hanya bisa lewat jalur remuneration, bukan kepemilikan saham.

### Tiga masalah struktural yang harus diputuskan sekarang

**1. PT Perorangan tidak bisa dipakai untuk pembagian 50:50.**

Perseroan Perorangan didirikan oleh **1 orang** dan punya **1 pemegang
saham (100%)**, yang merangkap direktur dan pemegang saham. Badan hukum ini
juga **tidak memerlukan komisaris** — posisinya memang tidak ada di sana.

Rencana "saya 50%, teman saya sebagai komisaris 50%" **tidak dapat
dilakukan pada PT Perorangan**. Kalau teman Anda menjadi pemegang saham
kedua, perseroan **wajib berubah status menjadi PT biasa** lewat akta
perubahan dan pendaftaran ke Kementerian Hukum.

Ini keputusan yang harus diambil sekarang, bukan tahun 2027 atau 2029,
karena menentukan cara pencatatan, perpajakan, dan tata kelola RUPS.

**2. Melewati Rp 4,8 miliar memaksa perubahan status.** Karena agregasi
omzet maupun karena ketentuan lain, PT Perorangan wajib menjadi PT biasa.
Konsekuensinya bukan cuma tarif pajak: PT biasa butuh akta notaris, RUPS
tahunan, laporan tahunan, dan pemeliharaan saham yang lebih formal.

**3. PPN 11% masih menunggu di depan.** Omzet Rp 4,8 miliar itu sekaligus
ambang PKP. Saat FurniTech atau agregatnya menyentuhnya, Anda **wajib
menjadi PKP** dan memungut PPN 11% dari seluruh omzet. Pada omzet 2030
sebesar Rp 3,26 miliar, itu **Rp 358 juta PPN per tahun** — lebih besar
dari PPh manapun di dokumen ini.

Perlu dikonfirmasi ke konsultan pajak: ada pengecualian untuk transaksi
tertentu, dan transaksi lewat payment gateway atau marketplace punya
aturan tersendiri. Konsekuensi praktisnya bukan cuma pajak, tapi apakah
harga paket Rp 300.000, Rp 500.000, dan Rp 1.000.000 masih bisa
dipertahankan setelah PPN masuk. Itu keputusan yang lebih besar daripada
besarnya PPh.

### Yang belum dihitung

- **PPh Pasal 21 atas gaji Anda sendiri.** Kalau gaji ini resmi sebagai
  gaji direktur, PPh Pasal 21 berlaku dan tarifnya bergantung pada skema
  peng-tutorial. Rp 5 juta per bulan berada di bawah PTKP bulanan
  Rp 4,8 juta, sehingga yang dikenakan pajaknya sangat kecil, tetapi
  angka pastinya perlu dihitung setelah skema pengajakannya ditentukan.
- **PPh Pasal 23 atas rekening bank** dan pajak kecil lain.
- **Pajak pengalihan PT Perorangan menjadi PT** (akta, notaris).
- **Dampak PPN ke harga dan daya beli** (lihat butir 3 di atas).

**Semua angka PPh di bagian ini dihitung dari tarif yang berlaku saat
dokumen ini ditulis dan wajib dikonfirmasi ke konsultan pajak sebelum
dipakai untuk keputusan.** Peraturan PPh UMKM sudah beberapa kali berubah
(PP 23/2018, PP 30/2020, PP 55/2022, PP 20/2026), dan perubahan berikutnya
tidak mustahil terjadi.

---

## 10. Asumsi yang dapat diubah

| Asumsi | Nilai | Sumber |
|---|---|---|
| Badan hukum | PT Perorangan yang sudah ada, tidak diubah | **keputusan Anda** |
| Jumlah pengoper | 2 orang | **keputusan Anda** |
| Gaji masuk P&L | tidak ada, tidak dihitung | **keputusan Anda** |
| Admin dikerjakan | berdua, tanpa outsourcing | **keputusan Anda** |
| HRESULT | Rp 430.000 per pelanggan per bulan | hitungan dari `src/lib/plans.ts` |
| Bauran paket | 60 / 30 / 10 | **asumsi Anda** |
| Porsi bayar tahunan | 30% | **asumsi saya** |
| Churn | 3% per bulan | **asumsi Anda** |
| Inflasi harga | 5% per tahun | **asumsi Anda** |
| Kurs USD | Rp 16.000 | **asumsi saya** |
| Interpolasi 2027–2029 | geometris ×1,7783 per tahun | hitungan |
| Legal dan admin | Rp 9 jt (2026) → 3,5–5 jt/tahun | **angka tebakan saya** |
| Jam CPU Vercel | 20 → 1.500 jam per bulan | **angka tebakan saya** |
| PITR Supabase | aktif mulai 2029 | keputusan saya |
| Fonnte | tidak dipakai | `PRD.md` v1.3 (fakta) |
| Biaya CAC | nol, diasumsikan organic | **asumsi saya** |
| Pajak (PPh) | **Rezim A, final 0,5% dari omzet** | **keputusan Anda, perlu konfirmasi konsultan** |
| Omzet PT Perorangan yang sudah ada | Rp 3,2 miliar (asumsi tetap) | **perlu data Anda** |
| Mekanisme gaji / pembagian | tidak dihitung, Anda yang menentukan | **keputusan Anda** |

Dua koreksi yang sudah masuk ke versi ini. Pertama, versi sebelumnya menghitung
beban gaji penuh dengan BPJS, THR, dan gaji 13 — asumsi yang tidak sesuai
model 2 orang ini. Kedua, versi sebelumnya menyimpulkan bahwa "semakin lambat
tumbuh, semakin besar modal yang dibutuhkan"; kesimpulan itu **artefak dari
asumsi gaji** dan tidak lagi berlaku setelah gaji dikeluarkan dari P&L.

Target pelanggan sendiri bukan asumsi: 100 akhir 2026 dan 1.000 akhir 2030
adalah keputusan Anda. Yang tidak diketahui adalah apakah kurva geometris di
tengahnya realistis, dan apakah 106 rekrutan dalam 3 bulan pertama bisa
dilakukan oleh 2 orang tanpa anggaran iklan.

