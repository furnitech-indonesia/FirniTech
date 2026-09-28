# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 10](#10-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **margin bersihnya naik dari −Rp 2,7 juta per bulan
di 2026 menjadi Rp 261,4 juta per bulan di 2030, total Rp 5,29 miliar dalam
4,2 tahun (95,53% dari omzet)** — karena tidak ada gaji di P&L, admin
dikerjakan berdua, dan PPh cukup 0,5% dari omzet lewat Rezim A Perseroan
Perorangan. Dana yang dibutuhkan hanya Rp 8,1 juta. Yang tidak terlihat di
angka ini: 2 orang tidak mungkin menangani 1.000 pelanggan, dan itu tidak
akan muncul sebagai rupiah di mana pun.

---

## 1. Target pengrajin per tahun

Titik awal dan akhir sudah ditetapkan: akhir 2026 = 10 pengrajin, akhir 2027 =
100, akhir 2030 = 1.000. Tahun 2028 dan 2029 tidak ditetapkan, jadi dihitung
dengan **interpolasi geometris** — rasio pertumbuhan per tahun konstan di antara
dua titik yang sudah dikunci, yaitu `(1000/100)^(1/3) = 2,1544`.

| Akhir tahun | Pengrajin aktif | Pertumbuhan | Rekrut per bulan |
|---|---|---|---|
| 2026 (Okt–Des) | 10 | — | 3,5 |
| 2027 | 100 | ×10,0 | 9,4 |
| 2028 | 215 | ×2,15 | 14,7 |
| 2029 | 464 | ×2,16 | 31,8 |
| 2030 | 1.000 | ×2,15 | 68,5 |

Angka "rekrut per bulan" adalah angka kerja, bukan angka target. Karena ada
churn 3% per bulan, FurniTech harus merekrut lebih banyak daripada jumlah
pelanggan baru agar stok akhir tahun benar. Di 2030: 68,5 rekrut per bulan
**+** sekitar 30 pelanggan hilang per bulan = **sekitar 100 titik kontak
penjualan per bulan**. Angka itu yang harus jadi target tim penjualan, bukan
"1.000 pelanggan".

### Total pengrajin selama periode

| Keterangan | Jumlah |
|---|---|
| Pernah berlangganan (kumulatif pendaftaran) | **1.504** |
| Berhenti berlangganan (churned) | 505 |
| Aktif pada akhir 2030 | 1.000 |

Jawaban langsung untuk "total ada berapa pengrajin": **1.504 orang pernah
berlangganan, 1.000 masih aktif di akhir 2030.** Angka 1.504 bukan kebetulan;
itu konsekuensi langsung dari churn 3% per bulan. Lihat
[Bagian 7](#7-sensitivitas).

---

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
peredaran bruto** (PP 20/2026 jo PP 55/2022), sesuai keputusan Anda.
Perusahaan tetap PT Perorangan yang sudah ada.

Rumus tiap bulan:

```
margin bersih = omzet
              - fee Midtrans (Rp 4.440 per invoice)
              - PPh final 0,5% x omzet
              - biaya (infrastruktur + legal/admin)
```

### Ringkasan per bulan

| Tahun | Bln | **Omzet/bln** | Fee Midtrans | PPh 0,5% | Biaya | **Margin bersih/bln** |
|---|---|---|---|---|---|---|
| 2026 | 3 | Rp 1.023.704 | Rp 10.570 | Rp 5.119 | Rp 3.720.000 | **−Rp 2.711.985** |
| 2027 | 12 | Rp 17.163.251 | Rp 168.837 | Rp 85.816 | Rp 1.011.667 | **Rp 15.896.931** |
| 2028 | 12 | Rp 52.954.334 | Rp 496.505 | Rp 264.772 | Rp 1.672.915 | **Rp 50.520.143** |
| 2029 | 12 | Rp 119.842.294 | Rp 1.070.142 | Rp 599.211 | Rp 4.434.008 | **Rp 113.738.933** |
| 2030 | 12 | Rp 271.322.145 | Rp 2.307.425 | Rp 1.356.611 | Rp 6.216.475 | **Rp 261.441.635** |

Margin bersih tumbuh dari negatif Rp 2,7 juta per bulan (2026) menjadi
**Rp 261,4 juta per bulan (2030)** —_literal_ 96,5 kali dalam 4,2 tahun.

### Rincian 51 bulan

Januari selalu terlihat paling tinggi di setiap tahun. Itu **bukan
seasonality** — itu tagihan paket tahunan yang menumpuk di awal tahun. Untuk
KPI bulanan, angka rata-rata di tabel sebelumnya lebih berguna.

#### 2026 (Okt–Des)

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Biaya | **Margin** |
|---|---|---|---|---|---|---|
| Okt | 3 | Rp 0 | Rp 0 | Rp 0 | Rp 3.720.000 | **−Rp 3.720.000** |
| Nov | 7 | Rp 1.034.044 | Rp 10.677 | Rp 5.170 | Rp 3.720.000 | **−Rp 2.701.803** |
| Des | 10 | Rp 2.037.068 | Rp 21.034 | Rp 10.185 | Rp 3.720.000 | **−Rp 1.714.152** |

#### 2027

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Biaya | **Margin** |
|---|---|---|---|---|---|---|
| Jan | 19 | Rp 4.447.275 | Rp 44.400 | Rp 22.236 | Rp 1.011.667 | **Rp 3.368.972** |
| Feb | 27 | Rp 5.947.741 | Rp 58.489 | Rp 29.739 | Rp 1.011.667 | **Rp 4.847.845** |
| Mar | 36 | Rp 8.651.364 | Rp 85.077 | Rp 43.257 | Rp 1.011.667 | **Rp 7.511.364** |
| Apr | 44 | Rp 11.273.879 | Rp 110.866 | Rp 56.369 | Rp 1.011.667 | **Rp 10.094.976** |
| Mei | 52 | Rp 13.817.718 | Rp 135.882 | Rp 69.089 | Rp 1.011.667 | **Rp 12.601.080** |
| Jun | 59 | Rp 16.285.242 | Rp 160.147 | Rp 81.426 | Rp 1.011.667 | **Rp 15.032.002** |
| Jul | 66 | Rp 18.678.740 | Rp 183.685 | Rp 93.394 | Rp 1.011.667 | **Rp 17.389.995** |
| Agu | 74 | Rp 21.000.434 | Rp 206.516 | Rp 105.002 | Rp 1.011.667 | **Rp 19.677.249** |
| Sep | 80 | Rp 23.252.476 | Rp 228.662 | Rp 116.262 | Rp 1.011.667 | **Rp 21.895.885** |
| Okt | 87 | Rp 25.436.958 | Rp 250.144 | Rp 127.185 | Rp 1.011.667 | **Rp 24.047.962** |
| Nov | 94 | Rp 27.555.904 | Rp 270.982 | Rp 137.780 | Rp 1.011.667 | **Rp 26.135.476** |
| Des | 100 | Rp 29.611.283 | Rp 291.194 | Rp 148.056 | Rp 1.011.667 | **Rp 28.160.365** |

#### 2028

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Biaya | **Margin** |
|---|---|---|---|---|---|---|
| Jan | 111 | Rp 46.696.387 | Rp 444.000 | Rp 233.482 | Rp 1.672.915 | **Rp 44.345.991** |
| Feb | 122 | Rp 36.924.798 | Rp 345.823 | Rp 184.624 | Rp 1.672.915 | **Rp 34.721.436** |
| Mar | 133 | Rp 40.552.159 | Rp 379.796 | Rp 202.761 | Rp 1.672.915 | **Rp 38.296.688** |
| Apr | 143 | Rp 44.070.700 | Rp 412.749 | Rp 220.353 | Rp 1.672.915 | **Rp 41.764.682** |
| Mei | 153 | Rp 47.483.684 | Rp 444.714 | Rp 237.418 | Rp 1.672.915 | **Rp 45.128.637** |
| Jun | 163 | Rp 50.794.279 | Rp 475.719 | Rp 253.971 | Rp 1.672.915 | **Rp 48.391.673** |
| Jul | 172 | Rp 54.005.556 | Rp 505.795 | Rp 270.028 | Rp 1.672.915 | **Rp 51.556.818** |
| Agu | 181 | Rp 57.120.494 | Rp 534.968 | Rp 285.602 | Rp 1.672.915 | **Rp 54.627.009** |
| Sep | 190 | Rp 60.141.985 | Rp 563.266 | Rp 300.710 | Rp 1.672.915 | **Rp 57.605.094** |
| Okt | 199 | Rp 63.072.831 | Rp 590.715 | Rp 315.364 | Rp 1.672.915 | **Rp 60.493.836** |
| Nov | 207 | Rp 65.915.751 | Rp 617.341 | Rp 329.579 | Rp 1.672.915 | **Rp 63.295.916** |
| Des | 215 | Rp 68.673.384 | Rp 643.168 | Rp 343.367 | Rp 1.672.915 | **Rp 66.013.934** |

#### 2029

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Biaya | **Margin** |
|---|---|---|---|---|---|---|
| Jan | 239 | Rp 105.417.095 | Rp 954.600 | Rp 527.085 | Rp 4.434.008 | **Rp 99.501.401** |
| Feb | 263 | Rp 83.417.483 | Rp 744.053 | Rp 417.087 | Rp 4.434.008 | **Rp 77.822.334** |
| Mar | 286 | Rp 91.664.210 | Rp 817.610 | Rp 458.321 | Rp 4.434.008 | **Rp 85.954.270** |
| Apr | 308 | Rp 99.663.535 | Rp 888.961 | Rp 498.318 | Rp 4.434.008 | **Rp 93.842.248** |
| Mei | 330 | Rp 107.422.881 | Rp 958.172 | Rp 537.114 | Rp 4.434.008 | **Rp 101.493.586** |
| Jun | 351 | Rp 114.949.446 | Rp 1.025.306 | Rp 574.747 | Rp 4.434.008 | **Rp 108.915.385** |
| Jul | 371 | Rp 122.250.214 | Rp 1.090.426 | Rp 611.251 | Rp 4.434.008 | **Rp 116.114.529** |
| Agu | 391 | Rp 129.331.960 | Rp 1.153.593 | Rp 646.660 | Rp 4.434.008 | **Rp 123.097.699** |
| Sep | 410 | Rp 136.201.252 | Rp 1.214.864 | Rp 681.006 | Rp 4.434.008 | **Rp 129.871.374** |
| Okt | 429 | Rp 142.864.467 | Rp 1.274.298 | Rp 714.322 | Rp 4.434.008 | **Rp 136.441.839** |
| Nov | 447 | Rp 149.327.784 | Rp 1.331.948 | Rp 746.639 | Rp 4.434.008 | **Rp 142.815.189** |
| Des | 464 | Rp 155.597.202 | Rp 1.387.869 | Rp 777.986 | Rp 4.434.008 | **Rp 148.997.340** |

#### 2030

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Biaya | **Margin** |
|---|---|---|---|---|---|---|
| Jan | 517 | Rp 238.880.040 | Rp 2.060.160 | Rp 1.194.400 | Rp 6.216.475 | **Rp 229.409.005** |
| Feb | 567 | Rp 188.978.538 | Rp 1.605.350 | Rp 944.893 | Rp 6.216.475 | **Rp 180.211.820** |
| Mar | 617 | Rp 207.618.128 | Rp 1.763.691 | Rp 1.038.091 | Rp 6.216.475 | **Rp 198.599.871** |
| Apr | 665 | Rp 225.698.531 | Rp 1.917.282 | Rp 1.128.493 | Rp 6.216.475 | **Rp 216.436.281** |
| Mei | 711 | Rp 243.236.522 | Rp 2.066.265 | Rp 1.216.183 | Rp 6.216.475 | **Rp 233.737.599** |
| Jun | 756 | Rp 260.248.373 | Rp 2.210.779 | Rp 1.301.242 | Rp 6.216.475 | **Rp 250.519.877** |
| Jul | 800 | Rp 276.749.869 | Rp 2.350.957 | Rp 1.383.749 | Rp 6.216.475 | **Rp 266.798.687** |
| Agu | 843 | Rp 292.756.320 | Rp 2.486.930 | Rp 1.463.782 | Rp 6.216.475 | **Rp 282.589.133** |
| Sep | 884 | Rp 308.282.577 | Rp 2.618.824 | Rp 1.541.413 | Rp 6.216.475 | **Rp 297.905.865** |
| Okt | 924 | Rp 323.343.046 | Rp 2.746.761 | Rp 1.616.715 | Rp 6.216.475 | **Rp 312.763.095** |
| Nov | 962 | Rp 337.951.702 | Rp 2.870.860 | Rp 1.689.759 | Rp 6.216.475 | **Rp 327.174.609** |
| Des | 1.000 | Rp 352.122.097 | Rp 2.991.235 | Rp 1.760.610 | Rp 6.216.475 | **Rp 341.153.776** |

### Total 4,2 tahun

| Komponen | Jumlah |
|---|---|
| Omzet bruto | Rp 5.538.455.404 |
| Fee Midtrans | −Rp 48.546.603 |
| PPh final 0,5% | −Rp 27.692.277 |
| Biaya infrastruktur + legal/admin | −Rp 171.180.768 |
| **Margin bersih** | **Rp 5.291.035.743 (95,53% dari omzet)** |

Rata-rata 51 bulan: **Rp 103.745.799 per bulan**.

### Kapan cukup untuk gaji

Tidak ada tabel gaji di dokumen ini lagi — Anda yang menentukan dari margin.
Angla berikut menunjukkan kapasitas, bukan jadwal gaji:

| Margin/bln | Pelanggan aktif | Setara gaji per orang (jika 50:50) |
|---|---|---|
| Rp 15.896.931 (rata-rata 2027) | ~100 | Rp 7.948.465 |
| Rp 50.520.143 (rata-rata 2028) | ~215 | Rp 25.260.071 |
| Rp 113.738.933 (rata-rata 2029) | ~464 | Rp 56.869.466 |
| Rp 261.441.635 (rata-rata 2030) | ~1.000 | Rp 130.720.817 |

**2026 dan 2027 adalah dua tahun yang tidak bisa menanggung gaji apa pun.**
Margin 2026 negatif Rp 8,1 juta, dan rata-rata 2027 Rp 15,9 juta per bulan.

**Dana yang dibutuhkan tetap Rp 8.135.955** — hanya untuk 3 bulan terakhir
2026, dan hanya karena legal/admin Rp 9 juta (termasuk laporan tahunan
pertama). Infrastruktur dan pajak nyaris tidak memakai modal.

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

| Tahun | ARPU | Infrastruktur per pelanggan per bulan | Margin infrastructure |
|---|---|---|---|
| 2026 | Rp 430.000 | Rp 72.000 | 76,3% |
| 2027 | Rp 451.500 | Rp 7.200 | 99,6% |
| 2028 | Rp 474.075 | Rp 6.424 | 99,8% |
| 2029 | Rp 497.779 | Rp 8.748 | 99,7% |
| 2030 | Rp 522.668 | Rp 5.800 | 99,8% |

---

## 5. Yang tidak ada di dokumen ini

Sengaja dikecualikan, dan sebaiknya tetap dikecualikan:

- **Pajak.** Sudah dihitung di [Bagian 9](#9-pajak-pph) dalam dua rezim.
  Yang belum: PPh Pasal 21 atas gaji sendiri, PPh Pasal 23 rekening bank,
  pajak pengalihan status perseroan, dan dampak PPN ke harga.
- **Biaya akuisisi (CAC).** Tidak ada anggaran iklan, semuanya diasumsikan
  organic atau referral. Dengan laba bersih Rp 69 juta, satu kali biaya
  akuisisi Rp 200 juta sudah menghapus seluruh laba lima tahun.
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

### 2. Kurva 10 menjadi 100 dalam 12 bulan belum pernah diuji

Belum ada pelanggan nyata, jadi churn 3% per bulan adalah angka dari
literatur SaaS SMB, bukan dari data FurniTech. Kalau churn sebenarnya 5%,
rekrut yang dibutuhkan naik dari 1.504 menjadi 1.870 orang
([Bagian 7](#7-sensitivitas)) — artinya sekitar 24% lebih banyak penjualan
untuk hasil yang sama.

### 3. Harga belum pernah diuji terhadap willingness to pay

Rp 300.000 per bulan adalah tebakan. Belum ada satu pun pelanggan yang
membayar sepenuhnya. Kampanye yang berhasil memberi umumnya terlihat sangat
berbeda di kurva retensi.

### 4. 85% pendapatan datang dari 2029–2030

Rp 4,65 miliar dari Rp 5,49 miliar terjadi pada dua tahun terakhir. Proyeksi
sangat sensitif terhadap apa pun yang menggagalkan 2029–2030. Sebaliknya,
2026–2028 hanya menghasilkan Rp 836 juta pendapatan kumulatif — cukup untuk
menggaji 2 orang selama 3 bulan, tidak lebih.

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

| Skenario | Aktif akhir 2030 | Total terdaftar | Pendapatan 5 tahun |
|---|---|---|---|
| Konservatif 5-50-150-300-500 | 500 | 793 | Rp 3.222.020.550 |
| **Dasar 10-100-215-464-1.000** | **1.000** | **1.504** | **Rp 5.489.908.800** |
| Optimis 20-150-400-700-1.500 | 1.500 | 2.287 | Rp 8.588.734.667 |

Rentang pendapatan Rp 3,2 miliar sampai Rp 8,6 miliar hanya berasal dari
ketidakpastian jumlah pelanggan — bukan dari harga, bukan dari infrastruktur.

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
   2027 Rp 15,9 juta dan 2030 Rp 261,4 juta. Melihat total lima tahun
   membuat 2027–2028 terlihat besar padahal dua tahun pertama itu hampir
   tidak menghasilkan apa-apa.
8. **Dana yang dibutuhkan hanya Rp 8,1 juta.** Tidak perlu modal ventura.
   Tidak ada modal yang memaksa tumbuh cepat, jadi pertumbuhan harus datang
   dari prioritas, bukan tekanan pendanaan.
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
| Interpolasi 2028–2029 | geometris ×2,1544 per tahun | hitungan |
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
