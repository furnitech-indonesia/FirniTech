# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 9](#9-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **1.000 pengrajin aktif di akhir 2030 menghasilkan
revenue Rp 5,49 miliar dalam 4,2 tahun, dengan margin bersih Rp 5,23 miliar
(95,3%) — karena tidak ada beban gaji di P&L.** Dana yang dibutuhkan hanya
Rp 14,1 juta pada 2026. Yang tidak terlihat di angka ini: 2 orang tidak
mungkin menangani 1.000 pelanggan, dan itu tidak akan muncul sebagai rupiah
di mana pun.

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

Beban ini **tidak termasuk gaji**, sesuai asumsi bahwa aplikasi ini dioperasikan
oleh 2 orang yang gajinya diambil dari margin bersih, bukan dibebankan ke P&L.

2026, sekali bayar Rp 15.000.000:

| Item | Biaya |
|---|---|
| Pendirian PT (notaris, akta, pengacara) | Rp 6.500.000 |
| Pendaftaran NIB lewat OSS | Rp 0 |
| NPWP perusahaan | Rp 0 |
| Pendaftaran PKP | Rp 0 |
| Rekening bank, materai, kop | Rp 500.000 |
| Review kontrak dan NDA | Rp 2.000.000 |
| Dana tak terduga | Rp 6.000.000 |
| **Total** | **Rp 15.000.000** |

2027 dan 2028, Rp 18.000.000 per tahun: pembukuan outsourced Rp 1 jt/bulan
(Rp 12 jt), laporan tahunan dan RUPS Rp 4 jt, renewal domain .com Rp 167.000,
konsultasi pajak Rp 1.833.000. 2029 dan 2030 dinaikkan menjadi Rp 24 juta dan
Rp 36 juta seiring skala. **Pajak penghasilan belum dihitung** — perusahaan belum
PKP sehingga PPN output belum ada.

### 3d. Gaji: nol di P&L, tapi bukan nol di kenyataan

Bagian ini sengaja ditulis eksplisit karena tabel margin di atas bisa salah
dibaca.

Tidak ada satu pun rupiah gaji yang masuk ke tabel di atas. Angka Rp 5,23 miliar
adalah **uang yang masuk ke perusahaan sebelum kedua orang menggambarnya**. Yang
benar-benar diterima setelah digaji ada di [Bagian 4](#4-revenue-dan-margin-bersih-setiap-tahun).

Dua hal yang tidak hilang hanya karena tidak masuk P&L:

- **THR dan gaji 13 tetap wajib** bila orang kedua berstatus karyawan. Keduanya
  setara satu bulan gaji, jadi dua bulan per tahun penuh. Yang bisa dihindari
  hanya bilastatusnya kontraktor, dan itu berbeda secara hukum ketenagakerjaan.
- **Tidak menggaji berarti menunda penghasilan, bukan menghemat.** Kalau Anda
  dan satu orang lain menarik Rp 30 juta per bulan, total Rp 60 juta per bulan
  keluar dari angka margin bersih tersebut, sepadat dengan cost base Rp 26.640.000
  per tahun yang terlihat di tabel biaya. Angka gajinya ada di
  [Bagian 4](#4-revenue-dan-margin-bersih-setiap-tahun).

## 4. Revenue dan margin bersih setiap tahun

### Biaya yang dipotong dari revenue

| Tahun | Infrastruktur | Legal & admin | **Total biaya** |
|---|---|---|---|
| 2026 (3 bln) | Rp 2.160.000 | Rp 15.000.000 | **Rp 17.160.000** |
| 2027 | Rp 8.640.000 | Rp 18.000.000 | **Rp 26.640.000** |
| 2028 | Rp 16.574.976 | Rp 18.000.000 | **Rp 34.574.976** |
| 2029 | Rp 48.708.096 | Rp 24.000.000 | **Rp 72.708.096** |
| 2030 | Rp 69.597.696 | Rp 36.000.000 | **Rp 105.597.696** |
| **Total** | **Rp 145.680.768** | **Rp 111.000.000** | **Rp 256.680.768** |

Total biaya 4,2 tahun hanya **Rp 256.680.768**, yaitu 4,7% dari total revenue.

### Revenue dan margin bersih

| Tahun | Pelanggan aktif | **Revenue** | **Margin bersih** | Margin % | Kas kumulatif |
|---|---|---|---|---|---|
| 2026 | 10 | Rp 3.039.401 | **−Rp 14.120.599** | −464,6% | −Rp 14.120.599 |
| 2027 | 100 | Rp 203.932.969 | **Rp 177.292.969** | 86,9% | Rp 163.172.370 |
| 2028 | 215 | Rp 629.493.953 | **Rp 594.918.977** | 94,5% | Rp 758.091.348 |
| 2029 | 464 | Rp 1.425.265.829 | **Rp 1.352.557.733** | 94,9% | Rp 2.110.649.081 |
| 2030 | 1.000 | Rp 3.228.176.648 | **Rp 3.122.578.952** | 96,7% | Rp 5.233.228.032 |
| **Total** | | **Rp 5.489.908.800** | **Rp 5.233.228.032** | **95,3%** | |

Kas kumulatif **positif sejak 2027**. Hanya ada dua tahun yang perlu dana:
Okt–Des 2026 hanya butuh Rp 14,1 juta.

### Setelah digaji 2 orang

Margin bersih di atas adalah uang yang masuk ke perusahaan. Berikut yang tersisa
setelah kedua orang menggaji diri, dengan beberapa skenarionya:

| Gaji per orang per bulan | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| | −4,7 jt/bln | 14,8 jt/bln | 49,6 jt/bln | 112,7 jt/bln | 260,2 jt/bln |
| **20 jt (40 jt/bln)** | kurang 44,7 jt | kurang 25,2 jt | sisa 9,6 jt | sisa 72,7 jt | sisa 220,2 jt |
| **25 jt (50 jt/bln)** | kurang 54,7 jt | kurang 35,2 jt | kurang 0,4 jt | sisa 62,7 jt | sisa 210,2 jt |
| **30 jt (60 jt/bln)** | kurang 64,7 jt | kurang 45,2 jt | kurang 10,4 jt | sisa 52,7 jt | sisa 200,2 jt |
| **40 jt (80 jt/bln)** | kurang 84,7 jt | kurang 65,2 jt | kurang 30,4 jt | sisa 32,7 jt | sisa 180,2 jt |

**Pelanggan aktif yang dibutuhkan untuk menggaji 2 orang**, dari ARPU bersih
Rp 420.331 per pelanggan per bulan:

| Gaji per orang | Pelanggan aktif yang dibutuhkan |
|---|---|
| Rp 20 juta | 96 |
| Rp 25 juta | 119 |
| Rp 30 juta | 143 |

2028 adalah tahun paling ketat: margin Rp 49,6 juta per bulan hampir persis
tidak cukup untuk 2 orang bergaji Rp 25 juta. **2029 adalah tahun pertama kedua
orang bisa bergaji penuh tanpa menarik kas.**

### Tiga angka yang harus dibaca

1. **Margin bersih total Rp 5,23 miliar dalam 4,2 tahun**, dengan margin 95,3%.
   Hampir semua revenue menjadi margin karena tidak ada beban payroll.
2. **Dana yang dibutuhkan hanya Rp 14,1 juta** — untuk 3 bulan terakhir 2026,
   sebagian besar untuk pendirian PT. Tidak perlu modal ventura.
3. **Kedua orang baru bisa bergaji penuh pada 2029** pada gaji Rp 30 juta per
   orang. 2026 dan 2027 harus ditanggung dari sumber lain.

### Kebutuhan modal per skenario

Tanpa beban gaji, kesimpulan berubah total. Versi dokumen sebelumnya
mengclaiming bahwa "semakin lambat tumbuh, semakin besar modal yang dibutuhkan"
— itu **artefak dari asumsi gaji yang tidak relevan dengan model ini**, dan
sekarang tidak berlaku. Ketiga skenario profitable:

| Skenario | Aktif akhir 2030 | Revenue 5 th | Biaya 5 th | Margin 5 th | Margin % |
|---|---|---|---|---|---|
| Konservatif 5-50-150-300-500 | 500 | Rp 3.222.020.550 | Rp 256.680.768 | Rp 2.965.339.782 | 92,0% |
| **Dasar 10-100-215-464-1.000** | **1.000** | **Rp 5.489.908.800** | **Rp 256.680.768** | **Rp 5.233.228.032** | **95,3%** |
| Optimis 20-150-400-700-1.500 | 1.500 | Rp 8.588.734.667 | Rp 256.680.768 | Rp 8.332.053.899 | 97,0% |

Rentang margin Rp 2,97 miliar sampai Rp 8,33 miliar. Bahkan skenario konservatif
sudah sangat profitable — yang membuat model ini tahan terhadap kesalahan
optimisme.

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

- **Pajak.** PPh atas laba belum dihitung; perusahaan belum PKP.
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
margin 95,3% yang tampak sangat sehat. Ini kelemahan model ini yang paling
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

1. **Gaji tidak masuk P&L, tapi masuk ke keputusan.** Angka margin Rp 5,23
   miliar di atas harus dibaca sebagai "uang yang masuk perusahaan sebelum
   menggaji 2 orang". Kalau kedua orang menarik Rp 30 juta per bulan,
   total pengeluarannya Rp 720 juta per tahun — lebih besar daripada
   seluruh biaya legal dan infrastruktur. Ambang awalnya jelas: butuh
   143 pelanggan aktif.
2. **Selesaikan jalur pencairan sebelum mengejar 2027.** Ini prasyarat hukum,
   bukan prioritas teknis akhir. VA sudah berfungsi dan uang pengrajin sudah
   masuk ke rekening platform, tetapi belum ada jalan mengembalikannya.
   Dengan 2 orang, masalah operasional seperti ini jauh lebih lambat ditangani.
3. **Siapkan Rp 14,1 juta, bukan miliaran.** Ini perubahan terbesar dari
   versi dokumen sebelumnya. Dengan model 2 orang, kebutuhan modal justru
   turun drastis karena tidak ada payroll yang menelan revenue.
4. **Siapkan proses dukungan sebelum 2029, bukan sesudah.** 1.000 pelanggan
   di tangan 2 orang adalah 500 pelanggan per orang. Beban ini tidak terlihat
   di P&L, jadi tidak akan muncul sebagai angka — hanya sebagai kelelahan.
5. **Pastikan statusnya kontraktor, atau siap menghitung THR dan gaji 13.**
   Kalau orang kedua adalah karyawan, dua bulan gaji per tahun wajib ada.
   Angka itu keluar dari margin, bukan dari biaya.
6. **Hitung pajak pengambilan dana.** Mengambil uang dari PT untuk keperluan
   pribadi diperlakukan sebagai dividen dan dikenai pajak. Perhitungannya perlu
   dikerjakan terpisah, karena itu menentukan berapa yang benar-benar
   diterima.
7. **Validasi churn pada 100 pelanggan pertama** sebelum mempercayai kurva
   2028–2030.
8. **Hitung ulang dokumen ini setiap kali asumsi berubah.** Seluruh asumsi
   terkumpul di [Bagian 9](#9-asumsi-yang-dapat-diubah).

## 9. Asumsi yang dapat diubah

| Asumsi | Nilai | Sumber |
|---|---|---|
| Jumlah pengoper | 2 orang | **keputusan Anda** |
| Gaji masuk P&L | tidak ada | **keputusan Anda** |
| HRESULT | Rp 430.000 per pelanggan per bulan | hitungan dari `src/lib/plans.ts` |
| Bauran paket | 60 / 30 / 10 | **asumsi Anda** |
| Porsi bayar tahunan | 30% | **asumsi saya** |
| Churn | 3% per bulan | **asumsi Anda** |
| Inflasi harga | 5% per tahun | **asumsi Anda** |
| Kurs USD | Rp 16.000 | **asumsi saya** |
| Interpolasi 2028–2029 | geometris ×2,1544 per tahun | hitungan |
| Legal dan admin | Rp 15 jt → 36 jt per tahun | **angka tebakan saya** |
| Jam CPU Vercel | 20 → 1.500 jam per bulan | **angka tebakan saya** |
| PITR Supabase | aktif mulai 2029 | keputusan saya |
| Fonnte | tidak dipakai | `PRD.md` v1.3 (fakta) |
| Biaya CAC | nol, diasumsikan organic | **asumsi saya** |
| Pajak (PPh) | belum dihitung | **di luar lingkup** |
| Gaji 2 orang | tidak masuk P&L, lihat Bagian 4 | **keputusan Anda** |

Dua koreksi yang sudah masuk ke versi ini. Pertama, versi sebelumnya menghitung
beban gaji penuh dengan BPJS, THR, dan gaji 13 — asumsi yang tidak sesuai
model 2 orang ini. Kedua, versi sebelumnya menyimpulkan bahwa "semakin lambat
tumbuh, semakin besar modal yang dibutuhkan"; kesimpulan itu **artefak dari
asumsi gaji** dan tidak lagi berlaku setelah gaji dikeluarkan dari P&L.
