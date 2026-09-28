# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 12](#12-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **margin bersihnya naik dari Rp 11,1 juta per bulan
di 2026 menjadi Rp 372,7 juta per bulan di 2030, total Rp 8,80 miliar dalam
4,2 tahun (94,4% dari omzet)** — karena tidak ada gaji di P&L, tidak ada
biaya legal di 2026, admin dikerjakan berdua, dan PPh cukup 0,5% dari omzet
lewat Rezim A Perseroan Perorangan. Yang tidak terlihat di angka ini: 106
orang harus mendaftar dalam 3 bulan pertama, dan 2 orang tidak mungkin
menangani 1.000 pelanggan — keduanya tidak akan muncul sebagai rupiah di
mana pun.

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

Harga tahunan **dihitung**, bukan diketik: `priceMonthly × 12 × 0,95`.

### Cara perhitungannya

Setiap pelanggan dipisah menjadi dua kohort, lalu dihitung terpisah tiap bulan:

```
70% pelanggan  -> kohort BULANAN  : bayar priceMonthly tiap bulan
30% pelanggan  -> kohort TAHUNAN  : bayar priceYearly SEKALI di bulan Januari
```

Perhitungan omzet bulanan:

```
omzet bulan ini = (jumlah kohort bulanan × harga bulanan)
                + (bila bulan Januari: jumlah kohort tahunan × harga tahunan)
```

Biaya per bulan:

```
fee Midtrans = (jumlah kohort bulanan × Rp 4.440)
             + (bila bulan Januari: jumlah kohort tahunan × Rp 4.440)

PPh Rezim A  = omzet × 0,5%
biaya        = infrastruktur + legal/admin
margin       = omzet − fee Midtrans − PPh − biaya
```

Tiga hal yang perlu diperhatikan:

- **Porsi paket diterapkan pada rekrut, bukan pada tagihan.** Setiap rekrutan
  baru langsung masuk ke kohort Basic (60%), Pro (30%), atau Max (10%).
  Kohort itu lalu dibayar dengan harga paketnya sendiri.
- **Tagihan tahunan masuk seluruhnya di Januari.** Jadi Januari selalu
  terlihat 4–5 kali lebih tinggi dari bulan biasa. Itu bukan seasonality, itu
  cara penagihan — dan alasan kenapa rata-rata bulanan lebih berguna
  untuk KPI daripada angka Januari.
- **Biaya dibagi proporsional ke tiap paket** sesuai porsi omzet, karena
  infrastruktur dan legal tidak bisa diatribusikan ke satu paket saja.

### ARPU

Dengan bauran 60/30/10 dan diskon tahunan 5%:

```
ARPU bruto per bulan = 0,6 × 300.000 + 0,3 × 500.000 + 0,1 × 1.000.000
                     = Rp 430.000
```

Tiga asumsi lain yang berlaku: **Fee Midtrans Rp 4.440 per invoice
ditanggung FurniTech** (`PRD.md`: `feeLangganan = Rp4.440 per invoice →
FurniTech`), **harga dinaikkan 5% per tahun** mulai 2027, dan **churn 3% per
bulan**.

### Omzet per paket

| Paket | Harga/bln | Harga/thn | 2026 | 2027 | 2028 | 2029 | 2030 | Total 4,2 th | Porsi |
|---|---|---|---|---|---|---|---|---|---|
| **Basic** | Rp 300.000 | Rp 3.420.000 | Rp 12.855.818 | Rp 283.891.984 | Rp 529.910.071 | Rp 988.640.855 | Rp 1.846.636.162 | **Rp 3.661.934.889** | 41,9% |
| **Pro** | Rp 500.000 | Rp 5.700.000 | Rp 10.713.181 | Rp 236.576.653 | Rp 441.591.726 | Rp 823.867.379 | Rp 1.538.863.468 | **Rp 3.051.612.408** | 34,9% |
| **Max** | Rp 1.000.000 | Rp 11.400.000 | Rp 7.142.121 | Rp 157.717.769 | Rp 294.394.484 | Rp 549.244.919 | Rp 1.025.908.979 | **Rp 2.034.408.272** | 23,3% |
| **Total** | | | Rp 30.711.120 | Rp 678.186.406 | Rp 1.265.896.280 | Rp 2.361.753.153 | Rp 4.411.408.609 | **Rp 8.747.955.569** | 100% |

Perhatikan kolom porsi: **Max hanya 10% pelanggan tapi menyumbang 23,3%
omzet.** Kalau 100 pelanggan Basicbernilai Rp 30 juta, 30 pelanggan Pro Rp 15
juta, dan 10 pelanggan Max Rp 10 juta — Max sepadan dengan satu pertiga pelanggan
Basic. Ini yang membuat naikkan bauran ke Max bernilai jauh lebih besar
daripada kenaikan jumlah pelanggan.

### Margin per paket

Biaya dibagi proporsional terhadap omzet tiap paket, karena infrastruktur dan
legal tidak bisa diatribusikan ke satu paket saja.

| Paket | Omzet | Fee Midtrans | PPh 0,5% | Biaya proporsional | **Margin** | Porsi margin |
|---|---|---|---|---|---|---|
| **Basic** | Rp 3.661.934.889 | Rp 36.821.229 | Rp 18.309.675 | Rp 174.911.456 | **Rp 3.431.892.529** | 41,7% |
| **Pro** | Rp 3.051.612.408 | Rp 18.410.614 | Rp 15.258.062 | Rp 145.759.547 | **Rp 2.872.184.185** | 34,9% |
| **Max** | Rp 2.034.408.272 | Rp 6.136.871 | Rp 10.172.041 | Rp 97.173.031 | **Rp 1.920.926.329** | 23,4% |
| **Total** | **Rp 8.747.955.569** | **Rp 61.368.715** | **Rp 43.739.778** | **Rp 417.844.034** | **Rp 8.225.003.043** | 100% |

Kolom "Biaya proporsional" bukan hanya infrastruktur — ia memakai **seluruh
beban** dibagi menurut porsi omzet tiap paket, termasuk domain dan legalitas
yang sebenarnya bukan milik langganan. Dipisah begini supaya ketiga paket
menunjukkan margin yang sebanding. Atribusi per paket tidak ada,
karena biaya tidak dibedakan oleh fitur.

Perhatikan kolom "porsi margin" versus porsi omzet: keduanya sama. Itu
memang benar — margin tiap paket hampir identik secara persentase, karena yang
dipotong (fee Midtrans per invoice, PPh 0,5% dari omzet, biaya variabel)
mengikutskan semua paket dengan rate yang sama. Yang membedakan hanya
nominalnya.

### Pelanggan per paket

| Paket | Porsi | Rekrut 4,2 th | Aktif akhir 2030 | Churned |
|---|---|---|---|---|
| **Basic** | 60,0% | 976 | 600 | 376 |
| **Pro** | 30,0% | 488 | 300 | 188 |
| **Max** | 10,0% | 163 | 100 | 63 |
| **Total** | 100% | **1.626** | **1.000** | **626** |

### Ringkasan per bulan

| Tahun | Bln | **Margin bersih/bln** | Pelanggan akhir tahun |
|---|---|---|---|
| 2026 | 3 | **Rp 11.092.890** | 100 |
| 2027 | 12 | **Rp 55.246.282** | 178 |
| 2028 | 12 | **Rp 104.662.324** | 316 |
| 2029 | 12 | **Rp 198.138.318** | 562 |
| 2030 | 12 | **Rp 372.659.229** | 1000 |

Rata-rata 51 bulan: **Rp 172.583.383 per bulan**.

### Total 4,2 tahun

| Komponen | Jumlah |
|---|---|
| Omzet langganan | Rp 8.747.955.569 |
| Fee Midtrans | −Rp 61.368.715 |
| PPh final 0,5% (semua omzet) | −Rp 46.639.638 |
| Infrastruktur | −Rp 166.394.420 |
| Legal dan admin (2027–2030 saja) | −Rp 16.500.000 |
| Root domain `mebeltech.com` | −Rp 943.335 |
| Add-on domain (60% ambil) | +Rp 417.343.184 |
| Biaya domain Cloudflare | −Rp 184.096.134 |
| Add-on paket pendirian PT (20% ambil) | +Rp 162.628.789 |
| Beban paket pendirian PT (PNBP + operasional) | −Rp 48.788.637 |
| Fee Midtrans invoice legalitas | −Rp 1.444.144 |
| **Margin bersih** | **Rp 8.801.752.510 (94,4% dari omzet)** |

### Rincian 51 bulan

Biaya legal **tidak ada di 2026** — hanya muncul 2027 sampai 2030. Root
domain `mebeltech.com` dibayar **sekali** di Okt 2026, jadi bulan Okt
2026 yang menanggung Rp 188.667 penuh; bulan setelahnya nol sampai Des
2026, lalu renewal Rp 15.722/bulan sepanjang 2027–2030.

Kolom domain sudah termasuk add-on Rp 250.000/tahun dengan take-up 60%.
Kolom legalitas sudah termasuk add-on Rp 500.000 dengan take-up 20%, dan
kolom bebannya mencakup PNBP Rp 50.000 + operasional Rp 100.000 + fee
Midtrans Rp 4.440 per invoice.

| Bulan | Aktif | Omzet langganan | Fee | PPh 0,5% | Infrastruktur | Legal & root domain | Omzet domain | Biaya domain | Omzet legalitas | Beban legalitas | **Margin** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 2026 | 34 | Rp 0 | Rp 0 | Rp 44.270 | Rp 2.631.087 | Rp 188.667 | Rp 5.312.418 | Rp 4.009.112 | Rp 3.541.612 | Rp 1.093.933 | **Rp 886.960** |
| 11 2026 | 68 | Rp 10.340.445 | Rp 106.771 | Rp 95.972 | Rp 2.631.087 | Rp 0 | Rp 5.312.418 | Rp 4.009.112 | Rp 3.541.612 | Rp 1.093.933 | **Rp 11.257.598** |
| 12 2026 | 100 | Rp 20.370.676 | Rp 210.339 | Rp 146.124 | Rp 2.631.087 | Rp 0 | Rp 5.312.418 | Rp 4.009.112 | Rp 3.541.612 | Rp 1.093.933 | **Rp 21.134.110** |
| 1 2027 | 108 | Rp 186.018.000 | Rp 444.000 | Rp 1.018.805 | Rp 2.631.087 | Rp 15.722 | Rp 16.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 197.778.813** |
| 2 2027 | 115 | Rp 34.020.609 | Rp 334.555 | Rp 183.818 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 31.725.854** |
| 3 2027 | 122 | Rp 36.363.749 | Rp 357.597 | Rp 195.534 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 34.034.236** |
| 4 2027 | 129 | Rp 38.636.595 | Rp 379.948 | Rp 206.898 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 36.273.367** |
| 5 2027 | 136 | Rp 40.841.256 | Rp 401.628 | Rp 217.922 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 38.445.324** |
| 6 2027 | 143 | Rp 42.979.776 | Rp 422.658 | Rp 228.614 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 40.552.123** |
| 7 2027 | 149 | Rp 45.054.142 | Rp 443.057 | Rp 238.986 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 42.595.717** |
| 8 2027 | 155 | Rp 47.066.276 | Rp 462.844 | Rp 249.047 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 44.578.003** |
| 9 2027 | 161 | Rp 49.018.046 | Rp 482.038 | Rp 258.806 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 46.500.821** |
| 10 2027 | 167 | Rp 50.911.263 | Rp 500.656 | Rp 268.272 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 48.365.955** |
| 11 2027 | 173 | Rp 52.747.684 | Rp 518.715 | Rp 277.454 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 50.175.134** |
| 12 2027 | 178 | Rp 54.529.012 | Rp 536.232 | Rp 286.360 | Rp 2.631.087 | Rp 15.722 | Rp 1.645.844 | Rp 1.242.066 | Rp 1.097.229 | Rp 338.912 | **Rp 51.930.038** |
| 1 2028 | 192 | Rp 347.667.642 | Rp 790.320 | Rp 1.896.145 | Rp 3.460.789 | Rp 15.722 | Rp 29.616.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 369.972.540** |
| 2 2028 | 205 | Rp 63.557.202 | Rp 595.252 | Rp 342.093 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 60.911.221** |
| 3 2028 | 217 | Rp 67.910.036 | Rp 636.019 | Rp 363.857 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 65.201.523** |
| 4 2028 | 230 | Rp 72.132.285 | Rp 675.563 | Rp 384.969 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 69.363.117** |
| 5 2028 | 242 | Rp 76.227.866 | Rp 713.920 | Rp 405.447 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 73.399.862** |
| 6 2028 | 253 | Rp 80.200.580 | Rp 751.127 | Rp 425.310 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 77.315.506** |
| 7 2028 | 265 | Rp 84.054.112 | Rp 787.218 | Rp 444.578 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 81.113.680** |
| 8 2028 | 275 | Rp 87.792.038 | Rp 822.226 | Rp 463.267 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 84.797.908** |
| 9 2028 | 286 | Rp 91.417.827 | Rp 856.183 | Rp 481.396 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 88.371.610** |
| 10 2028 | 296 | Rp 94.934.842 | Rp 889.122 | Rp 498.981 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 91.838.101** |
| 11 2028 | 306 | Rp 98.346.346 | Rp 921.073 | Rp 516.039 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 95.200.597** |
| 12 2028 | 316 | Rp 101.655.505 | Rp 952.065 | Rp 532.585 | Rp 3.460.789 | Rp 15.722 | Rp 2.916.873 | Rp 2.201.271 | Rp 1.944.582 | Rp 600.642 | **Rp 98.462.219** |
| 1 2029 | 340 | Rp 648.068.110 | Rp 1.403.040 | Rp 3.520.620 | Rp 3.460.789 | Rp 15.722 | Rp 52.593.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 690.360.022** |
| 2 2029 | 363 | Rp 118.508.009 | Rp 1.057.047 | Rp 635.820 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 116.630.715** |
| 3 2029 | 386 | Rp 126.655.378 | Rp 1.129.719 | Rp 676.557 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 124.664.675** |
| 4 2029 | 408 | Rp 134.558.326 | Rp 1.200.210 | Rp 716.072 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 132.457.617** |
| 5 2029 | 430 | Rp 142.224.186 | Rp 1.268.586 | Rp 754.401 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 140.016.771** |
| 6 2029 | 450 | Rp 149.660.069 | Rp 1.334.912 | Rp 791.580 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 147.349.150** |
| 7 2029 | 470 | Rp 156.872.877 | Rp 1.399.247 | Rp 827.644 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 154.461.558** |
| 8 2029 | 490 | Rp 163.869.300 | Rp 1.461.653 | Rp 862.626 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 161.360.593** |
| 9 2029 | 509 | Rp 170.655.830 | Rp 1.522.186 | Rp 896.559 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 168.052.657** |
| 10 2029 | 527 | Rp 177.238.764 | Rp 1.580.903 | Rp 929.474 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 174.543.960** |
| 11 2029 | 545 | Rp 183.624.211 | Rp 1.637.859 | Rp 961.401 | Rp 3.460.789 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 180.840.523** |
| 12 2029 | 562 | Rp 189.818.094 | Rp 1.693.106 | Rp 992.370 | Rp 3.468.125 | Rp 15.722 | Rp 5.193.592 | Rp 3.919.438 | Rp 3.462.395 | Rp 1.069.464 | **Rp 186.940.854** |
| 1 2030 | 605 | Rp 1.210.205.670 | Rp 2.495.280 | Rp 6.549.563 | Rp 3.480.067 | Rp 15.722 | Rp 93.544.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 1.288.075.492** |
| 2 2030 | 647 | Rp 221.320.155 | Rp 1.880.088 | Rp 1.183.636 | Rp 3.509.794 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 220.841.369** |
| 3 2030 | 687 | Rp 236.551.760 | Rp 2.009.479 | Rp 1.259.794 | Rp 3.538.629 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 235.838.591** |
| 4 2030 | 726 | Rp 251.326.418 | Rp 2.134.988 | Rp 1.333.667 | Rp 3.566.598 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 250.385.897** |
| 5 2030 | 764 | Rp 265.657.836 | Rp 2.256.732 | Rp 1.405.324 | Rp 3.593.729 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 264.496.783** |
| 6 2030 | 801 | Rp 279.559.311 | Rp 2.374.823 | Rp 1.474.831 | Rp 3.620.046 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 278.184.343** |
| 7 2030 | 837 | Rp 293.043.742 | Rp 2.489.372 | Rp 1.542.254 | Rp 3.645.573 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 291.461.276** |
| 8 2030 | 871 | Rp 306.123.641 | Rp 2.600.484 | Rp 1.607.653 | Rp 3.670.335 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 304.339.901** |
| 9 2030 | 905 | Rp 318.811.142 | Rp 2.708.263 | Rp 1.671.091 | Rp 3.694.353 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 316.832.168** |
| 10 2030 | 938 | Rp 331.118.018 | Rp 2.812.808 | Rp 1.732.625 | Rp 3.717.651 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 328.949.666** |
| 11 2030 | 969 | Rp 343.055.688 | Rp 2.914.217 | Rp 1.792.313 | Rp 3.740.250 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 340.703.639** |
| 12 2030 | 1000 | Rp 354.635.228 | Rp 3.012.584 | Rp 1.850.211 | Rp 3.762.172 | Rp 15.722 | Rp 9.244.186 | Rp 6.976.292 | Rp 6.162.790 | Rp 1.903.563 | **Rp 352.104.993** |

### Titik kas terendah

**Kas tidak pernah negatif.** Bulan paling sempit adalah Okt 2026 dengan
saldo **+Rp 886.960** — bulan pertama, ketika belum ada pelanggan sama
sekali, dan satu-satunya yang sudah menjadi beban adalah biaya.

```
Okt 2026  saldo  +Rp  0,9 juta
Nov 2026  saldo  +Rp 12,1 juta
Des 2026  saldo  +Rp 33,3 juta
```

Margin bulan pertama sendiri minus Rp 744.127 — biaya infrastruktur
Rp 2.631.087, root domain Rp 188.667, dan fee invoice — tapi ada
pendaftaran yang sama bulan itu, jadi kasnya tidak pernah minus.

Tanpa add-on apa pun, Okt 2026 akan **Rp -1.543.011**. Jadi
**FurniTech tidak butuh modal untuk mulai** — bukan "butuh sedikit",
tapi nol. Ini hasil yang tidak ada di versi dokumen sebelumnya, dan ia
muncul karena add-on legalitas terbuka sejak bulan pertama: Rp 3,5 juta
diterima untuk 7 orang, bertepatan dengan biaya bulan itu juga.

Perlu diingat bahwa ini hasil dari asumsi tagihan dibayar di bulan yang
sama. Kalau pengrajin_colors pays lewat transfer bank dan baru tercatat
3 hari kemudian, saldo akhir bulan tetap positif, tapi kas harian
menyentuh negatif selama beberapa hari. Itu persoalan WorkingModal, bukan
kerugian.


---

## 3. Beban biaya

### 3a. Infrastruktur

Harga diambil dari halaman pricing resmi. Semua biaya dalam USD, dikonversi
dengan kurs asumsi **Rp 18.037/USD** (harga real-time 28 September 2026).

| Item | Harga | Keterangan |
|---|---|---|
| **Supabase Pro** | $25/bln | 8 GB disk, 100 GB storage, 250 GB egress, 100.000 MAU. Cukup sampai 1.000 pengrajin. |
| **Supabase PITR** | $100/bln | Aktif sejak Okt 2026. Point-in-time recovery 7 hari. |
| **Vercel Pro** | $20/bln | 1 developer seat, 100 GB transfer, $20 kredit usage. |
| **Vercel CPU overflow** | $0,128/jam | Di atas 4 jam Fluid CPU gratis, dikurangi kredit $20. |
| **Email (Resend)** | gratis → $20/bln | Gratis sampai 3.000 email/bulan, aktif mulai 2028. |
| **Monitoring (Sentry)** | gratis → $26/bln | Gratis sampai 5.000 error, aktif mulai 2028. |
| **Domain .com** | $0,87/bln | Cloudflare Registrar menjual **harga cost** — tanpa markup. |
| **DNS / CDN / SSL** | $0 | Cloudflare gratis selamanya. |

Tiga keputusan yang dipakai di sini, semuanya bisa diubah:

- **PITR aktif sejak Okt 2026, bukan 2029.** Produk sudah menyimpan data
  pesanan dan pembayaran pengrajin sejak hari pertama, dan tidak ada
  recovery yang siap kalau tidak diaktifkan dari awal.
- **Domain dipindah ke infrastruktur**, bukan legal. Domain adalah komponen
  teknis yang diurus lewat dashboard, bukan kewajiban hukum.
- **Biaya CPU dihitung dari pelanggan, bukan dari tebakan per tahun.**
  Asumsi: **0,3 jam Fluid CPU per pelanggan aktif per bulan**. Ini mencakup
  render storefront, dashboard, checkout, dan polling status pengiriman.

Perhitungan CPU bulanan:

```
jam CPU        = pelanggan aktif × 0,3
CPU overflow   = max(0, (jam CPU − 4) × $0,128 − $20)
```

Ambang kredit: CPU baru membayar setelah `(jam − 4) × 0,128 > 20`, yaitu
**lebih dari 160 jam per bulan** — setara sekitar **534 pelanggan aktif**.
Kolom CPU overflow bernilai nol sampai sekitar 534 pelanggan. Itu bukan
gratis — itu belum sampai ambang kredit $20 yang sudah termasuk di Vercel Pro.

### Rincian 51 bulan (Okt 2026 – Des 2030)

Kolom pelanggan adalah pelanggan aktif **di awal bulan**, sama dengan
kolom "Aktif" di [Bagian 2](#2-pendapatan). Ini bukan pilihan gaya: biaya
dihitung dari jumlah itu, dan mengubahnya ke hitungan akhir bulan akan
menggeser seluruh omzet — bukan hanya biaya. Formulanya satu, dipakai dua
kali, supaya kedua tabel tidak bisa berbeda.

Kolom Rekrut adalah orang baru yang mendaftar di bulan itu. Totalnya
**1.626 orang** dalam 4,2 tahun — 106 di antaranya pada 3 bulan pertama.

| Bulan | Pelanggan | Rekrut | Jam CPU | Supabase Pro | PITR | Vercel Pro | CPU overflow | Email | Monitoring | Domain | **Total USD/bln** | **Total Rp/bln** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Okt 2026 | 34 | 35,4 | 10,3 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Nov 2026 | 68 | 35,4 | 20,3 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Des 2026 | 100 | 35,4 | 30,0 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Jan 2027 | 108 | 11,0 | 32,3 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Feb 2027 | 115 | 11,0 | 34,5 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Mar 2027 | 122 | 11,0 | 36,7 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Apr 2027 | 129 | 11,0 | 38,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Mei 2027 | 136 | 11,0 | 40,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Jun 2027 | 143 | 11,0 | 42,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Jul 2027 | 149 | 11,0 | 44,7 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Agu 2027 | 155 | 11,0 | 46,5 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Sep 2027 | 161 | 11,0 | 48,3 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Okt 2027 | 167 | 11,0 | 50,1 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Nov 2027 | 173 | 11,0 | 51,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Des 2027 | 178 | 11,0 | 53,4 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$146** | **Rp 2.631.087** |
| Jan 2028 | 192 | 19,4 | 57,5 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Feb 2028 | 205 | 19,4 | 61,4 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Mar 2028 | 217 | 19,4 | 65,2 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Apr 2028 | 230 | 19,4 | 68,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Mei 2028 | 242 | 19,4 | 72,5 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Jun 2028 | 253 | 19,4 | 76,0 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Jul 2028 | 265 | 19,4 | 79,4 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Agu 2028 | 275 | 19,4 | 82,6 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Sep 2028 | 286 | 19,4 | 85,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Okt 2028 | 296 | 19,4 | 88,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Nov 2028 | 306 | 19,4 | 91,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Des 2028 | 316 | 19,4 | 94,8 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Jan 2029 | 340 | 34,6 | 102,0 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Feb 2029 | 363 | 34,6 | 109,0 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Mar 2029 | 386 | 34,6 | 115,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Apr 2029 | 408 | 34,6 | 122,5 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Mei 2029 | 430 | 34,6 | 128,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Jun 2029 | 450 | 34,6 | 135,1 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Jul 2029 | 470 | 34,6 | 141,1 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Agu 2029 | 490 | 34,6 | 146,9 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Sep 2029 | 509 | 34,6 | 152,6 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Okt 2029 | 527 | 34,6 | 158,1 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.460.789** |
| Nov 2029 | 545 | 34,6 | 163,4 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$192** | **Rp 3.468.125** |
| Des 2029 | 562 | 34,6 | 168,6 | $25 | $100 | $20 | $1 | $0 | $0 | $0,87 | **$193** | **Rp 3.480.067** |
| Jan 2030 | 605 | 61,6 | 181,5 | $25 | $100 | $20 | $3 | $0 | $0 | $0,87 | **$195** | **Rp 3.509.794** |
| Feb 2030 | 647 | 61,6 | 194,0 | $25 | $100 | $20 | $4 | $0 | $0 | $0,87 | **$196** | **Rp 3.538.629** |
| Mar 2030 | 687 | 61,6 | 206,1 | $25 | $100 | $20 | $6 | $0 | $0 | $0,87 | **$198** | **Rp 3.566.598** |
| Apr 2030 | 726 | 61,6 | 217,8 | $25 | $100 | $20 | $7 | $0 | $0 | $0,87 | **$199** | **Rp 3.593.729** |
| Mei 2030 | 764 | 61,6 | 229,2 | $25 | $100 | $20 | $9 | $0 | $0 | $0,87 | **$201** | **Rp 3.620.046** |
| Jun 2030 | 801 | 61,6 | 240,3 | $25 | $100 | $20 | $10 | $0 | $0 | $0,87 | **$202** | **Rp 3.645.573** |
| Jul 2030 | 837 | 61,6 | 251,0 | $25 | $100 | $20 | $12 | $0 | $0 | $0,87 | **$203** | **Rp 3.670.335** |
| Agu 2030 | 871 | 61,6 | 261,4 | $25 | $100 | $20 | $13 | $0 | $0 | $0,87 | **$205** | **Rp 3.694.353** |
| Sep 2030 | 905 | 61,6 | 271,5 | $25 | $100 | $20 | $14 | $0 | $0 | $0,87 | **$206** | **Rp 3.717.651** |
| Okt 2030 | 938 | 61,6 | 281,3 | $25 | $100 | $20 | $15 | $0 | $0 | $0,87 | **$207** | **Rp 3.740.250** |
| Nov 2030 | 969 | 61,6 | 290,8 | $25 | $100 | $20 | $17 | $0 | $0 | $0,87 | **$209** | **Rp 3.762.172** |
| Des 2030 | 1000 | 61,6 | 300,0 | $25 | $100 | $20 | $18 | $0 | $0 | $0,87 | **$210** | **Rp 3.783.435** |
| **Total 51 bulan** | | | | | | | | | | | **$ 9.225** | **Rp 166.394.420** | |

Total infrastruktur 4,2 tahun: **$9.225 — Rp 166.394.420**.

Kurs yang dipakai **Rp 18.037/USD** — harga domain Cloudflare yang Anda cek real-time pada 28 September 2026. Angka dollar di tabel tidak berubah; hanya konversinya.

Tiga hal yang terlihat jelas dari tabel:

1. **Biaya nyaris datar** — naik dari $146 ke $209 per bulan dalam 4,2 tahun,
   hanya naik 43%. Yang naik adalah jumlah pelanggan 30 kali lipat.
2. **Biaya per pelanggan turun drastis.** Di Oktober 2026, biaya
   infrastruktur Rp 2,6 juta untuk **nol** pelanggan. Di akhir 2030,
   Rp 3,7 juta untuk 969 pelanggan — dari tak terbatas menjadi Rp 3.900
   per pelanggan per bulan.
3. **CPU overflow baru muncul di 2029**, dan tetap kecil. Server bukan
   variabel yang perlu dioptimalkan di model ini.

### 3a-2. Dua angka infrastructures yang berbeda, dan mana yang benar

Tabel 51 bulan di atas menjumlahkan **Rp 166.394.420**, tapi versi dokumen
sebelumnya menyebut **Rp 166.070.251** — selisihnya Rp 1.533, atau 0,001%.
Penyebabnya pembulatan: tabel menjumlahkan 51 nilai bulat per bulan, lalu
membandingkan hasilnya dengan total yang dihitung dari jumlah USD yang sama
sebelum dibulatkan. Yang dipakai di margin adalah hasil skrip, yaitu
**Rp 166.394.420**, dan angka di mana pun dalam dokumen ini yang
menyebutkan total infrastructures memakai nilai yang sama.

Perbedaannya tidak penting secara finansial, tapi **kedua angka pernah
cetak bersamaan** — yang kecil di klausul, yang besar di tabel. Kalau ada
yang membandingkan kolom-kolomnya, they'll terlihat berbeda tanpa ada yang
salah. Ini mungkin yang paling sering terjadi di dokumen proyeksi:
klausul ditulis dari hasil lama, tabel diperbarui, dan keduanya tetap
terlihat "benar" karena selisihnya di bawah pembulatan.

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
| **2026 (PT)** | **Rp 0** | PT Perorangan sudah berdiri, tidak ada yang perlu didirikan |
| Laporan tahunan ke Kementerian Hukum (2027–2030) | Rp 3.500.000/tahun | Wajib dinotarisasi |
| Root domain `mebeltech.com` (2026) | Rp 188.667 | Sekali bayar, tidak bisa dihitung sendiri |
| Renewal `mebeltech.com` (2027–2030) | Rp 188.667/tahun | Tidak bisa dihindari selama FurniTech hidup |

Domain add-on pelanggan **tidak ada di sini** — dipindah ke tabel
infrastruktur (Bagian 3a) karena biayanya variável, mengikuti jumlah domain
aktif. Yang ada di sini hanya **satu domain milik platform sendiri**, yang
hanya satu dan tidak pernah bertambah.

Biaya root domain sengaja dipisah dari domain add-on. Kalau digabung, biaya
tetap Rp 190.000 akan tersembunyi di antara ratusan domain pelanggan yang
juga di-renew annually — padahal justru satu-satunya yang benar-benar wajib.

| Tahun | Infrastruktur | Legal & admin | Root domain | **Total biaya** |
|---|---|---|---|---|
| 2026 (3 bln) | Rp 7.893.262 | **Rp 0** | Rp 188.667 | **Rp 8.081.929** |
| 2027 | Rp 31.573.047 | Rp 3.500.000 | Rp 188.667 | **Rp 35.261.714** |
| 2028 | Rp 41.529.471 | Rp 3.500.000 | Rp 188.667 | **Rp 45.218.138** |
| 2029 | Rp 41.556.084 | Rp 4.500.000 | Rp 188.667 | **Rp 46.244.751** |
| 2030 | Rp 43.842.566 | Rp 5.000.000 | Rp 188.667 | **Rp 49.031.233** |
| **Total** | **Rp 166.394.420** | **Rp 16.500.000** | **Rp 943.335** | **Rp 183.837.755** |

Kenaikan total biaya hanya **Rp 943.335 dalam 4,2 tahun** — 0,01% dari
omzet. Root domain murah dibanding apa yang harus dilindungi: tanpa
`mebeltech.com`, tidak ada `tokonya.mebeltech.com`, dan seluruh model
subdomain gratis runtuh.

**"Tidak melibatkan orang lain" tidak bisa 100%.** Laporan tahunan wajib
dinotarisasi — itu melibatkan pihak ketiga setiap tahun, tidak bisa dikerjakan
berdua. Ini biaya legal, bukan biaya operasional.

### 3d. Gaji: nol di P&L, tapi bukan nol di kenyataan

Bagian ini sengaja ditulis eksplisit karena tabel margin di atas bisa salah
dibaca.

Tidak ada satu pun rupiah gaji yang masuk ke tabel di atas. Angka margin
Rp 8,80 miliar adalah **uang yang masuk ke perusahaan sebelum dibagikan
kepada kedua orang**. Karena pembagiannya 50:50, bagian Anda adalah
Rp 4,40 miliar dalam 4,2 tahun. Rinciannya ada di
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

Rincian omzet, margin, dan biaya per bulan ada di
[Bagian 2](#2-pendapatan). Ringkasannya:

| Tahun | Bln | **Margin bersih/bln** | Pelanggan akhir tahun |
|---|---|---|---|
| 2026 | 3 | **Rp 11.092.890** | 100 |
| 2027 | 12 | **Rp 55.246.282** | 178 |
| 2028 | 12 | **Rp 104.662.324** | 316 |
| 2029 | 12 | **Rp 198.138.318** | 562 |
| 2030 | 12 | **Rp 372.659.229** | 1000 |
| **Total 4,2 th** | | **Rp 8.801.752.510** | |

Rata-rata 51 bulan: **Rp 172.583.383 per bulan**.

### Kapan cukup untuk gaji

| Margin/bln | Pelanggan aktif | Setara gaji per orang (bila 50:50) |
|---|---|---|
| Rp 11.092.890 (rata-rata 2026) | 100 | Rp 5.546.445 |
| Rp 55.246.282 (rata-rata 2027) | 178 | Rp 27.623.141 |
| Rp 104.662.324 (rata-rata 2028) | 316 | Rp 52.331.162 |
| Rp 198.138.318 (rata-rata 2029) | 562 | Rp 99.069.159 |
| Rp 372.659.229 (rata-rata 2030) | 1000 | Rp 186.329.614 |

**2026 tidak bisa menanggung gaji apa pun.** Mulai 2027 margin rata-rata
Rp 53,3 juta per bulan, jadi gaji Rp 25 juta per orang sudah tertutup.

### Unit economics per paket

| Paket | ARPU bruto/bln | ARPU tahunan/bln | Infrastruktur per pelanggan/bln |
|---|---|---|---|
| Basic | Rp 300.000 | Rp 285.000 | Rp 3.400 |
| Pro | Rp 500.000 | Rp 475.000 | Rp 3.400 |
| Max | Rp 1.000.000 | Rp 950.000 | Rp 3.400 |

Biaya infrastruktur per pelanggan **sama untuk ketiga paket** — karena
infrastruktur tidak membedakan fitur. Yang membedakan hanya harga. Itu sebabnya
Max menghasilkan 23,3% omzet dari 10% pelanggan.

Biaya infrastruktur per pelanggan turun seiring skala: Rp 2,6 juta di Oktober
2026 (untuk nol pelanggan) menjadi Rp 3,9 ribu per pelanggan di akhir 2030,
sementara ARPU naik 21,6% karena inflasi harga. Karena tidak ada payroll dan
tidak ada akuntansi outsourced, hampir seluruh revenue menjadi margin:
**94,4%** dalam 4,2 tahun. Yang tersisa fee Midtrans (0,69%), PPh Rezim A
(0,50%), dan biaya operasional (4,48%) — naik dari 2,09% karena add-on
domain dan legalitas membawa biaya weg yang sebelumnya nol.

---

## 5. Yang tidak ada di dokumen ini

Sengaja dikecualikan, dan sebaiknya tetap dikecualikan:

- **Pajak.** Sudah dihitung di [Bagian 9](#9-pajak-pph) dalam dua rezim.
  Yang belum: PPh Pasal 21 atas gaji sendiri, PPh Pasal 23 rekening bank,
  pajak pengalihan status perseroan, dan dampak PPN ke harga.
- **Biaya akuisisi (CAC).** Tidak ada anggaran iklan, semuanya diasumsikan
  organic atau referral. Ini asumsi yang paling berat: 1.626 orang mendaftar
  tanpa satu rupiah pun untuk iklan. Dengan margin 2026 Rp 33 juta,
  satu kali biaya akuisisi Rp 50 juta sudah menghapus laba tahun pertama.
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

Rp 6,77 miliar dari Rp 8,75 miliar terjadi pada dua tahun terakhir. Proyeksi
sangat sensitif terhadap apa pun yang menggagalkan 2029–2030. Sebaliknya,
2026–2028 hanya menghasilkan Rp 1,98 miliar pendapatan kumulatif, sementara
biaya legal dua tahun pertama saja menghabiskan Rp 7 juta dari margin itu.

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
margin 94,4% yang tampak sangat sehat. Ini kelemahan model ini yang paling
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
revenue hampir sama. Churn menentukan **berapa banyak orang yang harus
dicari** untuk mengisi posisi yang kosong. Dengan 2 orang, itu berarti waktu
penjualan yang lebih banyak — bukan margin yang lebih kecil.

Angka rekrut dihitung dengan binary search per tahun: cari rekrutan per bulan
sehingga jumlah aktif **akhir** tahun itu sama dengan target, dengan memulai
dari pelanggan akhir tahun sebelumnya.

Dua kesalahan pernah ada di sini dan keduanya menghasilkan angka yang terlihat
masuk akal. Pertama, ada versi yang menghitung rekrut dari nol tiap tahun —
sehingga tiap tahun seolah dimulai dari pelanggan kosong, dan total
kumulatifnya justru lebih besar (2.599), padahal tidak mungkin melebihi
jumlah orang yang pernah hilang. Kedua, ada versi yang menghitung rekrutan
sekali untuk seluruh masa aktif, yang hasilnya lebih kecil lagi (162). Yang
benar adalah 1.626.

Bedanya bukan pembulatan — bisa 60%. Salah satu dari ketiga angka itu pernah
tertulis di dokumen ini, dan tidak ada yang bisa tahu tanpa menghitung ulang,
karena semuanya "cukup masuk akal" dan tidak ada yang saling membandingkan.
`npm run check:proyeksi` sekarang yang membandingkan.

### ARPU — kalau bauran paket atau harga bergerak

| ARPU | Omzet 4,2 tahun |
|---|---|
| Rp 301.000 (−30%) | Rp 6.123.568.898 |
| Rp 365.500 (−15%) | Rp 7.435.762.234 |
| **Rp 430.000 (dasar)** | **Rp 8.747.955.569** |
| Rp 494.500 (+15%) | Rp 10.060.148.905 |

### Target — kalau jumlah pengrajin meleset

Angka-angka di tabel ini **dihitung ulang dengan skrip yang sama**, tapi
hasilnya berbeda dari tabel utama sekitar Rp 3 juta (0,03%). Penyebabnya
kurva dasar dokumen memakai target yang sudah dibulatkan (100, 178, 316,
562, 1000) sementara skrip memakai rasio pecahan. Selisih sekecil itu
tidak masalah untuk keputusan — tapi tabel ini **bukan** sumber angka presisi,
dan angka presisi selalu ada di Bagian 2 dan 4.

Yang diuji di sini bukan angkanya, tapi **arahnya**: apakah 2026 atau 2030
yang menentukan. Untuk itu, rasio antar tahun dikunci dan hanya kedua
ujung yang diubah.

| Skenario | Aktif akhir 2026 | Aktif akhir 2030 | Omzet 4,2 th | Margin 4,2 th |
|---|---|---|---|---|
| 2026 separuh, 2030 tercapai | 50 | 1.000 | Rp 7.227.191.829 | Rp 6.743.792.183 |
| **Dasar** | **100** | **1.000** | **Rp 9.324.560.425** | **Rp 8.798.877.037** |
| 2026 naik 50%, 2030 tercapai | 150 | 1.000 | Rp 10.980.421.276 | Rp 10.420.985.925 |
| 2026 tercapai, 2030 separuh | 100 | 500 | Rp 6.203.870.450 | Rp 5.820.666.464 |
| keduanya meleset | 50 | 500 | Rp 4.662.280.213 | Rp 4.309.696.150 |

Rentang margin Rp 4,31 miliar sampai Rp 10,42 miliar. **2030 menentukan
segala sesuatu:** skenario dengan 2030 = 1.000 selalu menang, apa pun yang
terjadi di 2026. Tahun 2026 hanya menyumbang Rp 33 juta dari Rp 8,80 miliar
— **kurang dari 0,4%**.

Artinya 2026 yang paling rapuh secara operasional justru paling tidak
berdampak secara finansial. Yang harus dijaga bukan 100 pelanggan pertama,
tapi kemampuan menjaga pertumbuhan menuju 1.000 pada 2030.

**Koreksi terhadap versi sebelumnya:** tabel lama memberi angka berbeda yang
tidak bisa direproduksi, dan label kolomnya menulis "5 th" padahal rentangnya
4,2 tahun. Keduanya sudah diperbaiki.


---

## 8. Rekomendasi

1. **Cek agregasi omzet ke konsultan pajak tahun ini.** Batas Rp 4,8 miliar
   menghitung gabungan seluruh Perseroan Perorangan Anda, bukan cuma
   FurniTech. Omzet FurniTech saja mencapai **Rp 4,68 miliar pada 2030** —
   sudah **98% dari batas itu**, dan ditambah PT Perorangan yang sudah ada,
   agregatnya menembus. Bedanya bagian Anda Rp 8,80 miliar (Rezim A) dengan
   Rp 3,12 miliar (Rezim B) — **Rp 5,68 miliar**, hampir dua kali seluruh
   margin. Ini satu-satunya hal di dokumen ini yang benar-benar menentukan
   hasil, dan hanya bisa dijawab dengan angka omzet asli Anda.
2. **Pahami ambang PPN, bukan hanya ambang PPh.** Angka Rp 4,8 miliar itu
   sekaligus ambang PKP. Melewatinya memaksa PPN 11% dari seluruh omzet —
   **Rp 515 juta pada 2030**, lebih besar dari PPh seluruhnya. Omzet FurniTech
   sendiri di 2030 sudah Rp 4,68 miliar, jadi **hampir menyentuh batas tanpa
   bantuan apa pun**. Putuskan harga paket sebelum itu terjadi.
3. **Siapkan diri untuk status jadi PT biasa kalau perlu.**
   Bila agregat omzet menembus Rp 4,8 miliar, PT Perorangan wajib berstatus
   PT biasa — bukan hanya tarif pajak yang berubah, tapi juga akta notaris,
   RUPS tahunan, dan laporan tahunan. Rencanakan transisinya sekarang, jangan menunggu
   sampai sudah di ambang.
4. **Omzet 2030 sudah 98% dari batas Rp 4,8 miliar.** Proyeksi Rp 4,68
   miliar. Tinggi 2027 saja sudah Rp 726 juta, jadi model ini tidak punya
   ruang untuk melesit di tahun-tahun akhir. Kalau 2031 sedikit meleset,
   FurniTech menembus batas sendiri.
5. **Selesaikan jalur pencairan sebelum mengejar 2027.** VA sudah berfungsi
   dan uang pengrajin sudah masuk ke rekening platform, tetapi
   `MIDTRANS_IRIS_API_KEY` masih kosong sehingga belum ada jalan
   mengembalikannya. Ini prasyarat hukum, bukan prioritas teknis akhir.
6. **Siapkan proses dukungan sebelum 2029.** 1.000 pelanggan di tangan 2
   orang adalah 500 pelanggan per orang, tanpa onboarding otomatis. Beban ini
   tidak terlihat di P&L — hanya sebagai kelelahan.
7. **Gunakan angka bulanan, bukan tahunan, untuk keputusan.** Rata-rata
   2027 Rp 55,2 juta dan 2030 Rp 372,7 juta. Melihat total lima tahun
   membuat 2026–2027 terlihat kecil padahal di situlah target 100 dan
   seluruh kurva ditentukan.
8. **Tidak ada kebutuhan modal sama sekali.** Kas never negative — bulan
   paling sempit adalah Okt 2026 dengan saldo +Rp 886.960. Tanpa add-on
   legalitas, bulan itu akan Rp -1,5 juta. Tidak perlu modal ventura, dan
   tidak ada modal yang memaksa tumbuh cepat.
9. **Paket Pendirian PT Perorangan sudah masuk proyeksi: +Rp 112 juta
   (+1,28%).** Beban Rp 150.000 per pelanggan, marjin 68,6% — dan marjin itu
   tidak bergantung pada take-up maupun churn. Yang menentukan adalah
   penempatannya: tempelkan ke wizard pendaftaran, dan buat tokonya di
   sesi yang sama. Rinciannya di
   [Bagian 11](#11-add-on-paket-pendirian-pt-perorangan--rp-500000).
10. **Tawarkan add-on domain Rp 250.000/tahun, dengan suspend otomatis.**
   Marjin Rp 61.333 per invoice (24,5%) aman dari churn karena Cloudflare
   ditagih lunas di awal — laba Rp 51 juta dalam 4,2 tahun pada take-up 60%.
   Yang menentukan bukan keuntungannya tapi kewajiban suspend: tanpa itu,
   Rp 188 juta per tahun bisa hilang dari domain yang tidak ditagih.
   Rinciannya di [Bagian 10](#10-add-on-domain-com).
10. **Hitung ulang dokumen ini setiap kali asumsi berubah.** Seluruh asumsi
   terkumpul di [Bagian 12](#12-asumsi-yang-dapat-diubah).

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
Proyeksi FurniTech sudah mencapai Rp 4,68 miliar pada 2030. Bila keduanya
berjalan bersamaan:

| Tahun | FurniTech | PT Perorangan yang sudah ada | Agregat | Batas 4,8 M? |
|---|---|---|---|---|
| 2026 | Rp 57.273.210 | perlu data Anda | — | kemungkinan ya |
| 2027 | Rp 726.103.277 | perlu data Anda | — | kemungkinan ya |
| 2028 | Rp 1.350.933.741 | perlu data Anda | — | kemungkinan ya |
| 2029 | Rp 2.513.024.996 | Rp 3,2 miliar (asumsi) | Rp 5,71 miliar | **LEWAT** |
| 2030 | Rp 4.680.592.319 | Rp 3,2 miliar (asumsi) | Rp 7,88 miliar | **LEWAT** |

Angka FurniTech di sini adalah **omzet total termasuk kedua add-on**,
bukan hanya langganan. Baris 2029 dan 2030 memakai asumsi usaha lama Anda
tetap Rp 3,2 miliar. Kalau sudah berhenti atau turun, agregatnya lebih
rendah dan Rezim A bisa bertahan lebih lama — dan dalam skenario itu
**FurniTech sendiri pun sudah Rp 4,68 miliar pada 2030, yaitu 98% dari
batas**. **Ini perlu dicek ke konsultan pajak dengan angka omzet
sebenarnya** — bukan dengan asumsi saya.

### Hitungan Rezim A — 0,5% dari omzet

| Tahun | Omzet | **PPh final 0,5%** |
|---|---|---|
| 2026 | Rp 57.273.210 | Rp 286.366 |
| 2027 | Rp 726.103.277 | Rp 3.630.516 |
| 2028 | Rp 1.350.933.741 | Rp 6.754.669 |
| 2029 | Rp 2.513.024.996 | Rp 12.565.125 |
| 2030 | Rp 4.680.592.319 | Rp 23.402.962 |
| **Total 4,2 tahun** | **Rp 9.327.927.542** | **Rp 46.639.638** |

Angka ini sudah termasuk di [Bagian 4](#4-margin-bersih-setiap-bulan) sebagai
beban, jadi margin bersih di sana **sudah setelah PPh**.

Sekitar Rp 46,6 juta selama 4,2 tahun. Itulah nilai terbesar Rezim A: pada
2030, PPh Rezim A hanya **Rp 23,4 juta**, sedangkan PPh badan 22% atas laba
Rp 4,50 miliar adalah **Rp 989 juta**. **Selisihnya 42 kali.**

### Hitungan Rezim B — badan 22%, lalu dividen 10%

Kalau agregat omzet menembus Rp 4,8 miliar, tarif badan 22% atas laba. Laba
di sini memakai **biaya yang sama seperti Bagian 4** (legal nol di 2026, root
domain termasuk, kedua add-on termasuk).

Kolom terakhir adalah pembanding: **bagian Anda kalau Rezim A masih
berlaku** — 50% dari laba setelah PPh 0,5% dari omzet. Nilainya persis
sama dengan total margin di Bagian 4, jadi perbandingannya fair.

| 2026 | Rp 57.273.210 | Rp 33.565.035 | Rp 7.384.308 | Rp 13.090.364 | Rp 1.309.036 | Rp 11.781.327 | Rp 33.278.669 |
| 2027 | Rp 726.103.277 | Rp 666.585.902 | Rp 146.648.898 | Rp 259.968.502 | Rp 25.996.850 | Rp 233.971.652 | Rp 662.955.386 |
| 2028 | Rp 1.350.933.741 | Rp 1.262.702.553 | Rp 277.794.562 | Rp 492.453.996 | Rp 49.245.400 | Rp 443.208.596 | Rp 1.255.947.884 |
| 2029 | Rp 2.513.024.996 | Rp 2.390.244.221 | Rp 525.853.729 | Rp 932.195.246 | Rp 93.219.525 | Rp 838.975.722 | Rp 2.377.679.096 |
| 2030 | Rp 4.680.592.319 | Rp 4.495.617.082 | Rp 989.035.758 | Rp 1.753.290.662 | Rp 175.329.066 | Rp 1.577.961.596 | Rp 4.472.214.120 |

| | |
|---|---|
| **Total** | **Rp 9.327.927.542** | **Rp 8.895.354.431** | **Rp 1.953.277.039** | **Rp 3.471.038.696** | **Rp 347.103.870** | **Rp 3.123.934.826** | **Rp 8.801.752.510** |

Dividen yang diterima WP Orang Pribadi dalam negeri dikenai PPh final 10%
(PP 55/2022 Pasal 23 huruf m). Karena itu kolom "Anda net" adalah **setelah**
pajak.

Bandingkan dengan Rezim A: bagian Anda **Rp 8.801.752.510** dengan
Rezim B **Rp 3.123.934.826**. Selisihnya **Rp 5,68 miliar** dalam 4,2
tahun — hampir dua kali seluruh margin di Rezim A.

Angka ini lebih besar dari klaim "Rp 320 juta" yang sebelumnya tertulis,
karena klaim itu membandingkan dua hal yang berbeda: margin SEBELUM pajak
pribadi dengan bagian SETELAH pajak. Yang fair hanya kolom terakhir pada
kedua rezim — dan itulah yang ditulis di sini.

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

**3. PPN 11% hampir pasti terjadi.** Omzet Rp 4,8 miliar itu sekaligus
ambang PKP. Proyeksi FurniTech sendiri di 2030 adalah Rp 4,68 miliar — **98%
dari batas**, tanpa bantuan apa pun. Pada omzet itu, PPN 11% adalah
**Rp 515 juta per tahun**, lebih besar dari PPh seluruhnya. Dengan asumsi
bisnis lama tetap Rp 3,2 miliar, batas itu terlampaui sudah di 2029.

Perlu dikonfirmasi ke konsultan pajak: ada pengecualian untuk transaksi
tertentu, dan transaksi lewat payment gateway atau marketplace punya
aturan tersendiri. Konsekuensi praktisnya bukan cuma pajak, tapi apakah
harga paket Rp 300.000, Rp 500.000, dan Rp 1.000.000 masih bisa
dipertahankan setelah PPN masuk. Itu keputusan yang lebih besar daripada
besarnya PPh.

### Yang belum dihitung

- **PPh Pasal 21 atas gaji Anda sendiri.** Kalau gaji ini resmi sebagai
  gaji direktur, PPh Pasal 21 berlaku dan tarifnya bergantung pada skema
  pengajaian. Rp 5 juta per bulan berada di bawah PTKP bulanan
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

## 10. Domain: subdomain gratis & add-on .com

### Root domain: `mebeltech.com`

Ditetapkan pemilik produk pada 2026-09-28. **`.com` dipilih, bukan `.id`
maupun `.co.id`** — satu-satunya alasan adalah `.id` dan `.co.id` butuh
verifikasi legalitas usaha di Pornas, dan FurniTech belum punya akta
perusahaan untuk itu. `.com` tidak butuh apa pun.

Status availability, dicek ke **RDAP Verisign (registry `.com` resmi, bukan
Cloudflare dan bukan registrar)** pada 2026-09-28:

```
https://rdap.verisign.com/com/v1/domain/mebeltech.com  ->  HTTP 404
https://rdap.verisign.com/com/v1/domain/google.com     ->  HTTP 200
```

HTTP 404 dari registry berarti **domain-nya belum terdaftar sama sekali** —
bukan sekadar tidak dipakai orang. Ini informasi yang lebih baik dari
"belum ada yang pakai di Cloudflare": kalau sudah terdaftar tapi tidak
di-pointing, namanya sudah dimiliki orang lain dan tidak bisa diambil.

| | Nilai |
|---|---|
| Root domain | `mebeltech.com` |
| Status | **Belum terdaftar** — tersedia didaftarkan |
| Subdomain tenant | `tokonya.mebeltech.com` |
| Platform | `mebeltech.com` |
| Biaya pendaftaran | ~Rp 190.000 (sekali, dihitung sebagai biaya 2026) |
| Biaya hosting | Rp 0 — Vercel Hobby |
| Renewal/tahun | ~Rp 190.000, mulai 2027 |

Pendaftaran domain root adalah **biaya satu kali**, masuk ke pengeluaran 2026
bukan ke biaya berulang. `NEXT_PUBLIC_ROOT_DOMAIN` harus diisi `mebeltech.com`
dan **build ulang wajib dilakukan** — `NEXT_PUBLIC_*` di-inline saat build, jadi
restart saja tidak berpengaruh sama sekali.

Selama `NEXT_PUBLIC_ROOT_DOMAIN` kosong, mode path-based `/t/<slug>` tetap
aktif dan `mebeltech.com` tidak dipakai. Keduanya boleh hidup berdampingan:
`/t/tokonya` tetap berfungsi sebagai jalur cadangan kalau DNS gagal.

### Dua lapisan domain

| | Subdomain (gratis) | Custom domain (add-on) |
|---|---|---|
| Bentuk | `tokonya.mebeltech.com` | `tokonya.com` |
| Biaya FurniTech | **Rp 0** | Rp 188.667/tahun |
| Harga ke pengrajin | **Rp 0 — sudah termasuk semua paket** | **Rp 250.000/tahun** |
| Dibayar | — | Sekali di awal, berlaku 12 bulan, **auto renewal** |
| Perlu DNS | tidak | ya (CNAME + TXT verifikasi) |
| Bisa hilang | tidak pernah | ya, kalau berhenti bayar |

**Paket Basic sudah mendapat `tokonya.mebeltech.com` gratis.** Itu keputusan
produk, bukan alasan teknis: tanpa subdomain gratis, paket termurah
Rp 300.000 terlihat seperti tidak memberi apa-apa, dan "custom domain" di
tabel fitur Basic berarti sesuatu yang sangat berbeda dari yang asli.

Yang dijual adalah **pilihan untuk memakai nama sendiri**, bukan kemampuan
punya domain. Kemampuan itu sudah gratis.

### Auto renewal: satu harga, dibayar di muka, berulang

```
saat pendaftaran : Rp 250.000 dibayar, berlaku 12 bulan
setiap 12 bulan  : Rp 250.000 dibayar lagi, berlaku 12 bulan berikutnya
suspend          : 3 bulan tidak dibayar -> domain nonaktif
```

Biaya Cloudflare ditagih **lunas di muka** saat periode dimulai. Tidak ada
prorata dan tidak ada pengembalian kalau dibatalkan di tengah jalan. Ini
yang membuat add-on aman terhadap churn — pelanggan yang berhenti di bulan
ke-5 tetap menghasilkan marjin penuh, karena 12 bulan biayanya sudah
terbayar.

### Yang harus ada supaya auto renewal tidak jadi kebocoran

| Kebutuhan | Tanpa ini |
|---|---|
| Invoice tahunan dibuat otomatis saat `periodEnd` lewat | 1.000 domain tidak pernah ditagih = **Rp 188 juta/tahun hilang** |
| Suspend otomatis setelah 3 bulan tidak dibayar | Domain aktif menanggung biaya tanpa income |
| Invoice hanya dibuat setelah `customDomainVerified = true` | Menagih orang yang tokonya belum bisa diakses lewat domain itu |

Tanpa suspend otomatis, add-on domain berubah dari pendapatan Rp 231 juta
menjadi beban Rp 188 juta. Model berulang bukan cuma lebih untung — lebih aman.

### Harga Cloudflare (diambil 28 September 2026)

Cloudflare menjual **harga cost** — persis biaya registry plus ICANN fee $0,18,
tanpa markup. Tidak ada harga first-year yang menggoda, jadi tidak ada jebakan
renewal. Sumber: `cfdomainpricing.com/prices.json`.

| TLD | Registrasi | Renewal | Keterangan |
|---|---|---|---|
| **.com** | **$10,46** | **$10,46** | **Rp 188.667/tahun** (kurs Rp 18.037). Flat selamanya. |
| .net | $11,86 | $11,86 | Rp 213.919/tahun |
| .org | $8,50 | $11,20 | Registrasi murah, renewal lebih mahal |
| .app | $14,20 | $14,20 | Rp 256.125/tahun |
| .shop | $30,20 | $30,20 | Rp 544.717/tahun — mahal untuk SMB |
| .store | $4,99 | **$42,20** | Renewal 8,5× lebih mahal — jebakan |
| .site / .online | $4,99 | $27,70 | Sama, jebakan renewal |

Hanya `.com` yang dipakai karena satu alasan tambahan: **biaya renewal-nya
paling rendah di antara pilihan yang masuk akal**, dan tidak pernah naik.

### Economics

```
harga jual        Rp 250.000/tahun
biaya Cloudflare  Rp 188.667/tahun
marjin            Rp  61.333/tahun  (32% di atas biaya)
```

### Biaya Cloudflare dibayar lunas di awal

Cloudflare Registrar menagih **sekali di awal**, lalu berlaku 12 bulan.
Tidak ada prorata, tidak ada pengembalian kalau dibatalkan di tengah jalan.

```
biaya per invoice = Rp 188.667  (SEKALI, di bulan 0)
                    bukan Rp 15.722 x jumlah bulan aktif
```

Ini yang membuat add-on domain aman terhadap churn:

| Skenario | Terima | Biaya | Hasil |
|---|---|---|---|
| Pelanggan tetap 12 bulan | Rp 250.000 | Rp 188.667 | **Rp 61.333** |
| Pelanggan churn bulan ke-5 | Rp 250.000 | Rp 188.667 | **Rp 61.333** |
| Pelanggan churn bulan ke-1 | Rp 250.000 | Rp 188.667 | **Rp 61.333** |

**Marjin per invoice selalu Rp 61.333, berapa pun lamanya pelanggan
bertahan.** Churn hanya mengurangi jumlah invoice, tidak pernah mengurangi
marjin per invoice.

### Dampak ke proyeksi (take-up 60%)

| Komponen | 4,2 tahun |
|---|---|
| Omzet langganan | Rp 8.747.955.569 |
| **Omzet add-on domain** | **Rp 417.343.184** |
| Fee Midtrans | −Rp 61.368.715 |
| PPh final 0,5% (termasuk omzet domain) | −Rp 45.826.494 |
| Infrastruktur | −Rp 166.394.420 |
| Legal dan admin | −Rp 16.500.000 |
| Root domain `mebeltech.com` | −Rp 943.335 |
| **Biaya domain Cloudflare** | **−Rp 184.096.134** |
| **Omzet paket pendirian PT** | **+Rp 162.628.789** |
| Beban paket pendirian PT (PNBP Rp 50.000 + operasional Rp 100.000) | **−Rp 48.788.637** |
| Fee Midtrans invoice legalitas (Rp 4.440 × 325) | **−Rp 1.444.144** |
| **Margin bersih** | **Rp 8.801.752.510** |

Tanpa add-on, marginnya Rp 8.460.276.826. Jadi add-on menambah
**Rp 231.158.800 (+2,73%)** dan menaikkan margin per bulan dari
Rp 165.887.781 menjadi **Rp 170.401.810**.

Rinciannya sudah masuk ke tabel 51 bulan di Bagian 2 — kolom
"Omzet domain" dan "Biaya domain".

### Harga impas

| Harga | Laba (take-up 60%) | Marjin |
|---|---|---|
| Rp 150.000 | −Rp 32.257.153 | −25,8% |
| **Rp 188.667** | **Rp 0** | **0,0%** |
| Rp 200.000 | Rp 9.454.302 | 5,7% |
| **Rp 250.000** | **Rp 51.165.757** | **24,5%** |
| Rp 300.000 | Rp 92.877.212 | 37,1% |

Impas tepat di harga biaya, dan **tidak bergantung pada churn sama sekali**.

### Koreksi: versi sebelumnya salah hitung

Versi dokumen ini sebelumnya menyatakan marjin 2,0% dan "harga impas
Rp 245.000", dengan alasan bahwa biaya harus "menutup 15,6 bulan". Itu salah:
biaya Cloudflare **dibayar lunas di awal**, bukan dihitung per bulan aktif.
Angka yang benar adalah **laba Rp 51.165.757 dengan marjin 24,5%**, dan
harga impasnya persis Rp 188.667.

Kesimpulan yang benar: **Rp 250.000 bukan "hampir pas di batas impas" —
ia memberi jarak Rp 61.333 di atas biaya, dan jarak itu tidak terkikis oleh
churn.**

### Yang benar-benar perlu diwaspadai

Risikonya bukan churn. Risikonya **domain aktif yang tidak pernah ditagih
lagi**:

```
1.000 domain aktif tapi tidak ditagih = Rp 188.667.020 per tahun
```

Itu **3,3 kali lebih besar** dari laba add-on di take-up 60%. Domain yang
tetap berjalan tanpa pembayaran adalah biaya berulang, bukan sekali
bayar.

Dua penangkal yang wajib ada:

1. **Invoice tahunan dibuat otomatis** saat `periodEnd` lewat — bukan
   dihitung manual.
2. **Suspend otomatis** kalau 3 bulan tidak dibayar. Tanpa ini, model
   "bayar sekali di bulan 1" akan menimbulkan persis kebocoran ini.

Kedua hal ini membuat model tagih berulang **tidak hanya lebih untung, tapi
juga lebih aman.**

### Rekomendasi

**Harga Rp 250.000 adalah pilihan yang tepat, dan alasannya lebih kuat dari
yang saya kira sebelumnya.**

Marjin per invoice Rp 61.333 (24,5%) tidak tergerus oleh churn berapa pun,
karena Cloudflare ditagih lunas di awal. Yang perlu dijaga cuma dua hal:

1. **Invoice tahunan dibuat otomatis** saat `periodEnd` lewat, dan
   **domain di-suspend otomatis** kalau 3 bulan tidak dibayar.
2. **Invoice hanya dibuat setelah domain terverifikasi**
   (`customDomainVerified = true`). Kalau belum, jangan tagih — kalau tidak,
   Anda menagih orang yang tokonya belum bisa diakses lewat domain itu.

Kalau dua hal itu tidak bisa dikerjakan, **jangan tawarkan sama sekali** —
bukan karena keuntungannya kecil, tapi karena tanpa suspend otomatis,
1.000 domain yang tidak ditagih akan memakan Rp 188 juta per tahun.

### Yang belum dihitung di dokumen ini

Angka-angka di bagian ini **sudah masuk** ke proyeksi margin di Bagian 2 dan 4
dengan asumsi take-up 60%. Kalau ternyata take-up riil lebih rendah
(misalnya 30%), margin dari add-on domain turun dari Rp 102 juta menjadi
Rp 51 juta — jadi total margin turun **Rp 51 juta**. Masih positif, karena
marjin per invoice tidak bergantung pada take-up.

Nilai sebenarnya dari add-on domain bukan uangnya. Yang bernilai adalah
pengikatannya: pengrajin yang sudah membayar domain 12 bulan punya alasan
untuk tidak menutup tokonya bulan depan. Kalau efeknya ke churn terukur,
nilai itu jauh lebih besar dari Rp 231 juta.

---

## 11. Add-on "Paket Pendirian PT Perorangan" — Rp 500.000

Ditetapkan pemilik produk 2026-09-28. **Sudah masuk ke proyeksi margin di
Bagian 2 dan 4** dengan take-up 20%.

Namanya ditutup sebagai **"Paket Pendirian PT Perorangan"**, bukan "Jasa
Legalitas PT Perorangan". Alasannya bukan selera copywriting: "Paket"
menyatakan apa yang dibeli tanpa mengklaim keahlian, "Pendirian" adalah kata
yang benar-benar dicari pemilik usaha, dan "Legalitas" memunculkan pertanyaan
yang tidak perlu muncul sebelum orang menekan beli — *apakah mereka
pengacara?* Isinya semuanya administrasi.

### Isi paket & beban

| Komponen | Keterangan | Beban |
|---|---|---|
| PNBP AHU |PP 30/2026 pasal 33, dibayar ke negara | **Rp 50.000** |
| Jasa pembuatan logo | dikerjakan sendiri | termasuk |
| Ongkos pengurusan (transport, bolak-balik, loket) | | **Rp 100.000** |
| **Total beban per pelanggan** | | **Rp 150.000** |

Sumber tarif PNBP: **PP 30/2026** (berlaku 1 Agustus 2026), pasal 33 —
*"Pendaftaran Pendirian Perseroan Perorangan untuk Usaha Mikro dan Kecil,
per permohonan 50.000,00"*. Dikonfirmasi juga di portal resmi Ditjen AHU:
Rp 50.000,00 per permohonan, jangka waktu **real time**.

```
Harga jual              Rp 500.000
Beban per pelanggan     Rp 150.000
─────────────────────────────
Margin kotor            Rp 350.000   (70%)

Dikurangi fee Midtrans Rp 4.440 per invoice -> Rp 345.560
 Dikurangi PPh 0,5% dari omzet             -> margin bersih ±68,6%
```

Fee Midtrans Rp 4.440 **tidak bisa diabaikan**: add-on ini memakai jalur
tagihan yang sama dengan langganan, dan pada tagihan langganan fee itu
ditanggung FurniTech (§2.C). Tanpa dikurangkan, margin add-on jadi 70%
dan bukan 68,6%.

### Koreksi: tidak ada "Akta Perusahaan"

Daftar awal menyebut "Akta Perusahaan". **Dokumen itu tidak ada untuk PT
Perorangan** dan tidak akan pernah terbit:

- PT Persekutuan Modal → akta notaris, wajib.
- **PT Perorangan → Pernyataan Pendirian yang diisi sendiri secara elektronik
  di SABH.** Tidak ada notaris, tidak ada akta.

Kwitansi resmi Ditjen AHU: *"Pendirian sangat mudah, bisa dilakukan sendiri
secara online (tidak perlu ke notaris)."*

Kalau FurniTech menjanjikan "Akta Perusahaan", pelanggan akan menagih dokumen
yang tidak pernah ada, dan klaim legalitasnya jadi tidak bisa dipertanggungjawabkan.
Yang benar dan setara nilainya: **Pernyataan Pendirian (e-Akta) + Sertifikat
Pendaftaran Perseroan Perorangan**.

### Dampak ke proyeksi (take-up 20%)

Add-on ini **sudah masuk** ke proyeksi margin di Bagian 2 dan 4, dengan
asumsi take-up 20% dari pelanggan yang merekrut. 20% adalah angka tebakan
saya — tidak ada data, dan tidak ada yang pernah menjual produk ini.

Take-up dihitung dari **rekrut**, bukan dari pelanggan aktif: add-on ini
sekali bayar, jadi hanya relevan di bulan-bulan ada yang mendaftar.

| Take-up | Order | Omzet | Beban (Rp150.000) | Fee 4.440 | PPh 0,5% | **Margin** | Marjin |
|---|---|---|---|---|---|---|---|
| 10% | 163 | Rp 81.314.395 | Rp 24.394.318 | Rp 722.072 | Rp 406.572 | **Rp 55.791.432** | 68,6% |
| **20% (dasar)** | **325** | **Rp 162.628.789** | **Rp 48.788.637** | **Rp 1.444.144** | **Rp 813.144** | **Rp 111.582.865** | **68,6%** |
| 30% | 488 | Rp 243.943.184 | Rp 73.182.955 | Rp 2.166.215 | Rp 1.219.716 | **Rp 167.374.297** | 68,6% |
| 50% | 813 | Rp 406.571.973 | Rp 121.971.592 | Rp 3.610.359 | Rp 2.032.860 | **Rp 278.957.162** | 68,6% |

Marjin **tidak bergantung pada take-up** — 68,6% di semua baris, karena harga
dan beban sama-sama per pelanggan. Take-up hanya menentukan banyaknya order.
Skuforge juga tidak bergantung pada churn: pelanggan yang turun di bulan
ke-5 tetap menghasilkan margin penuh, karena biayanya sudah dibayar saat
order masuk.

### Dampak ke margin total

| | Tanpa add-on | Dengan add-on (20%) |
|---|---|---|
| Margin 4,2 tahun | Rp 8.690.492.291 | **Rp 8.801.752.510** |
| Rata-rata per bulan | Rp 170.401.810 | **Rp 172.583.383** |
| **Delta** | | **+Rp 111.582.865 (+1,28%)** |

Porsi per tahun:

| Tahun | Margin total/bln | Dari legalitas | Porsi |
|---|---|---|---|
| 2026 | Rp 20.943.596 | Rp 7.343.037 | **22,1%** |
| 2027 | Rp 57.240.800 | Rp 9.099.803 | 1,4% |
| 2028 | Rp 104.649.700 | Rp 16.127.274 | 1,3% |
| 2029 | Rp 198.138.318 | Rp 28.715.163 | 1,2% |
| 2030 | Rp 372.659.229 | Rp 51.110.732 | 1,1% |

**2026 porsi 22,1% — dan itu bukan kebetulan.** Masteran: 87 orang mendaftar
dalam 3 bulan pertama, dan legalitas thawed di bulan yang sama. Setelah itu
porsi turun ke 1,1–1,4% karena add-on hanya diambil oleh yang baru
mendaftar, sementara margin yang lain tumbuh dari kohort lama.

Konsekuensinya: **add-on ini menutup hampir seperempat margin 2026, dan
hanya 1,1% dari margin 2030.** Kalau 2026 adalah tahun yang paling
berisiko (Bagian 6 butir 2), ini membantu. Tapi jangan disamakan dengan selesai: di 2030 tambahan
Rp 51 juta tidak mengubah keputusan apa pun.

### Ini produk bertiket, bukan langganan

Add-on domain menghasilkan **Rp 231 juta** dan add-on legalitas
**Rp 112 juta** — tapi keduanya berbeda sifat:

| | Add-on domain | Add-on legalitas |
|---|---|---|
| Berulang | ya, tiap 12 bulan | **tidak, sekali** |
| Ikatan ke FurniTech | 12 bulan ke depan | **tidak ada** |
| Sumber di bulan 2030 | renewal kohort lama | **rekrut bulan itu saja** |

Kalau rekrut melambat karena alasan apa pun, add-on legalitas langsung
ikut turun — sementara langganan dan domain masih jalan. Yang menghidrolisis
adalah **rekrutan, bukan pelanggan**, dan rekrutan adalah hal yang paling
rentan di model ini.

### Risiko hukum yang harus dicatat

**UU 18/2003 tentang Advokat, Pasal 1:** *"Setiap orang yang dengan sengaja
menjalankan pekerjaan profesi Advokat dan bertindak seolah-olah sebagai
Advokat, tetapi bukan Advokat, dipidana dengan pidana penjara paling lama
5 (lima) tahun dan denda paling banyak Rp 50.000.000,00."*

Batasnya nyata dan tidak kabur:

| Boleh | Tidak boleh |
|---|---|
| Mengisi formulir pendaftaran atas nama pelanggan | Memberikan nasihat hukum |
| Mengecek ketersediaan nama di AHU | Menentukan strategi hukum |
| Mempilih KBLI yang sesuai jenis usaha | Menafsirkan aturan yang ambigu |
| Mengurus NIB & NPWP di OSS | Mewakili klien dalam sengketa |
| Membuat logo | Menjanjikan hasil hukum |

Semua pekerjaan di paket ini ada di kolom kiri. **Tidak ada satu pun di kolom
kanan.** Pengisian formulir administratif bukan praktik Advokat.

ITU ALASAN NAMA DIGANTI. Nama aslinya adalah "Jasa Legalitas PT Perorangan",
dan kata "legalitas" dalam kosa kata orang adalah domain Advokat, bukan
domain administrasi. UMKM tidak melihat perbedaan itu. Risiko reputasinya
nyata meskipun unsurnya secara yuridis tidak ada.

**Yang paling mungkin terjadi bukan hukum, tapi praktis:** pelanggan
membaca "legalitas", lalu cerita ke pengrajin berikutnya, dan ekspektasinya
naik ke "masalah perusahaan juga ikut ditangani". Di titik itu FurniTech
menang Rp 450.000 dan kehilangan pelanggan.

### Rekomendasi

1. **Nama sudah diganti jadi "Paket Pendirian PT Perorangan".** Diterima
   2026-09-28. "Paket" menyatakan apa yang dibeli tanpa mengklaim keahlian;
   "Pendirian" adalah kata yang benar-benar dicari pemilik usaha.
2. **Jangan jual terpisah.** Tempelkan ke wizard pendaftaran sebagai biaya
   sekali bayar, seperti pada butir 3. Tanpa itu, FurniTech mendapat
   Rp 350.000 tanpa hubungan apa pun dengan produknya.
3. **Cantumkan batasnya di halaman.** Satu kalimat — *"Pelayanan
   administrasi dan pengurusan dokumen, bukan konsultasi hukum"* — menghapus
   sebagian besar risiko dan menambah kredibilitas di mata pembeli.
4. **Kalau nanti isinya berkembang jadi nasihat hukum,** ikat ke
   Advokat/Notaris rekanan dan biarkan mereka yang menandatangani. Margin
   turun, risiko hilang.
5. **Rincian beban harus bisa ditunjukkan.** Rp 100.000 ongkos
   pengurusan dan Rp 50.000 PNBP bukan angka yang boleh disembunyikan di
   balik "Rp 500.000". Kalau ditanya, FurniTech harus bisa menjawab
   "Rp 150.000 untuk negara, sisanya untuk pengurusan" — dan jawaban itu
   jauh lebih kuat daripada sekadar menyebut harga.

### Yang belum dihitung

- **Take-up 20% adalah tebakan.** Tidak ada data, tidak ada produk ini pernah
  dijual. Sensitivitasnya ada di tabel di atas: 10% memberi Rp 55,8 juta,
  50% memberi Rp 279 juta. Yang tidak bisa dihitung dari dokumen ini adalah
  berapa lama pengurusan benar-benar memakan waktu per pelanggan — kalau
  3 jam, `beban` Rp 100.000 itu murah kalau horario penuh Rp 300.000, dan
  mahal kalau hanya 30 menit.
- **Logo.** Dihitung Rp 0 karena dikerjakan sendiri. Kalau ini nanti
 elette jadi template yang dikerjakan lebih rapi, biayanya mungkin Rp 50.000
  per order dan marjin turun ke 58%.

## 12. Asumsi yang dapat diubah

| Asumsi | Nilai | Sumber |
|---|---|---|
| Badan hukum | PT Perorangan yang sudah ada, tidak diubah | **keputusan Anda** |
| Jumlah pengoper | 2 orang | **keputusan Anda** |
| Gaji masuk P&L | tidak ada, tidak dihitung | **keputusan Anda** |
| Admin dikerjakan | berdua, tanpa outsourcing | **keputusan Anda** |
| HRESULT | Rp 430.000 per pelanggan per bulan | hitungan dari `src/lib/plans.ts` |
| Bauran paket | 60 / 30 / 10 | **asumsi Anda** |
| Porsi bayar tahunan | 30% | **asumsi saya** |
| Churn | 3% per bulan | **asumsi Anda** — lihat catatan di Bagian 10 |
| Add-on "Paket Pendirian PT Perorangan" | Rp 500.000 sekali, beban Rp 150.000 | **keputusan Anda** — sudah masuk proyeksi, Bagian 11 |
| Take-up paket pendirian PT | 20% dari rekrut | **asumsi saya** — tanpa data |
| Ongkos pengurusan per pelanggan | Rp 100.000 | **keputusan Anda** |
| Take-up add-on domain | 60% pelanggan, Rp 250.000/tahun | **asumsi saya** |
| Inflasi harga | 5% per tahun | **asumsi Anda** |
| Kurs USD | **Rp 18.037** | harga real-time 28 Sep 2026 |
| Interpolasi 2027–2029 | geometris ×1,7783 per tahun | hitungan |
| Legal dan admin | **Rp 0 (2026)** → 3,5–5 jt/tahun, tanpa domain | **angka tebakan saya** |
| Root domain | Rp 188.667/tahun, 5 tahun = Rp 943.335 | **harga Cloudflare** |
| Jam CPU Vercel | **0,3 jam per pelanggan aktif per bulan** | **angka tebakan saya** |
| PITR Supabase | **aktif sejak Okt 2026** ($100/bln) | keputusan Anda |
| Fonnte | tidak dipakai | `PRD.md` v1.3 (fakta) |
| Domain .com (infrastruktur) | $0,87/bln, domain FurniTech sendiri | keputusan Anda |
| Domain .com (add-on pelanggan) | **Rp 250.000/tahun, flat, bayar di muka, auto renewal** | **keputusan Anda** |
| Root domain | `mebeltech.com` (belum terdaftar) | **keputusan Anda** |
| Subdomain gratis | `tokonya.mebeltech.com` di semua paket | **keputusan Anda** |
| Suspend domain | 3 bulan tidak dibayar | **keputusan Anda** |
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

Koreksi ketiganya masuk di versi ini. Asumsi jam CPU per tahun (600, 900,
280, 650, 1.500) diganti jadi **0,3 jam per pelanggan aktif per bulan**,
karena angka per tahun itu melonjak-turun tanpa alasan yang bisa dijelaskan
— 900 jam CPU di 2027 dengan 178 pelanggan tidak masuk akal. Dengan model
berbasis pelanggan, biaya CPU tidak pernah melonjak.

Koreksi keempat: kurs dinaikkan dari **Rp 16.000 ke Rp 18.037/USD** — harga
real-time yang Anda cek pada 28 September 2026. Ini menaikkan total
infrastruktur dari Rp 147.315.186 menjadi Rp 166.394.420, dan menurunkan
margin bersih sebesar Rp 18,8 juta (0,22%). Dampak kecil karena
infrastruktur cuma 2% dari pendapatan.
