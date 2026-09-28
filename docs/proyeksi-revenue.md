# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 10](#10-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **margin bersihnya naik dari Rp 8,5 juta per bulan
di 2026 menjadi Rp 280,7 juta per bulan di 2030, total Rp 6,65 miliar dalam
4,2 tahun (95,97% dari omzet)** — karena tidak ada gaji di P&L, tidak ada
biaya legal di 2026, admin dikerjakan berdua, dan PPh cukup 0,5% dari omzet
lewat Rezim A Perseroan Perorangan. Kebutuhan modal hanya sekitar Rp 2 juta,
di bulan pertama. Yang tidak terlihat di angka ini: 106 orang harus mendaftar
dalam 3 bulan pertama, dan 2 orang tidak mungkin menangani 1.000 pelanggan —
keduanya tidak akan muncul sebagai rupiah di mana pun.

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

| Tahun | Pelanggan | Omzet | Fee Midtrans | **Revenue bersih** |
|---|---|---|---|---|
| 2026 | 100 | Rp 30.711.120 | Rp 317.110 | **Rp 30.394.010** |
| 2027 | 178 | Rp 536.641.156 | Rp 5.283.929 | **Rp 531.357.228** |
| 2028 | 316 | Rp 1.001.348.208 | Rp 9.390.088 | **Rp 991.958.120** |
| 2029 | 562 | Rp 1.868.623.657 | Rp 16.688.469 | **Rp 1.851.935.188** |
| 2030 | 1.000 | Rp 3.490.536.090 | Rp 29.689.119 | **Rp 3.460.846.971** |
| **Total** | | **Rp 6.927.860.232** | **Rp 61.368.715** | **Rp 6.866.491.517** |

Fee Midtrans total Rp 61,4 juta, yaitu 0,89% dari omzet. Tidak material.

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
| 2026 (3 bln) | $101 | Rp 4.861.824 |
| 2027 | $140 | Rp 26.820.096 |
| 2028 | $86 | Rp 16.574.976 |
| 2029 | $254 | Rp 48.708.096 |
| 2030 | $362 | Rp 69.597.696 |
| **Total (4,2 th)** | | **Rp 166.562.688** |

Kenaikan kurs 10% menambah total infrastruktur sekitar Rp 16,7 juta dalam
4,2 tahun. Tidak material.

2026 dan 2027 comparatively mahal per pelanggan karena jumlah pengguna masih
sedikit sementara tagihan minimum bulanan sudah jalan. Itu hilang sendiri di
2028.

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
| **2026** | **Rp 0** | PT Perorangan sudah berdiri, tidak ada yang perlu didirikan |
| Laporan tahunan ke Kementerian Hukum (2027–2030) | Rp 3.500.000/tahun | Wajib dinotarisasi |
| Renewal domain .com (2027–2030) | Rp 167.000/tahun | Diperpanjang lewat dashboard Cloudflare |

| Tahun | Infrastruktur | Legal & admin | **Total biaya** |
|---|---|---|---|
| **2026 (3 bln)** | Rp 4.861.824 | **Rp 0** | **Rp 4.861.824** |
| 2027 | Rp 26.820.096 | Rp 3.500.000 | **Rp 30.320.096** |
| 2028 | Rp 16.574.976 | Rp 3.500.000 | **Rp 20.074.976** |
| 2029 | Rp 48.708.096 | Rp 4.500.000 | **Rp 53.208.096** |
| 2030 | Rp 69.597.696 | Rp 5.000.000 | **Rp 74.597.696** |
| **Total** | **Rp 166.562.688** | **Rp 16.500.000** | **Rp 183.062.688** |

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
| 2026 | 3 | **Rp 8.459.543** | 100 |
| 2027 | 12 | **Rp 41.529.494** | 178 |
| 2028 | 12 | **Rp 80.573.033** | 316 |
| 2029 | 12 | **Rp 149.115.331** | 562 |
| 2030 | 12 | **Rp 280.733.050** | 1.000 |

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

Biaya legal **tidak ada di 2026** — hanya muncul 2027 sampai 2030.

#### 2026

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Okt | 34 | Rp 0 | Rp 0 | Rp 0 | Rp 1.620.608 | Rp 0 | **Rp -1.620.608** |
| Nov | 68 | Rp 10.340.445 | Rp 106.771 | Rp 51.702 | Rp 1.620.608 | Rp 0 | **Rp 8.561.363** |
| Des | 100 | Rp 20.370.676 | Rp 210.339 | Rp 101.853 | Rp 1.620.608 | Rp 0 | **Rp 18.437.875** |

#### 2027

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Jan | 108 | Rp 44.472.750 | Rp 444.000 | Rp 222.364 | Rp 2.235.008 | Rp 291.667 | **Rp 41.279.712** |
| Feb | 115 | Rp 34.020.609 | Rp 334.555 | Rp 170.103 | Rp 2.235.008 | Rp 291.667 | **Rp 30.989.276** |
| Mar | 122 | Rp 36.363.749 | Rp 357.597 | Rp 181.819 | Rp 2.235.008 | Rp 291.667 | **Rp 33.297.658** |
| Apr | 129 | Rp 38.636.595 | Rp 379.948 | Rp 193.183 | Rp 2.235.008 | Rp 291.667 | **Rp 35.536.789** |
| Mei | 136 | Rp 40.841.256 | Rp 401.628 | Rp 204.206 | Rp 2.235.008 | Rp 291.667 | **Rp 37.708.746** |
| Jun | 143 | Rp 42.979.776 | Rp 422.658 | Rp 214.899 | Rp 2.235.008 | Rp 291.667 | **Rp 39.815.545** |
| Jul | 149 | Rp 45.054.142 | Rp 443.057 | Rp 225.271 | Rp 2.235.008 | Rp 291.667 | **Rp 41.859.139** |
| Agu | 155 | Rp 47.066.276 | Rp 462.844 | Rp 235.331 | Rp 2.235.008 | Rp 291.667 | **Rp 43.841.425** |
| Sep | 161 | Rp 49.018.046 | Rp 482.038 | Rp 245.090 | Rp 2.235.008 | Rp 291.667 | **Rp 45.764.243** |
| Okt | 167 | Rp 50.911.263 | Rp 500.656 | Rp 254.556 | Rp 2.235.008 | Rp 291.667 | **Rp 47.629.377** |
| Nov | 173 | Rp 52.747.684 | Rp 518.715 | Rp 263.738 | Rp 2.235.008 | Rp 291.667 | **Rp 49.438.556** |
| Des | 178 | Rp 54.529.012 | Rp 536.232 | Rp 272.645 | Rp 2.235.008 | Rp 291.667 | **Rp 51.193.460** |

#### 2028

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Jan | 192 | Rp 83.119.570 | Rp 790.320 | Rp 415.598 | Rp 1.381.248 | Rp 291.667 | **Rp 80.240.737** |
| Feb | 205 | Rp 63.557.202 | Rp 595.252 | Rp 317.786 | Rp 1.381.248 | Rp 291.667 | **Rp 60.971.250** |
| Mar | 217 | Rp 67.910.036 | Rp 636.019 | Rp 339.550 | Rp 1.381.248 | Rp 291.667 | **Rp 65.261.552** |
| Apr | 230 | Rp 72.132.285 | Rp 675.563 | Rp 360.661 | Rp 1.381.248 | Rp 291.667 | **Rp 69.423.146** |
| Mei | 242 | Rp 76.227.866 | Rp 713.920 | Rp 381.139 | Rp 1.381.248 | Rp 291.667 | **Rp 73.459.892** |
| Jun | 253 | Rp 80.200.580 | Rp 751.127 | Rp 401.003 | Rp 1.381.248 | Rp 291.667 | **Rp 77.375.535** |
| Jul | 265 | Rp 84.054.112 | Rp 787.218 | Rp 420.271 | Rp 1.381.248 | Rp 291.667 | **Rp 81.173.709** |
| Agu | 275 | Rp 87.792.038 | Rp 822.226 | Rp 438.960 | Rp 1.381.248 | Rp 291.667 | **Rp 84.857.938** |
| Sep | 286 | Rp 91.417.827 | Rp 856.183 | Rp 457.089 | Rp 1.381.248 | Rp 291.667 | **Rp 88.431.640** |
| Okt | 296 | Rp 94.934.842 | Rp 889.122 | Rp 474.674 | Rp 1.381.248 | Rp 291.667 | **Rp 91.898.130** |
| Nov | 306 | Rp 98.346.346 | Rp 921.073 | Rp 491.732 | Rp 1.381.248 | Rp 291.667 | **Rp 95.260.627** |
| Des | 316 | Rp 101.655.505 | Rp 952.065 | Rp 508.278 | Rp 1.381.248 | Rp 291.667 | **Rp 98.522.248** |

#### 2029

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Jan | 340 | Rp 154.938.614 | Rp 1.403.040 | Rp 774.693 | Rp 4.059.008 | Rp 375.000 | **Rp 148.326.873** |
| Feb | 363 | Rp 118.508.009 | Rp 1.057.047 | Rp 592.540 | Rp 4.059.008 | Rp 375.000 | **Rp 112.424.414** |
| Mar | 386 | Rp 126.655.378 | Rp 1.129.719 | Rp 633.277 | Rp 4.059.008 | Rp 375.000 | **Rp 120.458.375** |
| Apr | 408 | Rp 134.558.326 | Rp 1.200.210 | Rp 672.792 | Rp 4.059.008 | Rp 375.000 | **Rp 128.251.317** |
| Mei | 430 | Rp 142.224.186 | Rp 1.268.586 | Rp 711.121 | Rp 4.059.008 | Rp 375.000 | **Rp 135.810.470** |
| Jun | 450 | Rp 149.660.069 | Rp 1.334.912 | Rp 748.300 | Rp 4.059.008 | Rp 375.000 | **Rp 143.142.849** |
| Jul | 470 | Rp 156.872.877 | Rp 1.399.247 | Rp 784.364 | Rp 4.059.008 | Rp 375.000 | **Rp 150.255.257** |
| Agu | 490 | Rp 163.869.300 | Rp 1.461.653 | Rp 819.346 | Rp 4.059.008 | Rp 375.000 | **Rp 157.154.292** |
| Sep | 509 | Rp 170.655.830 | Rp 1.522.186 | Rp 853.279 | Rp 4.059.008 | Rp 375.000 | **Rp 163.846.357** |
| Okt | 527 | Rp 177.238.764 | Rp 1.580.903 | Rp 886.194 | Rp 4.059.008 | Rp 375.000 | **Rp 170.337.659** |
| Nov | 545 | Rp 183.624.211 | Rp 1.637.859 | Rp 918.121 | Rp 4.059.008 | Rp 375.000 | **Rp 176.634.223** |
| Des | 562 | Rp 189.818.094 | Rp 1.693.106 | Rp 949.090 | Rp 4.059.008 | Rp 375.000 | **Rp 182.741.889** |

#### 2030

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Jan | 605 | Rp 289.333.152 | Rp 2.495.280 | Rp 1.446.666 | Rp 5.799.808 | Rp 416.667 | **Rp 279.174.731** |
| Feb | 647 | Rp 221.320.155 | Rp 1.880.088 | Rp 1.106.601 | Rp 5.799.808 | Rp 416.667 | **Rp 212.116.991** |
| Mar | 687 | Rp 236.551.760 | Rp 2.009.479 | Rp 1.182.759 | Rp 5.799.808 | Rp 416.667 | **Rp 227.143.048** |
| Apr | 726 | Rp 251.326.418 | Rp 2.134.988 | Rp 1.256.632 | Rp 5.799.808 | Rp 416.667 | **Rp 241.718.323** |
| Mei | 764 | Rp 265.657.836 | Rp 2.256.732 | Rp 1.328.289 | Rp 5.799.808 | Rp 416.667 | **Rp 255.856.340** |
| Jun | 801 | Rp 279.559.311 | Rp 2.374.823 | Rp 1.397.797 | Rp 5.799.808 | Rp 416.667 | **Rp 269.570.217** |
| Jul | 837 | Rp 293.043.742 | Rp 2.489.372 | Rp 1.465.219 | Rp 5.799.808 | Rp 416.667 | **Rp 282.872.677** |
| Agu | 871 | Rp 306.123.641 | Rp 2.600.484 | Rp 1.530.618 | Rp 5.799.808 | Rp 416.667 | **Rp 295.776.064** |
| Sep | 905 | Rp 318.811.142 | Rp 2.708.263 | Rp 1.594.056 | Rp 5.799.808 | Rp 416.667 | **Rp 308.292.349** |
| Okt | 938 | Rp 331.118.018 | Rp 2.812.808 | Rp 1.655.590 | Rp 5.799.808 | Rp 416.667 | **Rp 320.433.145** |
| Nov | 969 | Rp 343.055.688 | Rp 2.914.217 | Rp 1.715.278 | Rp 5.799.808 | Rp 416.667 | **Rp 332.209.717** |
| Des | 1000 | Rp 354.635.228 | Rp 3.012.584 | Rp 1.773.176 | Rp 5.799.808 | Rp 416.667 | **Rp 343.632.993** |

### Total 4,2 tahun

| Komponen | Jumlah |
|---|---|
| Omzet bruto | Rp 6.927.860.232 |
| Fee Midtrans | −Rp 61.368.715 |
| PPh final 0,5% | −Rp 34.639.301 |
| Infrastruktur | −Rp 166.562.688 |
| Legal dan admin (2027–2030 saja) | −Rp 16.500.000 |
| **Margin bersih** | **Rp 6.648.789.528 (95,97% dari omzet)** |

Rata-rata 51 bulan: **Rp 130.368.422 per bulan**.

### Titik kas terendah

Kas terendah hanya **Rp −1.620.608**, di Oktober 2026 — bulan pertama, dan
itu hampir seluruhnya biaya infrastruktur. Setelah itu margin positif dan
langsung menutup seluruh kekurangan. **Kebutuhan modal: sekitar Rp 2 juta.**

### Kapan cukup untuk gaji

| Margin/bln | Pelanggan aktif | Setara gaji per orang (bila 50:50) |
|---|---|---|
| Rp 8.459.543 (rata-rata 2026) | 100 | Rp 4.229.771 |
| Rp 41.529.494 (rata-rata 2027) | 178 | Rp 20.764.747 |
| Rp 80.573.033 (rata-rata 2028) | 316 | Rp 40.286.516 |
| Rp 149.115.331 (rata-rata 2029) | 562 | Rp 74.557.665 |
| Rp 280.733.049 (rata-rata 2030) | 1.000 | Rp 140.366.524 |

**2026 tidak bisa menanggung gaji apa pun.** Mulai 2027 margin rata-rata Rp 41,5 juta per bulan, jadi gaji
Rp 20 juta per orang sudah tertutup.

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
| 2% | 1.411 | 411 | 1.000 |
| **3% (dasar)** | **1.626** | **626** | **1.000** |
| 5% | 2.077 | 1.077 | 1.000 |
| 8% | 2.809 | 1.809 | 1.000 |

Margin hampir tidak bergerak, karena target akhir tahun dikunci sehingga
revenue hampir sama. Churn menentukan berapa
banyak orang yang harus dicari untuk mengisi posisi yang kosong. Dengan 2
orang, itu berarti waktu penjualan yang lebih banyak — bukan margin yang
lebih kecil.

### ARPU — kalau bauran paket atau harga bergerak

| ARPU | Omzet 5 tahun |
|---|---|
| Rp 301.000 (−30%) | Rp 4.849.502.162 |
| Rp 365.500 (−15%) | Rp 5.888.681.197 |
| **Rp 430.000 (dasar)** | **Rp 6.927.860.232** |
| Rp 494.500 (+15%) | Rp 7.967.039.267 |

### Target — kalau jumlah pengrajin meleset

Target baru mengubah kesimpulan. Kalau 2026 hanya mencapai 50, dan 2030 tetap
ditahan di 1.000, kurvanya harus mengejar lebih cepat di empat tahun
berikutnya:

| Skenario | Aktif akhir 2026 | Aktif akhir 2030 | Omzet 5 th | Margin 5 th |
|---|---|---|---|---|
| 2026 separuh, 2030 tercapai | 50 | 1.000 | Rp 5.735.598.330 | Rp 5.473.440.794 |
| **Dasar** | **100** | **1.000** | **Rp 6.927.860.232** | **Rp 6.648.789.528** |
| 2026 naik 50%, 2030 tercapai | 150 | 1.000 | Rp 7.866.475.190 | Rp 7.574.038.604 |
| 2026 tercapai, 2030 separuh | 100 | 500 | Rp 4.342.305.309 | Rp 4.098.714.721 |
| keduanya meleset | 50 | 500 | Rp 3.463.930.116 | Rp 3.232.863.420 |

Rentang margin Rp 3,23 miliar sampai Rp 7,57 miliar. **2030 menentukan
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
8. **Dana yang dibutuhkan hanya sekitar Rp 2 juta**, di bulan pertama, dan itu
   hampir seluruhnya biaya infrastruktur. Tidak perlu modal ventura. Tidak ada modal yang memaksa tumbuh cepat, jadi
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
| 2026 | Rp 30.711.120 | Rp 153.556 |
| 2027 | Rp 536.641.156 | Rp 2.683.206 |
| 2028 | Rp 1.001.348.208 | Rp 5.006.741 |
| 2029 | Rp 1.868.623.657 | Rp 9.343.118 |
| 2030 | Rp 3.490.536.090 | Rp 17.452.680 |
| **Total 4,2 tahun** | **Rp 6.927.860.232** | **Rp 34.639.301** |

Angka ini sudah termasuk di [Bagian 4](#4-margin-bersih-setiap-bulan) sebagai
beban, jadi margin bersih di sana **sudah setelah PPh**.

Sekitar Rp 34,6 juta selama 4,2 tahun. Itulah nilai terbesar Rezim A: pada
2030, PPh Rezim A hanya Rp 17,5 juta, sedangkan PPh badan 22% atas laba
Rp 3,39 miliar adalah Rp 745 juta. **Selisihnya 43 kali.**

### Hitungan Rezim B — badan 22%, lalu dividen 10%

Kalau agregat omzet menembus Rp 4,8 miliar, tarif badan 22% atas laba. Laba
di sini memakai **biaya yang sama seperti Bagian 4** (legal nol di 2026):

| Tahun | Laba | PPh badan 22% | Bagian Anda 50% | PPh dividen 10% | **Anda net** |
|---|---|---|---|---|---|
| 2026 | Rp 25.532.186 | Rp 5.617.081 | Rp 12.766.093 | Rp 1.276.609 | **Rp 11.489.484** |
| 2027 | Rp 501.037.132 | Rp 110.228.169 | Rp 250.518.566 | Rp 25.051.857 | **Rp 225.466.709** |
| 2028 | Rp 971.883.144 | Rp 213.814.292 | Rp 485.941.572 | Rp 48.594.157 | **Rp 437.347.415** |
| 2029 | Rp 1.798.727.092 | Rp 395.719.960 | Rp 899.363.546 | Rp 89.936.355 | **Rp 809.427.191** |
| 2030 | Rp 3.386.249.275 | Rp 744.974.841 | Rp 1.693.124.638 | Rp 169.312.464 | **Rp 1.523.812.174** |
| **Total** | **Rp 6.683.428.829** | **Rp 1.470.354.342** | **Rp 3.341.714.415** | **Rp 334.171.441** | **Rp 3.007.542.973** |

Dividen yang diterima WP Orang Pribadi dalam negeri dikenai PPh final 10%
(PP 55/2022 Pasal 23 huruf m). Karena itu kolom "Anda net" adalah **setelah**
pajak.

Bandingkan dengan Rezim A: bagian Anda **Rp 3.324.394.764** dari margin
Rp 6.648.789.528. Selisihnya **Rp 316,9 juta** dalam 4,2 tahun.

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
  Anda atas jumlah yang ditarik.
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

