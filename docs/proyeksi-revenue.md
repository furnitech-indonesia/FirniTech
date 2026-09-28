# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 10](#10-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **margin bersihnya naik dari Rp 7,7 juta per bulan
di 2026 menjadi Rp 359,7 juta per bulan di 2030, total Rp 8,48 miliar dalam
4,2 tahun (96,9% dari omzet)** — karena tidak ada gaji di P&L, tidak ada
biaya legal di 2026, admin dikerjakan berdua, dan PPh cukup 0,5% dari omzet
lewat Rezim A Perseroan Perorangan. Kebutuhan modal hanya sekitar Rp 2,4 juta,
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
| **Basic** | Rp 3.661.934.889 | Rp 36.821.229 | Rp 18.309.674 | Rp 76.630.893 | **Rp 3.530.173.093** | 41,7% |
| **Pro** | Rp 3.051.612.408 | Rp 18.410.614 | Rp 15.258.062 | Rp 63.859.077 | **Rp 2.954.084.654** | 34,9% |
| **Max** | Rp 2.034.408.272 | Rp 6.136.871 | Rp 10.172.041 | Rp 42.572.718 | **Rp 1.975.526.641** | 23,4% |
| **Total** | **Rp 8.747.955.569** | **Rp 61.368.715** | **Rp 43.739.778** | **Rp 163.815.186** | **Rp 8.479.031.890** | 100% |

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
| **Total** | 100% | 1626 | 1.000 | 626 |

### Ringkasan per bulan

| Tahun | Bln | **Margin bersih/bln** | Pelanggan akhir tahun |
|---|---|---|---|
| 2026 | 3 | **Rp 7.746.231** | 99.99999999999994 |
| 2027 | 12 | **Rp 53.167.042** | 177.9999999999999 |
| 2028 | 12 | **Rp 100.819.806** | 315.9999999999998 |
| 2029 | 12 | **Rp 190.992.531** | 561.9999999999993 |
| 2030 | 12 | **Rp 359.670.054** | 999.9999999999986 |

Rata-rata 51 bulan: **Rp 166.255.527 per bulan**.

### Total 4,2 tahun

| Komponen | Jumlah |
|---|---|
| Omzet bruto | Rp 8.747.955.569 |
| Fee Midtrans | −Rp 61.368.715 |
| PPh final 0,5% | −Rp 43.739.778 |
| Infrastruktur | −Rp 147.315.186 |
| Legal dan admin (2027–2030 saja) | −Rp 16.500.000 |
| **Margin bersih** | **Rp 8.479.031.890 (96,9% dari omzet)** |

### Rincian 51 bulan

Biaya legal **tidak ada di 2026** — hanya muncul 2027 sampai 2030.

| Bulan | Aktif | Omzet | Fee | PPh 0,5% | Infrastruktur | Legal | **Margin** |
|---|---|---|---|---|---|---|---|
| Okt 2026 | 34 | Rp 0 | Rp 0 | Rp 0 | Rp 2.333.920 | Rp 0 | **Rp -2.333.920** |
| Nov 2026 | 68 | Rp 10.340.445 | Rp 106.771 | Rp 51.702 | Rp 2.333.920 | Rp 0 | **Rp 7.848.051** |
| Des 2026 | 100 | Rp 20.370.676 | Rp 210.339 | Rp 101.853 | Rp 2.333.920 | Rp 0 | **Rp 17.724.563** |
| Jan 2027 | 108 | Rp 186.018.000 | Rp 444.000 | Rp 930.090 | Rp 2.333.920 | Rp 291.667 | **Rp 182.018.323** |
| Feb 2027 | 115 | Rp 34.020.609 | Rp 334.555 | Rp 170.103 | Rp 2.333.920 | Rp 291.667 | **Rp 30.890.364** |
| Mar 2027 | 122 | Rp 36.363.749 | Rp 357.597 | Rp 181.819 | Rp 2.333.920 | Rp 291.667 | **Rp 33.198.746** |
| Apr 2027 | 129 | Rp 38.636.595 | Rp 379.948 | Rp 193.183 | Rp 2.333.920 | Rp 291.667 | **Rp 35.437.877** |
| Mei 2027 | 136 | Rp 40.841.256 | Rp 401.628 | Rp 204.206 | Rp 2.333.920 | Rp 291.667 | **Rp 37.609.834** |
| Jun 2027 | 143 | Rp 42.979.776 | Rp 422.658 | Rp 214.899 | Rp 2.333.920 | Rp 291.667 | **Rp 39.716.633** |
| Jul 2027 | 149 | Rp 45.054.142 | Rp 443.057 | Rp 225.271 | Rp 2.333.920 | Rp 291.667 | **Rp 41.760.227** |
| Agu 2027 | 155 | Rp 47.066.276 | Rp 462.844 | Rp 235.331 | Rp 2.333.920 | Rp 291.667 | **Rp 43.742.513** |
| Sep 2027 | 161 | Rp 49.018.046 | Rp 482.038 | Rp 245.090 | Rp 2.333.920 | Rp 291.667 | **Rp 45.665.331** |
| Okt 2027 | 167 | Rp 50.911.263 | Rp 500.656 | Rp 254.556 | Rp 2.333.920 | Rp 291.667 | **Rp 47.530.465** |
| Nov 2027 | 173 | Rp 52.747.684 | Rp 518.715 | Rp 263.738 | Rp 2.333.920 | Rp 291.667 | **Rp 49.339.644** |
| Des 2027 | 178 | Rp 54.529.012 | Rp 536.232 | Rp 272.645 | Rp 2.333.920 | Rp 291.667 | **Rp 51.094.548** |
| Jan 2028 | 192 | Rp 347.667.642 | Rp 790.320 | Rp 1.738.338 | Rp 3.069.920 | Rp 291.667 | **Rp 341.777.397** |
| Feb 2028 | 205 | Rp 63.557.202 | Rp 595.252 | Rp 317.786 | Rp 3.069.920 | Rp 291.667 | **Rp 59.282.578** |
| Mar 2028 | 217 | Rp 67.910.036 | Rp 636.019 | Rp 339.550 | Rp 3.069.920 | Rp 291.667 | **Rp 63.572.880** |
| Apr 2028 | 230 | Rp 72.132.285 | Rp 675.563 | Rp 360.661 | Rp 3.069.920 | Rp 291.667 | **Rp 67.734.474** |
| Mei 2028 | 242 | Rp 76.227.866 | Rp 713.920 | Rp 381.139 | Rp 3.069.920 | Rp 291.667 | **Rp 71.771.220** |
| Jun 2028 | 253 | Rp 80.200.580 | Rp 751.127 | Rp 401.003 | Rp 3.069.920 | Rp 291.667 | **Rp 75.686.863** |
| Jul 2028 | 265 | Rp 84.054.112 | Rp 787.218 | Rp 420.271 | Rp 3.069.920 | Rp 291.667 | **Rp 79.485.037** |
| Agu 2028 | 275 | Rp 87.792.038 | Rp 822.226 | Rp 438.960 | Rp 3.069.920 | Rp 291.667 | **Rp 83.169.266** |
| Sep 2028 | 286 | Rp 91.417.827 | Rp 856.183 | Rp 457.089 | Rp 3.069.920 | Rp 291.667 | **Rp 86.742.968** |
| Okt 2028 | 296 | Rp 94.934.842 | Rp 889.122 | Rp 474.674 | Rp 3.069.920 | Rp 291.667 | **Rp 90.209.458** |
| Nov 2028 | 306 | Rp 98.346.346 | Rp 921.073 | Rp 491.732 | Rp 3.069.920 | Rp 291.667 | **Rp 93.571.955** |
| Des 2028 | 316 | Rp 101.655.505 | Rp 952.065 | Rp 508.278 | Rp 3.069.920 | Rp 291.667 | **Rp 96.833.576** |
| Jan 2029 | 340 | Rp 648.068.110 | Rp 1.403.040 | Rp 3.240.341 | Rp 3.069.920 | Rp 375.000 | **Rp 639.979.810** |
| Feb 2029 | 363 | Rp 118.508.009 | Rp 1.057.047 | Rp 592.540 | Rp 3.069.920 | Rp 375.000 | **Rp 113.413.502** |
| Mar 2029 | 386 | Rp 126.655.378 | Rp 1.129.719 | Rp 633.277 | Rp 3.069.920 | Rp 375.000 | **Rp 121.447.463** |
| Apr 2029 | 408 | Rp 134.558.326 | Rp 1.200.210 | Rp 672.792 | Rp 3.069.920 | Rp 375.000 | **Rp 129.240.405** |
| Mei 2029 | 430 | Rp 142.224.186 | Rp 1.268.586 | Rp 711.121 | Rp 3.069.920 | Rp 375.000 | **Rp 136.799.558** |
| Jun 2029 | 450 | Rp 149.660.069 | Rp 1.334.912 | Rp 748.300 | Rp 3.069.920 | Rp 375.000 | **Rp 144.131.937** |
| Jul 2029 | 470 | Rp 156.872.877 | Rp 1.399.247 | Rp 784.364 | Rp 3.069.920 | Rp 375.000 | **Rp 151.244.345** |
| Agu 2029 | 490 | Rp 163.869.300 | Rp 1.461.653 | Rp 819.346 | Rp 3.069.920 | Rp 375.000 | **Rp 158.143.380** |
| Sep 2029 | 509 | Rp 170.655.830 | Rp 1.522.186 | Rp 853.279 | Rp 3.069.920 | Rp 375.000 | **Rp 164.835.445** |
| Okt 2029 | 527 | Rp 177.238.764 | Rp 1.580.903 | Rp 886.194 | Rp 3.069.920 | Rp 375.000 | **Rp 171.326.747** |
| Nov 2029 | 545 | Rp 183.624.211 | Rp 1.637.859 | Rp 918.121 | Rp 3.069.920 | Rp 375.000 | **Rp 177.623.311** |
| Des 2029 | 562 | Rp 189.818.094 | Rp 1.693.106 | Rp 949.090 | Rp 3.076.427 | Rp 375.000 | **Rp 183.724.470** |
| Jan 2030 | 605 | Rp 1.210.205.670 | Rp 2.495.280 | Rp 6.051.028 | Rp 3.087.021 | Rp 416.667 | **Rp 1.198.155.675** |
| Feb 2030 | 647 | Rp 221.320.155 | Rp 1.880.088 | Rp 1.106.601 | Rp 3.113.390 | Rp 416.667 | **Rp 214.803.408** |
| Mar 2030 | 687 | Rp 236.551.760 | Rp 2.009.479 | Rp 1.182.759 | Rp 3.138.969 | Rp 416.667 | **Rp 229.803.887** |
| Apr 2030 | 726 | Rp 251.326.418 | Rp 2.134.988 | Rp 1.256.632 | Rp 3.163.780 | Rp 416.667 | **Rp 244.354.351** |
| Mei 2030 | 764 | Rp 265.657.836 | Rp 2.256.732 | Rp 1.328.289 | Rp 3.187.846 | Rp 416.667 | **Rp 258.468.302** |
| Jun 2030 | 801 | Rp 279.559.311 | Rp 2.374.823 | Rp 1.397.797 | Rp 3.211.191 | Rp 416.667 | **Rp 272.158.834** |
| Jul 2030 | 837 | Rp 293.043.742 | Rp 2.489.372 | Rp 1.465.219 | Rp 3.233.835 | Rp 416.667 | **Rp 285.438.650** |
| Agu 2030 | 871 | Rp 306.123.641 | Rp 2.600.484 | Rp 1.530.618 | Rp 3.255.801 | Rp 416.667 | **Rp 298.320.071** |
| Sep 2030 | 905 | Rp 318.811.142 | Rp 2.708.263 | Rp 1.594.056 | Rp 3.277.107 | Rp 416.667 | **Rp 310.815.050** |
| Okt 2030 | 938 | Rp 331.118.018 | Rp 2.812.808 | Rp 1.655.590 | Rp 3.297.773 | Rp 416.667 | **Rp 322.935.179** |
| Nov 2030 | 969 | Rp 343.055.688 | Rp 2.914.217 | Rp 1.715.278 | Rp 3.317.820 | Rp 416.667 | **Rp 334.691.705** |
| Des 2030 | 1000 | Rp 354.635.228 | Rp 3.012.584 | Rp 1.773.176 | Rp 3.337.266 | Rp 416.667 | **Rp 346.095.535** |

### Titik kas terendah

Kas terendah hanya **Rp -2.333.920**, di Okt 2026 — bulan pertama, dan itu hampir
seluruhnya biaya infrastruktur. Setelah itu margin positif dan langsung menutup
seluruh kekurangan. **Kebutuhan modal: sekitar Rp 2,4 juta.**

---

## 3. Beban biaya

### 3a. Infrastruktur

Harga diambil dari halaman pricing resmi. Semua biaya dalam USD, dikonversi
dengan kurs asumsi **Rp 16.000/USD**.

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

Kolom pelanggan adalah pelanggan aktif di awal bulan, karena tagihan
dihitung di muka.

| Bulan | Pelanggan | Jam CPU | Supabase Pro | PITR | Vercel Pro | CPU overflow | Email | Monitoring | Domain | **Total USD/bln** | **Total Rp/bln** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Okt 2026 | 0 | 0.0 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Nov 2026 | 34 | 10 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Des 2026 | 68 | 20 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Jan 2027 | 100 | 30 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Feb 2027 | 108 | 32 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Mar 2027 | 115 | 35 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Apr 2027 | 122 | 37 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Mei 2027 | 129 | 39 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Jun 2027 | 136 | 41 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Jul 2027 | 143 | 43 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Agu 2027 | 149 | 45 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Sep 2027 | 155 | 47 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Okt 2027 | 161 | 48 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Nov 2027 | 167 | 50 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Des 2027 | 173 | 52 | $25 | $100 | $20 | $0 | $0 | $0 | $0,87 | **$ 146** | **Rp 2.333.920** |
| Jan 2028 | 178 | 53 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Feb 2028 | 192 | 57 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Mar 2028 | 205 | 61 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Apr 2028 | 217 | 65 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Mei 2028 | 230 | 69 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Jun 2028 | 242 | 73 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Jul 2028 | 253 | 76 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Agu 2028 | 265 | 79 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Sep 2028 | 275 | 83 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Okt 2028 | 286 | 86 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Nov 2028 | 296 | 89 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Des 2028 | 306 | 92 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Jan 2029 | 316 | 95 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Feb 2029 | 340 | 102 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Mar 2029 | 363 | 109 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Apr 2029 | 386 | 116 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Mei 2029 | 408 | 122 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Jun 2029 | 430 | 129 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Jul 2029 | 450 | 135 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Agu 2029 | 470 | 141 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Sep 2029 | 490 | 147 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Okt 2029 | 509 | 153 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Nov 2029 | 527 | 158 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.069.920** |
| Des 2029 | 545 | 163 | $25 | $100 | $20 | $ 0 | $20 | $26 | $0,87 | **$ 192** | **Rp 3.076.427** |
| Jan 2030 | 562 | 169 | $25 | $100 | $20 | $ 1 | $20 | $26 | $0,87 | **$ 193** | **Rp 3.087.021** |
| Feb 2030 | 605 | 181 | $25 | $100 | $20 | $ 3 | $20 | $26 | $0,87 | **$ 195** | **Rp 3.113.390** |
| Mar 2030 | 647 | 194 | $25 | $100 | $20 | $ 4 | $20 | $26 | $0,87 | **$ 196** | **Rp 3.138.969** |
| Apr 2030 | 687 | 206 | $25 | $100 | $20 | $ 6 | $20 | $26 | $0,87 | **$ 198** | **Rp 3.163.780** |
| Mei 2030 | 726 | 218 | $25 | $100 | $20 | $ 7 | $20 | $26 | $0,87 | **$ 199** | **Rp 3.187.846** |
| Jun 2030 | 764 | 229 | $25 | $100 | $20 | $ 9 | $20 | $26 | $0,87 | **$ 201** | **Rp 3.211.191** |
| Jul 2030 | 801 | 240 | $25 | $100 | $20 | $ 10 | $20 | $26 | $0,87 | **$ 202** | **Rp 3.233.835** |
| Agu 2030 | 837 | 251 | $25 | $100 | $20 | $ 12 | $20 | $26 | $0,87 | **$ 203** | **Rp 3.255.801** |
| Sep 2030 | 871 | 261 | $25 | $100 | $20 | $ 13 | $20 | $26 | $0,87 | **$ 205** | **Rp 3.277.107** |
| Okt 2030 | 905 | 272 | $25 | $100 | $20 | $ 14 | $20 | $26 | $0,87 | **$ 206** | **Rp 3.297.773** |
| Nov 2030 | 938 | 281 | $25 | $100 | $20 | $ 15 | $20 | $26 | $0,87 | **$ 207** | **Rp 3.317.820** |
| Des 2030 | 969 | 291 | $25 | $100 | $20 | $ 17 | $20 | $26 | $0,87 | **$ 209** | **Rp 3.337.266** |
| **Total 51 bulan** | | | | | | | | | | **$ 9.207** | **Rp 147.315.186** | |

Total infrastruktur 4,2 tahun: **$9.207 — Rp 147.315.186**.

Tiga hal yang terlihat jelas dari tabel:

1. **Biaya nyaris datar** — naik dari $146 ke $209 per bulan dalam 4,2 tahun,
   hanya naik 43%. Yang naik adalah jumlah pelanggan 12 kali lipat.
2. **Biaya per pelanggan turun drastis.** Di Oktober 2026, biaya
   infrastruktur Rp 2,3 juta untuk **nol** pelanggan. Di akhir 2030,
   Rp 3,3 juta untuk 969 pelanggan — dari tak terbatas menjadi Rp 3.400
   per pelanggan per bulan.
3. **CPU overflow baru muncul di 2029**, dan tetap kecil — total $112 selama
   4,2 tahun. Server bukan variabel yang perlu dioptimalkan di model ini.

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

Domain **tidak ada di sini** — dipindah ke tabel infrastruktur (Bagian 3a)
karena diurus lewat dashboard Cloudflare, bukan kewajiban hukum.

| Tahun | Infrastruktur | Legal & admin | **Total biaya** |
|---|---|---|---|
| 2026 (3 bln) | Rp 7.001.760 | **Rp 0** | **Rp 7.001.760** |
| 2027 | Rp 28.007.040 | Rp 3.500.000 | **Rp 31.507.040** |
| 2028 | Rp 36.839.040 | Rp 3.500.000 | **Rp 40.339.040** |
| 2029 | Rp 36.845.547 | Rp 4.500.000 | **Rp 41.345.547** |
| 2030 | Rp 38.621.799 | Rp 5.000.000 | **Rp 43.621.799** |
| **Total** | **Rp 147.315.186** | **Rp 16.500.000** | **Rp 163.815.186** |

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

Rincian omzet, margin, dan biaya per bulan ada di
[Bagian 2](#2-pendapatan). Ringkasannya:

| Tahun | Bln | **Margin bersih/bln** | Pelanggan akhir tahun |
|---|---|---|---|
| 2026 | 3 | **Rp 7.746.231** | 99.99999999999994 |
| 2027 | 12 | **Rp 53.167.042** | 177.9999999999999 |
| 2028 | 12 | **Rp 100.819.806** | 315.9999999999998 |
| 2029 | 12 | **Rp 190.992.531** | 561.9999999999993 |
| 2030 | 12 | **Rp 359.670.054** | 999.9999999999986 |
| **Total 4,2 th** | | **Rp 8.479.031.890** | |

Rata-rata 51 bulan: **Rp 166.255.527 per bulan**.

### Kapan cukup untuk gaji

| Margin/bln | Pelanggan aktif | Setara gaji per orang (bila 50:50) |
|---|---|---|
| Rp 7.746.231 (rata-rata 2026) | 99.99999999999994 | Rp 3.873.116 |
| Rp 53.167.042 (rata-rata 2027) | 177.9999999999999 | Rp 26.583.521 |
| Rp 100.819.806 (rata-rata 2028) | 315.9999999999998 | Rp 50.409.903 |
| Rp 190.992.531 (rata-rata 2029) | 561.9999999999993 | Rp 95.496.265 |
| Rp 359.670.054 (rata-rata 2030) | 999.9999999999986 | Rp 179.835.027 |

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

Biaya infrastruktur per pelanggan turun seiring skala: Rp 2,3 juta di Oktober 2026 (untuk nol pelanggan) menjadi
Rp 3,4 ribu per pelanggan di akhir 2030, sementara ARPU naik 21,6% karena
inflasi harga. Karena tidak ada payroll dan tidak ada akuntansi outsourced, hampir
seluruh revenue menjadi margin: **96,9%** dalam 4,2 tahun. Yang tersisa hanya
fee Midtrans (0,70%), PPh Rezim A (0,50%), dan biaya operasional (2,09%).

---

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

| ARPU | Omzet 4,2 tahun |
|---|---|
| Rp 301.000 (−30%) | Rp 6.123.568.898 |
| Rp 365.500 (−15%) | Rp 7.435.762.234 |
| **Rp 430.000 (dasar)** | **Rp 8.747.955.569** |
| Rp 494.500 (+15%) | Rp 10.060.148.905 |

### Target — kalau jumlah pengrajin meleset

Target baru mengubah kesimpulan. Kalau 2026 hanya mencapai 50, dan 2030 tetap
ditahan di 1.000, kurvanya harus mengejar lebih cepat di empat tahun
berikutnya:

| Skenario | Aktif akhir 2026 | Aktif akhir 2030 | Omzet 5 th | Margin 5 th |
|---|---|---|---|---|
| 2026 separuh, 2030 tercapai | 50 | 1.000 | Rp 7.088.511.361 | Rp 6.819.589.260 |
| **Dasar** | **100** | **1.000** | **Rp 8.747.955.569** | **Rp 8.479.031.890** |
| 2026 naik 50%, 2030 tercapai | 150 | 1.000 | Rp 10.060.087.211 | Rp 9.756.682.564 |
| 2026 tercapai, 2030 separuh | 100 | 500 | Rp 5.603.624.586 | Rp 5.353.727.402 |
| keduanya meleset | 50 | 500 | Rp 4.373.977.785 | Rp 4.138.360.850 |

Rentang margin Rp 4,14 miliar sampai Rp 9,76 miliar. **2030 menentukan
segala sesuatu:** skenario dengan 2030 = 1.000 selalu menang, apa pun yang
terjadi di 2026. Tahun 2026 hanya menyumbang Rp 30 juta dari Rp 8,75 miliar —
kurang dari 0,4%.

Artinya 2026 yang paling rapuh secara operasional justru paling tidak
berdampak secara finansial. Yang harus dijaga bukan 100 pelanggan pertama,
tapi kemampuan menjaga pertumbuhan menuju 1.000 pada 2030.

---

## 8. Rekomendasi

1. **Cek agregasi omzet ke konsultan pajak tahun ini.** Batas Rp 4,8 miliar
   menghitung gabungan seluruh Perseroan Perorangan Anda, bukan cuma
   FurniTech. Omzet FurniTech saja mencapai Rp 4,41 miliar pada 2030 — sudah
   92% dari batas itu, dan ditambah PT Perorangan yang sudah ada, agregatnya
   menembus. Bedanya bagian Anda Rp 4,23 miliar (Rezim A) dengan Rp 3,91
   miliar (Rezim B) — **Rp 320 juta**. Ini satu-satunya
   hal di dokumen ini yang benar-benar menentukan hasil, dan hanya bisa
   dijawab dengan angka omzet asli Anda.
2. **Pahami ambang PPN, bukan hanya ambang PPh.** Angka Rp 4,8 miliar itu
   sekaligus ambang PKP. Melewatinya memaksa PPN 11% dari seluruh omzet —
   **Rp 485 juta pada 2030**, lebih besar dari PPh seluruhnya. Omzet FurniTech
   sendiri di 2030 sudah Rp 4,41 miliar, jadi **mendekati batas tanpa bantuan
   apa pun**. Putuskan harga paket sebelum itu terjadi.
3. **Cek agregasi, dan siapkan diri untuk.status jadi PT biasa kalau perlu.**
   Bila agregat omzet menembus Rp 4,8 miliar, PT Perorangan wajib berstatus
   PT biasa — bukan hanya tarif pajak yang berubah, tapi juga akta notaris,
   RUPS tahunan, dan laporan tahunan. Rencanakan transisinya sekarang, jangan menunggu
   sampai sudah di ambang.
4. **Omzet 2030 sudah 92% dari batas Rp 4,8 miliar.** Proyeksi Rp 4,41
   miliar. Tinggi 2027 saja sudah Rp 678 juta, jadi model ini tidak punya
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
   2027 Rp 53,2 juta dan 2030 Rp 359,7 juta. Melihat total lima tahun
   membuat 2026–2027 terlihat kecil padahal di situlah target 100 dan
   seluruh kurva ditentukan.
8. **Dana yang dibutuhkan hanya sekitar Rp 2,4 juta**, di bulan pertama, dan
   itu hampir seluruhnya biaya infrastruktur. Tidak perlu modal ventura. Tidak ada modal yang memaksa tumbuh cepat, jadi
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
Proyeksi FurniTech sudah mencapai Rp 4,41 miliar pada 2030. Bila keduanya
berjalan bersamaan:

| Tahun | FurniTech | PT Perorangan yang sudah ada | Agregat | Batas 4,8 M? |
|---|---|---|---|---|
| 2026 | Rp 30.711.120 | perlu data Anda | — | kemungkinan ya |
| 2027 | Rp 678.186.406 | perlu data Anda | — | kemungkinan ya |
| 2028 | Rp 1.265.896.280 | perlu data Anda | — | kemungkinan ya |
| 2029 | Rp 2.361.753.153 | Rp 3,2 miliar (asumsi) | Rp 5,56 miliar | **LEWAT** |
| 2030 | Rp 4.411.408.609 | Rp 3,2 miliar (asumsi) | Rp 7,61 miliar | **LEWAT** |

Baris 2029 dan 2030 memakai asumsi usaha lama Anda tetap Rp 3,2 miliar.
Kalau sudah berhenti atau turun, agregatnya lebih rendah dan Rezim A bisa
bertahan lebih lama — dan dalam skenario itu **FurniTech sendiri pun sudah
Rp 4,41 miliar pada 2030, yaitu 92% dari batas**. **Ini perlu dicek ke
konsultan pajak dengan angka omzet sebenarnya** — bukan dengan asumsi saya.

### Hitungan Rezim A — 0,5% dari omzet

| Tahun | Omzet | **PPh final 0,5%** |
|---|---|---|
| 2026 | Rp 30.711.120 | Rp 153.556 |
| 2027 | Rp 678.186.406 | Rp 3.390.932 |
| 2028 | Rp 1.265.896.280 | Rp 6.329.481 |
| 2029 | Rp 2.361.753.153 | Rp 11.808.766 |
| 2030 | Rp 4.411.408.609 | Rp 22.057.043 |
| **Total 4,2 tahun** | **Rp 8.747.955.569** | **Rp 43.739.778** |

Angka ini sudah termasuk di [Bagian 4](#4-margin-bersih-setiap-bulan) sebagai
beban, jadi margin bersih di sana **sudah setelah PPh**.

Sekitar Rp 34,6 juta selama 4,2 tahun. Itulah nilai terbesar Rezim A: pada
2030, PPh Rezim A hanya Rp 17,5 juta, sedangkan PPh badan 22% atas laba
Rp 3,39 miliar adalah Rp 745 juta. **Selisihnya 43 kali.**

### Hitungan Rezim B — badan 22%, lalu dividen 10%

Kalau agregat omzet menembus Rp 4,8 miliar, tarif badan 22% atas laba. Laba
di sini memakai **biaya yang sama seperti Bagian 4** (legal nol di 2026):

| Tahun | Laba | PPh badan 22% | Bagian Anda 50% | PPh dividen 10% | Anda net |
|---|---|---|---|---|---|
| 2026 | Rp 28.936.957 | Rp 6.366.130 | Rp 14.468.478 | Rp 1.446.848 | Rp 13.021.631 |
| 2027 | Rp 672.268.800 | Rp 147.899.136 | Rp 336.134.400 | Rp 33.613.440 | Rp 302.520.960 |
| 2028 | Rp 1.257.893.884 | Rp 276.736.655 | Rp 628.946.942 | Rp 62.894.694 | Rp 566.052.248 |
| 2029 | Rp 2.345.510.380 | Rp 516.012.283 | Rp 1.172.755.190 | Rp 117.275.519 | Rp 1.055.479.671 |
| 2030 | Rp 4.383.135.091 | Rp 964.289.720 | Rp 2.191.567.546 | Rp 219.156.755 | Rp 1.972.410.791 |
| **Total** | **Rp 8.687.745.111** | **Rp 1.911.303.925** | **Rp 4.343.872.556** | **Rp 434.387.256** | **Rp 3.909.485.300** |

Dividen yang diterima WP Orang Pribadi dalam negeri dikenai PPh final 10%
(PP 55/2022 Pasal 23 huruf m). Karena itu kolom "Anda net" adalah **setelah**
pajak.

Bandingkan dengan Rezim A: bagian Anda **Rp 4.229.892.195** dari margin
Rp 8.479.031.890. Selisihnya **Rp 320 juta** dalam 4,2 tahun.

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
ambang PKP. Proyeksi FurniTech sendiri di 2030 adalah Rp 4,41 miliar — **92%
dari batas**, tanpa bantuan apa pun. Pada omzet itu, PPN 11% adalah
**Rp 485 juta per tahun**, lebih besar dari PPh seluruhnya. Dengan asumsi
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
| Legal dan admin | **Rp 0 (2026)** → 3,5–5 jt/tahun, tanpa domain | **angka tebakan saya** |
| Jam CPU Vercel | **0,3 jam per pelanggan aktif per bulan** | **angka tebakan saya** |
| PITR Supabase | **aktif sejak Okt 2026** ($100/bln) | keputusan Anda |
| Fonnte | tidak dipakai | `PRD.md` v1.3 (fakta) |
| Domain .com | $0,87/bln, dihitung di infrastruktur | keputusan Anda |
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
berbasis pelanggan, biaya CPU tidak pernah melonjak dan total infrastruktur
turun dari Rp 166.562.688 menjadi Rp 147.315.186.
