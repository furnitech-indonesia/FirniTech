# Proyeksi Revenue & Beban Biaya FurniTech (Okt 2026 – Des 2030)

Status: proyeksi, bukan ramalan. Semua angka dihitung dari `src/lib/plans.ts`
(harga paket) dan `PRD.md` bagian Biaya (pembagian fee), dengan asumsi
pertumbuhan dan biaya yang dinyatakan terbuka di
[Bagian 9](#9-asumsi-yang-dapat-diubah). Angka biaya infrastruktur diambil dari
halaman pricing resmi yang berlaku saat dokumen ini ditulis, bukan dari ingatan.

Ringkasan satu kalimat: **1.000 pengrajin aktif di akhir 2030 menghasilkan
pendapatan kotor Rp 5,54 miliar dalam 4,2 tahun — tetapi setelah biaya orang,
laba bersihnya hanya Rp 583 juta, dan kas terendah ada di angka minus
Rp 772 juta pada akhir 2028.** Infrastruktur nyaris tidak terlihat
(0,24% dari pendapatan). Yang menentukan bukan server, tapi orang.

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

### 3c. Orang, legal, dan administrasi

Ini bagian yang benar-benar menentukan, dan angkanya **asumsi Anda** — saya
tidak punya datanya.

| Tahun | Tim (Rp/tahun) | Legal & admin (Rp/tahun) |
|---|---|---|
| 2026 | Rp 90.000.000 | Rp 15.000.000 |
| 2027 | Rp 540.000.000 | Rp 18.000.000 |
| 2028 | Rp 900.000.000 | Rp 18.000.000 |
| 2029 | Rp 1.320.000.000 | Rp 24.000.000 |
| 2030 | Rp 1.800.000.000 | Rp 36.000.000 |
| **Total** | **Rp 4.650.000.000** | **Rp 111.000.000** |

Isi asumsi tabel tim: 2026 founder full-time (Rp 30 jt/bulan); 2027 founder
plus 1 customer service; 2028 tambah 2 CS dan 1 developer; 2029 tambah 1
developer dan 1 ops; 2030 tim 4–5 orang (Rp 150 jt/bulan).

Legal dan admin: 2026 setup PT, NIB, dan legal drafting; 2027–2028 pembukuan
Rp 1,5 jt/bulan; 2029–2030 naik seiring skala, Rp 2–3 jt/bulan. **Belum termasuk
pajak penghasilan** — perusahaan belum PKP sehingga PPN output belum ada,
tetapi PPh atas laba tetap berlaku dan belum dihitung di sini.

---

## 4. Ringkasan laba dan kebutuhan kas

| Tahun | Aktif | Pendapatan bersih | Total biaya | Laba / Rugi | **Kas kumulatif** |
|---|---|---|---|---|---|
| 2026 | 10 | Rp 3.039.401 | Rp 107.160.000 | −Rp 104.120.599 | −Rp 104.120.599 |
| 2027 | 100 | Rp 203.932.969 | Rp 566.640.000 | −Rp 362.707.031 | −Rp 466.827.630 |
| 2028 | 215 | Rp 629.493.953 | Rp 934.574.976 | −Rp 305.081.023 | **−Rp 771.908.652** |
| 2029 | 464 | Rp 1.425.265.829 | Rp 1.392.708.096 | +Rp 32.557.733 | −Rp 739.350.919 |
| 2030 | 1.000 | Rp 3.228.176.648 | Rp 1.905.597.696 | +Rp 1.322.578.952 | +Rp 583.228.032 |

**Total 4,2 tahun: pendapatan Rp 5.489.908.800, biaya Rp 4.906.680.768, laba
bersih Rp 583.228.032.**

### Tiga angka yang harus dibaca

1. **Kebutuhan kas puncak: Rp 772 juta** (akhir 2028). Ini angka yang harus
   disiapkan sekarang, bukan laba 2030. Kas kumulatif baru positif di
   **akhir 2030** — 4,2 tahun setelah rilis.
2. **Titik impas naik terus: 378 pelanggan rata-rata aktif per bulan di 2030.**
   Jumlah pelanggan yang harus dibiayai terus bertambah karena tim ikut
   tumbuh — dari 85 pelanggan (2026) menjadi 378 (2030).
3. **Infrastruktur hanya 0,24% dari pendapatan.** Margin infrastruktur
   99,6–99,8% sejak 2027. Server bukan variabel yang perlu dioptimalkan;
   memangkas tagihan Vercel tidak akan menyelamatkan bisnis ini.

### Kebutuhan modal per skenario — dan mengapa urutannya terbalik

Tabel biaya tim di Bagian 3c **tidak ikut menyesuaikan** dengan jumlah
pelanggan: diasumsikan tetap apa pun yang terjadi di pasar. Akibatnya ada
konsekuensi yang berlawanan dengan intuisi:

| Skenario | Aktif akhir 2030 | Kebutuhan modal puncak | Kapan |
|---|---|---|---|
| Optimis 20-150-400-700-1.500 | 1.500 | **Rp 352 juta** | 2027 |
| **Dasar 10-100-215-464-1.000** | **1.000** | **Rp 772 juta** | **2028** |
| Konservatif 5-50-150-300-500 | 500 | **Rp 1.685 juta** | 2030, belum impas |

**Semakin lambat tumbuh, semakin besar modal yang dibutuhkan.** Ini bukan
aneh: biaya tim itu tetap, jadi di skenario konservatif ia tidak pernah
teramortisasi — 500 pelanggan di 2030 masih rugi Rp 130 juta, sedangkan
1.500 pelanggan di 2030 sudah menghasilkan Rp 2,9 miliar laba.

Konsekuensi praktis: **jangan siapkan modal berdasarkan skenario yang paling
optimis.** Yang benar adalah menyiapkan Rp 1,7 miliar untuk skenario
konservatif, karena itu skenario yang paling mungkin terjadi dan belum impas
sama sekali pada 2030. Angka Rp 772 juta hanya berlaku kalau target
1.000 pelanggan benar-benar tercapai.

### Unit economics

| Tahun | ARPU | Infrastruktur per pelanggan per bulan | Margin infrastruktur |
|---|---|---|---|
| 2026 | Rp 430.000 | Rp 72.000 | 76,3% |
| 2027 | Rp 451.500 | Rp 7.200 | 99,6% |
| 2028 | Rp 474.075 | Rp 6.424 | 99,8% |
| 2029 | Rp 497.779 | Rp 8.748 | 99,7% |
| 2030 | Rp 522.668 | Rp 5.800 | 99,8% |

Biaya infrastruktur per pelanggan **turun** seiring skala — dari Rp 7.200 ke
Rp 5.800 per bulan. Model ini tidak akan mendapat manfaat berarti dari
economies of scale, karena revenue per pelanggan naik 21,6% dalam 4 tahun
sedangkan infrastruktur per pelanggan nyaris datar. Yang menentukan
profitabilitas adalah **pertumbuhan jumlah pelanggan**, bukan efisiensi biaya.

---

## 5. Yang tidak ada di dokumen ini

Sengaja dikecualikan, dan sebaiknya tetap dikecualikan:

- **Pajak.** PPh atas laba belum dihitung; perusahaan belum PKP.
- **Biaya akuisisi (CAC).** Tidak ada anggaran iklan, semuanya diasumsikan
  organic atau referral. Jika harus membayar iklan, dokumen ini berubah total.
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
ini sangat sensitif terhadap apa pun yang menggagalkan 2029–2030. Sebaliknya,
2026–2028 hampir tidak menghasilkan apa-apa: Rp 835 juta pendapatan kumulatif
melawan Rp 1,6 miliar biaya.

### 5. Beban tim adalah asumsi, dan itu asumsi terbesar

Biaya orang (Rp 4,65 miliar) adalah 95% dari total biaya. Kalau sebenarnya
perlu 3 orang lebih banyak di 2028, kebutuhan kas puncak naik jauh di atas
Rp 772 juta.

---

## 7. Sensitivitas

### Churn — dampaknya ke rekrut, bukan ke revenue

| Churn per bulan | Rekrut total | Churned | Aktif akhir 2030 |
|---|---|---|---|
| 2% | 1.330 | 330 | 1.000 |
| **3% (dasar)** | **1.504** | **504** | **1.000** |
| 5% | 1.870 | 870 | 1.000 |
| 8% | 2.469 | 1.469 | 1.000 |

Revenue **tidak berubah sama sekali**, karena target akhir tahun dikunci.
Churn tidak mengubah berapa banyak uang yang masuk; ia hanya mengubah berapa
banyak orang yang harus dicari untuk mengisinya. Inilah yang sering terbalik di
model bisnis: churn adalah **biaya akuisisi**, bukan variabel pendapatan.

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
Rencana kas harus disusun terhadap skenario konservatif.

---

## 8. Rekomendasi

1. **Selesaikan jalur pencairan sebelum mengejar 2027.** Ini prasyarat
   hukum, bukan prioritas teknis akhir. Tanpa itu, setiap pelanggan baru hanya
   menambah paparan.
2. **Siapkan Rp 1,7 miliar**, bukan Rp 772 juta. Angka Rp 772 juta hanya
   berlaku bila target 1.000 pelanggan benar-benar tercapai; skenario
   konservatif — yang paling mungkin terjadi — membutuhkan Rp 1,69 miliar dan
   belum impas sama sekali pada 2030.
3. **Validasi churn pada 100 pelanggan pertama** sebelum mempercayai kurva
   2028–2030. Angka itu akan menopang atau menjatuhkan seluruh proyeksi.
4. **Jangan susun anggaran infrastruktur.** Total Rp 145 juta dalam 4,2
   tahun. Semua energi harus ke rekrut dan retensi.
5. **Uji harga lebih awal.** Satu perubahan ARPU 15% bernilai Rp 823 juta
   dalam 4 tahun — jauh lebih besar daripada penghematan infrastruktur yang
   mungkin dilakukan.
6. **Hitung ulang dokumen ini setiap kali asumsi berubah.** Seluruh asumsi
   terkumpul di [Bagian 9](#9-asumsi-yang-dapat-diubah).

---

## 9. Asumsi yang dapat diubah

Semua angka dokumen ini diturunkan dari tabel berikut. Mengubah satu baris
mengubah seluruh dokumen.

| Asumsi | Nilai | Sumber |
|---|---|---|
| Harga paket | 300rb / 500rb / 1jt | `src/lib/plans.ts` (fakta) |
| Diskon tahunan | 5% | `src/lib/plans.ts` (fakta) |
| Fee Midtrans per invoice | Rp 4.440 | `PRD.md` (fakta) |
| Bauran paket | 60 / 30 / 10 | **asumsi Anda** |
| Porsi bayar tahunan | 30% | **asumsi saya** |
| Churn | 3% per bulan | **asumsi Anda** |
| Inflasi harga | 5% per tahun | **asumsi Anda** |
| Kurs USD | Rp 16.000 | **asumsi saya** |
| Interpolasi 2028–2029 | geometris ×2,1544 per tahun | hitungan |
| Biaya tim | Rp 30 jt → 150 jt per bulan | **asumsi Anda** |
| Legal dan admin | Rp 15 jt → 36 jt per tahun | **asumsi saya** |
| Jam CPU Vercel | 20 → 1.500 jam per bulan | **asumsi saya** |
| PITR Supabase | aktif mulai 2029 | keputusan saya |
| Fonnte | tidak dipakai | `PRD.md` v1.3 (fakta) |
| Biaya CAC | nol, diasumsikan organic | **asumsi saya** |
| Pajak (PPh) | belum dihitung | **di luar lingkup** |

Baris bertanda **asumsi** adalah titik paling lemah dokumen ini, dan baris
biaya tim adalah yang paling menentukan: ia 95% dari total biaya, sementara
seluruh angka pertumbuhan hanya bergantung pada jumlah pelanggan.
