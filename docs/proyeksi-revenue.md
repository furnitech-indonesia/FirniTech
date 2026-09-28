# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 10](#10-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **1.000 pengrajin aktif di akhir 2030 menghasilkan
revenue Rp 5,49 miliar dalam 4,2 tahun, dengan margin bersih Rp 5,32 miliar
(96,9%) — karena tidak ada gaji di P&L dan admin dikerjakan berdua.** Total
biaya 4,2 tahun cuma Rp 171 juta, dan dana yang dibutuhkan hanya Rp 8,1
juta. Bagian Anda 50% = Rp 2,66 miliar. Yang tidak terlihat di angka ini:
2 orang tidak mungkin menangani 1.000 pelanggan, dan itu tidak akan muncul
sebagai rupiah di mana pun.

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

## 4. Revenue dan margin bersih setiap tahun

Struktur: owner/CEO sekaligus developer, dan 1 komisaris yang.handle marketing.
Tidak ada gaji di P&L. Semua admin dikerjakan berdua. Pembagian profit
**50% owner, 50% komisaris**.

| Tahun | Pelanggan | **Revenue** | **Margin bersih** | **50% owner** | **50% komisaris** |
|---|---|---|---|---|---|
| 2026 (3 bln) | 10 | Rp 3.039.401 | **−Rp 8.120.599** | −Rp 4.060.299 | −Rp 4.060.299 |
| 2027 | 100 | Rp 203.932.969 | **Rp 191.792.969** | **Rp 95.896.485** | **Rp 95.896.485** |
| 2028 | 215 | Rp 629.493.953 | **Rp 609.418.977** | **Rp 304.709.489** | **Rp 304.709.489** |
| 2029 | 464 | Rp 1.425.265.829 | **Rp 1.372.057.733** | **Rp 686.028.866** | **Rp 686.028.866** |
| 2030 | 1.000 | Rp 3.228.176.648 | **Rp 3.153.578.952** | **Rp 1.576.789.476** | **Rp 1.576.789.476** |
| **Total** | | **Rp 5.489.908.800** | **Rp 5.318.728.032** | **Rp 2.659.364.016** | **Rp 2.659.364.016** |

Margin bersih total 4,2 tahun: **Rp 5.318.728.032 (96,9% dari revenue)**.
Total biaya hanya Rp 171.180.768, atau 3,12% dari revenue.

### Kas kumulatif dan margin per bulan

| Tahun | Kas kumulatif | Margin per bulan (rata-rata) | 50% owner per bulan |
|---|---|---|---|
| 2026 | −Rp 8.120.599 | −Rp 2.706.866 | −Rp 1.353.433 |
| 2027 | Rp 183.672.370 | Rp 15.982.747 | Rp 7.991.374 |
| 2028 | Rp 793.091.347 | Rp 50.784.915 | Rp 25.392.457 |
| 2029 | Rp 2.165.149.080 | Rp 114.338.144 | Rp 57.169.072 |
| 2030 | Rp 5.318.728.032 | Rp 262.798.246 | Rp 131.399.123 |

Kas kumulatif positif sejak 2027. Kebutuhan modal hanya **Rp 8,1 juta** untuk
3 bulan terakhir 2026.

### Kapan 50% Anda cukup untuk hidup

Karena dibagi dua, gaji minimum Anda berarti margin harus dua kali lipat:

| Gaji owner per bulan | Margin/bln yang dibutuhkan | Pelanggan aktif |
|---|---|---|
| Rp 20 juta | Rp 40 juta | 96 |
| Rp 30 juta | Rp 60 juta | 143 |
| Rp 40 juta | Rp 80 juta | 191 |
| Rp 50 juta | Rp 100 juta | 238 |

**2029 adalah tahun pertama Anda bisa mengambil Rp 30 juta per bulan** dari
profit share. 2028 memberi Rp 25,4 juta per bulan, masih di bawah. 2026 dan
2027 harus ditanggung dari sumber lain, karena margin-nya belum cukup untuk
satu pun dari kedua orang.

### Tiga angka yang harus dibaca

1. **Margin bersih Rp 5,32 miliar dalam 4,2 tahun, margin 96,9%.** Hampir
   seluruh revenue menjadi margin karena tidak ada payroll dan tidak ada
   akuntansi outsourced.
2. **Dana yang dibutuhkan Rp 8,1 juta.** Tidak perlu modal ventura. Semua
   biaya 4,2 tahun hanya Rp 171 juta.
3. **2029 adalah tahun pertama kedua orang bisa bergaji penuh.** 2026–2028
   adalah tiga tahun yang harus ditanggung dari luar.

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

1. **Putuskan sekarang: PT Perorangan atau PT biasa.** Perseroan Perorangan
   tidak bisa punya 2 pemegang saham dan tidak punya komisaris, jadi rencana
   50:50 dengan teman Anda **tidak bisa dijalankan** pada badan hukum itu.
   Kalau pembagian 50:50 itu penting, badan hukumnya harus PT biasa — dan itu
   keputusan hukum yang mengikat cara pencatatan, pajak, dan RUPS sejak sekarang.
2. **Cek agregasi omzet ke konsultan pajak tahun ini.** Batas Rp 4,8 miliar
   menghitung gabungan seluruh Perseroan Perorangan Anda. Omzet FurniTech saja
   mencapai Rp 3,26 miliar pada 2030; ditambah PT Perorangan yang sudah ada,
   agregatnya menembus batas. Bedanya PPh Rp 16 juta dengan Rp 694 juta pada
   2030 — **42 kali**.
3. **Pahami ambang PPN, bukan hanya ambang PPh.** Angka Rp 4,8 miliar itu
   sekaligus ambang PKP. Melewatinya memaksa PPN 11% dari seluruh omzet —
   Rp 358 juta pada 2030, lebih besar dari semua PPh di dokumen ini. Putuskan
   harga paket sebelum itu terjadi, bukan sesudah.
4. **Ambil uangnya sebagai gaji, bukan dividen.** Dividen dikenai pajak dua
   kali dan menguras Rp 464 juta lebih banyak dalam 4,2 tahun. Polanya juga
   menyisakan Rp 3,46 miliar di perusahaan yang tetap milik Anda.
5. **Selesaikan jalur pencairan sebelum mengejar 2027.** VA sudah berfungsi dan
   uang pengrajin sudah masuk ke rekening platform, tetapi
   `MIDTRANS_IRIS_API_KEY` masih kosong sehingga belum ada jalan
   mengembalikannya. Ini prasyarat hukum, bukan prioritas teknis akhir.
6. **Atur jadwal gaji secara tertulis** karena hanya 2026 yang tidak mampu
   membayar Rp 5 juta per orang.
7. **Siapkan proses dukungan sebelum 2029.** 1.000 pelanggan di tangan 2
   orang adalah 500 pelanggan per orang, tanpa onboarding otomatis. Beban ini
   tidak terlihat di P&L — hanya sebagai kelelahan.
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

### Gaji atau dividen — bedanya besar, dan bukan soal pajak semata

Cara Anda mendeskripsikan pembagiannya — gaji diambil dari profit bersih,
sisanya untuk perusahaan — secara akuntansi itu **dividen**, bukan gaji.
Gaji adalah biaya yang mengurangi laba; dividen adalah pembagian laba
sesudah pajak.

| | Pola dividen 50:50 | Pola gaji 2 orang |
|---|---|---|
| Laba kena pajak | Rp 5.318.728.032 | Rp 4.388.728.032 |
| PPh badan 22% | Rp 1.171.906.699 | Rp 973.906.699 |
| PPh dividen 10% | Rp 265.936.402 | Rp 0 |
| **Total pajak** | **Rp 1.437.843.101** | **Rp 973.906.699** |
| Diterima langsung oleh Anda | Rp 2.393.427.615 | Rp 465.000.000 |
| Tertahan di perusahaan | Rp 0 | Rp 3.458.728.032 |

**Pola dividen dikenai pajak dua kali**: 22% di badan, lalu 10% lagi saat
dibagikan. Total pajaknya Rp 464 juta lebih besar.

Perhatikan baris terakhir. Pola gaji menyisakan **Rp 3,46 miliar di
perusahaan** — uang yang 100% milik Anda, karena Anda pemegang saham tunggal.
Itu bukan pengorbanan; itu uang yang belum ditarik dan belum dikenai pajak
dividen. Kalau dimin intimidatedkan/dibayar sebagai dividen di kemudian hari,
barulah PPh 10% itu menimpa.

Jadwal gaji yang saya pakai (asumsi, perlu Anda tetapkan):

| Tahun | Gaji per orang per bulan | Gaji 2 orang per tahun |
|---|---|---|
| 2026 (3 bln) | Rp 5.000.000 | Rp 30.000.000 |
| 2027 | Rp 5.000.000 | Rp 120.000.000 |
| 2028 | Rp 7.500.000 | Rp 180.000.000 |
| 2029 | Rp 10.000.000 | Rp 240.000.000 |
| 2030 | Rp 15.000.000 | Rp 360.000.000 |
| **Total** | | **Rp 930.000.000** |

2026 tidak cukup. Margin 2026 minus Rp 8,1 juta, sementara gaji 2 orang
untuk 3 bulan sudah Rp 30 juta. 2027 cukup: margin Rp 191,8 juta against
Rp 120 juta gaji.

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
| Jumlah pengoper | 2 orang (owner/developer + komisaris/marketing) | **keputusan Anda** |
| Gaji masuk P&L | tidak ada | **keputusan Anda** |
| Pembagian profit | 50% owner, 50% komisaris | **keputusan Anda** |
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
| Pajak (PPh) | Rezim A 0,5% atau Rezim B 22% — lihat Bagian 9 | **perlu konfirmasi konsultan** |
| Gaji 2 orang | Rp 5 jt → 15 jt per bulan per orang | **keputusan Anda** |
| Omzet PT Perorangan yang sudah ada | Rp 3,2 miliar (asumsi tetap) | **perlu data Anda** |

Dua koreksi yang sudah masuk ke versi ini. Pertama, versi sebelumnya menghitung
beban gaji penuh dengan BPJS, THR, dan gaji 13 — asumsi yang tidak sesuai
model 2 orang ini. Kedua, versi sebelumnya menyimpulkan bahwa "semakin lambat
tumbuh, semakin besar modal yang dibutuhkan"; kesimpulan itu **artefak dari
asumsi gaji** dan tidak lagi berlaku setelah gaji dikeluarkan dari P&L.
