Product Requirement Document (PRD) — FurniTech
Nama Produk: FurniTech
Tipe Platform: SaaS Multi-Tenant (B2B2C E-Commerce & Internal Operations for Furniture Makers)
Versi PRD: 2.0
Status: Approved for Development
Catatan Revisi:
 * v2.0 — **Add-on "Paket Pendirian PT Perorangan" Rp500.000** (§2.E). Nama
   sebelumnya "Jasa Legalitas PT Perorangan" diganti karena kata "legalitas"
   memunculkan pertanyaan yang tidak perlu muncul — apakah ia pengacara —
   sementara isinya semuanya pengurusan administratif. Isi paket: pendaftaran
   AHU/SABH + Sertifikat Pendaftaran, NIB di OSS, NPWP Elektronik, dan logo
   perusahaan. **"Akta Perusahaan" DIHAPUS dari daftar** karena dokumen itu
   tidak pernah terbit untuk PT Perorangan: yang ada adalah Pernyataan
   Pendirian yang diisi sendiri secara elektronik, tanpa notaris. Biaya resmi
   hanya **PNBP Rp50.000** (PP 30/2026 pasal 33, berlaku 1 Agustus 2026);
   sisanya gratis dan dikerjakan pemilik usaha sendiri lewat AHU Online dalam
   2 hari. Karena itu add-on ini **tidak masuk** proyeksi margin —
   dampaknya 0,33% dan nilainya bukan pada uang, tapi pada titik masuk pelanggan
   baru. Detail dan alasannya di `docs/proyeksi-revenue.md` Bagian 11.
   Tidak ada perubahan harga paket.
 * v1.9 — **Root domain ditetapkan: `mebeltech.com`.** Dipilih `.com` dan bukan
   `.id`/`.co.id` karena hanya `.com` yang tidak butuh verifikasi legalitas
   usaha di Pornas. Dicek ke RDAP Verisign (registry `.com` resmi) pada
   2026-09-28: **HTTP 404 = domain belum terdaftar sama sekali**, jadi nama
   masih bebas diambil — bukan sekadar "belum ada yang pakai" seperti kalau
   dicek di dashboard Cloudflare. Biaya pendaftaran Rp 188.667 sekali di 2026, renewal
   Rp 188.667/tahun 2027–2030; total Rp 943.335 dalam 4,2 tahun (0,01% omzet).
   `NEXT_PUBLIC_ROOT_DOMAIN` harus diisi `mebeltech.com` dan **build ulang
   wajib** karena `NEXT_PUBLIC_*` di-inline saat build.
 * v1.8 — Model domain diperjelas menjadi dua lapis. **Subdomain gratis
   `tokonya.mebeltech.com` sudah termasuk di SEMUA paket** (termasuk Basic),
   dan **custom domain `tokonya.com` menjadi add-on tahunan Rp250.000** yang
   dibayar di muka untuk 12 bulan dengan auto renewal. Kolom "Custom Domain"
   di matriks §2.B sebelumnya berarti "kemampuan punya domain sendiri"
   padahal yang gratis hanya subdomain — sekarang keduanya dibedakan secara
   eksplisit. Angka, harga Cloudflare, dan economics-nya di
   `docs/proyeksi-revenue.md` Bagian 10. Tidak ada perubahan harga paket.
 * v1.7 — Model final: Platform Service Fee **0%** (dihapus), seluruh biaya
   gateway ditanggung pengrajin (Rp 4.440 saat terima pembayaran + Rp 5.550
   saat pencairan, per penerima), pencairan dipicu bukti pengiriman yang
   diunggah kurir sebagai ganti jadwal 06.00/18.00 WIB, metode COD
   ditambahkan, peran Kurir diperkenalkan, diskon langganan tahunan jadi 5%,
   dan harga dinyatakan belum termasuk PPN karena perusahaan belum PKP.
   Pendapatan platform sekarang hanya dari langganan. Memperbarui §2.A,
   §2.B, §2.C, Modul 1, Modul 1a (baru), Modul 3, dan Modul 5.
 * v1.6 — Finalisasi pembagian beban: fee masuk Rp 4.440 ditanggung
   pengrajin, fee pencairan Rp 5.000 (per batch) ditanggung platform dari
   merchant balance, dan platform fee 1,5% utuh tanpa dipotong. Kanal
   pembayaran dibatasi ke enam Virtual Account dengan CIMB dan SeaBank
   dinonaktifkan karena batas maksimum nominalnya. Menambahkan modal
   kalkulator biaya di modul produk. v1.5 (fee seluruhnya ditanggung
   pengrajin) dan v1.4 (fee dipotong dari platform fee) keduanya
   digantikan oleh model ini.
 * v1.5 — Model biaya final: seluruh fee Midtrans dipotong ke pengrajin
   (bukan dari platform fee), platform fee 1,5% dihitung dari totalAmount
   termasuk ongkir, biaya pencairan Rp 5.000 per eksekusi ditanggung
   pengrajin, dan fee dicatat sebagai beban. Ini menggantikan v1.4 yang
   memakai platform fee untuk menutup fee Midtrans. v1.4 sendiri
   menggantikan v1.3, yang menyatakan fee Midtrans dipotong dari total
   pembayaran. Detail dan rekomendasi channel ada di `docs/midtrans-fee.md`.
 * v1.4 — Menetapkan model biaya yang sebenarnya: kanal pembayaran hanya Bank
   Transfer/VA, fee masuk Rp 4.440 dipotong dari platform fee 1,5% (bukan dari
   bagian pengrajin), dan fee pencairan Rp 5.000 ditanggung FurniTech. Model
   lama di §2.C, Modul 1, dan Modul 3 menyatakan fee Midtrans dipotong dari
   total pembayaran, dan itu tidak sesuai keputusan bisnis terbaru. Sumber
   tarif dan risikonya ada di `docs/midtrans-fee.md`. Modul 3 juga memakai
   penamaan resmi "Payouts" (produk ini sebelumnya bernama IRIS).
 * v1.3 — Mengganti Integrasi Notifikasi WhatsApp (§4 Modul 4) dari Fonnte
   API menjadi pengiriman manual lewat tautan `wa.me`. Modul otomatis
   (checkout, pembayaran, payout) BELUM diimplementasikan dan dicatat sebagai
   pekerjaan yang ditunda, bukan sebagai bagian dari ruang lingkup sekarang.
   Matriks fitur §2.B dan daftar environment menyesuaikan: tidak ada lagi
   kuota notifikasi WhatsApp per paket.
 * v1.2 — Menambahkan §7 (Rencana Rilis PWA & Native) beserta keputusan
   arsitektur Capacitor, dan persyaratan tampilan responsif sebagai kebutuhan
   lintas modul.
 * v1.1 — Menyelaraskan PRD dengan ROADMAP.md (6 sprint) dan menambahkan
   Modul 5 (Super Admin Panel) yang sebelumnya belum tercantum.
ROADMAP.md menjadi acuan cakupan sprint, sedangkan PRD ini adalah acuan
kebutuhan & aturan bisnis.
1. Ringkasan Eksekutif & Visi Produk
FurniTech adalah platform Software-as-a-Service (SaaS) multi-tenant yang dirancang khusus untuk memberdayakan pengrajin dan UMKM mebel/furnitur lokal. Platform ini menyediakan dua fungsionalitas utama dalam satu ekosistem:
 * Front-Office (Toko Online / Storefront): Platform e-commerce dengan custom domain untuk menjual produk mebel dengan kalkulasi ongkir kargo otomatis per kota.
 * Back-Office (Dashboard Internal): Sistem manajemen operasional workshop mebel yang mencakup pencatatan pesanan, pelacakan progres produksi visual oleh tim tukang, serta manajemen staf berbasis peran (RBAC).
2. Model Bisnis & Skema Langganan
A. Tarif Paket Langganan
 * Paket Basic: Rp300.000 / bulan (atau Rp3.420.000 / tahun)
 * Paket Pro: Rp500.000 / bulan (atau Rp5.700.000 / tahun)
 * Paket Max: Rp1.000.000 / bulan (atau Rp11.400.000 / tahun)
 * **Add-on Custom Domain `.com`: Rp250.000 / tahun**, dibayar di muka untuk
   12 bulan, auto renewal setiap 12 bulan, suspend otomatis setelah 3 bulan
   tidak dibayar. Subdomain gratis sudah termasuk di semua paket — add-on
   ini menjual pilihan memakai nama sendiri, bukan kemampuan punya domain.
 * **Add-on "Paket Pendirian PT Perorangan": Rp500.000, sekali bayar.**
   Di luar paket langganan, tidak berulang, dan hanya tersedia saat
   pendaftaran. Biaya negara PNBP Rp50.000 ditanggung pelanggan apa adanya.
   Rinciannya di §2.E.
 * Diskon tahunan 5%. Semua harga BELUM termasuk PPN 11% karena perusahaan
   berstatus belum PKP, jadi PPN tidak diodeser ke pengrajin maupun pembeli.
 * Harga paket dapat diubah owner dari panel super admin; harga yang sudah
   terbit di invoice tidak ikut berubah.
 * Kebijakan Free Trial: Tidak Ada. Pengrajin wajib memilih dan membayar paket langganan saat pendaftaran awal.
B. Matriks Fitur & Batasan Paket (Feature Differentiation)
| Fitur / Spesifikasi | Basic (Rp300rb/bln) | Pro (Rp500rb/bln) | Max (Rp1jt/bln) |
|---|---|---|---|
| Subdomain gratis (`tokonya.mebeltech.com`) | ✅ | ✅ | ✅ |
| Custom Domain sendiri (`tokonya.com`) | Add-on Rp250.000/tahun | Add-on Rp250.000/tahun | Add-on Rp250.000/tahun |
| Paket Pendirian PT Perorangan | Add-on Rp500.000 (sekali) | Add-on Rp500.000 (sekali) | Add-on Rp500.000 (sekali) |
| Kurir (unggah bukti & tanda tangan) | ✅ | ✅ | ✅ |
| Maksimal Katalog Produk | Hingga 20 Produk | Hingga 100 Produk | Unlimited Produk |
| Jumlah Akun Staf (RBAC) | 2 Akun (Owner + 1 Staf) | 5 Akun Staf/Tukang | Unlimited Akun Staf/Tukang |
| Kirim foto progres via WhatsApp | ✅ (tanpa batas) | ✅ (tanpa batas) | ✅ (tanpa batas) |
| Laporan Keuangan & Kas | Transaksi Dasar | Rekap Laba/Rugi Bulanan | Laporan Eksekutif & Analytics |
| Pencairan otomatis (Payouts) | Included | Included | Included |
C. Kebijakan Transaksi & Potongan Biaya (Fees)
   Model final ditetapkan pemilik produk pada 2026-09-27 (PRD v1.7). Angka,
   sumber, dan risikonya: `docs/midtrans-fee.md`. Konstanta dan rumusnya
   hanya di `src/lib/fees.ts`.
   * **Kanal pembayaran: Virtual Account saja** — BCA, BNI, BRI, BSI, Danamon,
     Permata — ditambah **COD**. Alasan ekonomi: fee VA Rp 4.000 datar per
     transaksi, sedangkan kanal lain memakai MDR persen yang merupakan lapisan
     biaya tambahan. Konsekuensinya fee menjadi **konstanta**, bukan tabel
     per channel.
   * **CIMB VA dan SeaBank dinonaktifkan** karena batas maksimum nominalnya
     (Rp 250 juta dan Rp 100 juta) terlalu kecil untuk pesanan mebel.
   * **Platform Service Fee: 0.** Dihapus dari model. FurniTech tidak lagi
     mengambil persentase dari transaksi; pendapatannya dari langganan, dan
     biaya gateway dibebankan ke pengrajin. Nilai ini dapat diubah owner
     dari panel super admin kapan saja.
   * **Harga paket belum termasuk PPN 11%** karena perusahaan berstatus
     **belum PKP** — jadi PPN tidak diodeser ke pengrajin maupun pembeli.
     PPN di dalam fee Midtrans tidak bisa dikreditkan dan sudah termasuk di
     angka `src/lib/fees.ts`.
   * **Diskon langganan tahunan 5%** (sebelumnya 10%), dihitung dari harga
     bulanan × 12 × 0,95.
   * **Fee Midtrans dicatat sebagai BEBAN**, bukan pengurangan pendapatan.

   RUMUS
   ```
   platformFee  = 0% × totalAmount                (dapat diubah owner)
   feeMasuk     = Rp4.440   per transaksi  → pengrajin
   feePayout    = Rp5.550   per PENERIMA    → pengrajin
   feeLangganan = Rp4.440   per invoice     → FurniTech

   escrow masuk     = totalAmount − feeMasuk
   saldo pengrajin += totalAmount − platformFee − feeMasuk
   saat payout     : saldo ditransfer = saldo − feePayout
   ```

   BEBAN PENGRAJIN
   ```
   total per pesanan = Rp4.440 + Rp5.550 = Rp9.990   (datar, bukan persen)
   ```
   Propriosinya naik tajam untuk pesanan kecil: 0,10% untuk pesanan Rp 10
   juta, 1,50% untuk Rp 666.000, 9,99% untuk Rp 100.000. Mebel custom selalu
   di rentang pertama.

   CATATAN YANG WAJIB DIPERHATIKAN
   * **Biaya gateway disisipkan ke harga produk, dan itu keputusan
     pengrajin.** Keterlewatan begitu: pengrajin menggambar harga yang tidak
     menutup biayanya dan baru sadar setelah uangnya ditransfer berbulan-bulan
     kemudian. Karena itu **modal kalkulator biaya di modul produk** wajib
     ada, dan menampilkan kedua fee terpisah — bukan dijumlahkan, karena
     kapan potongannya terjadi berbeda.
   * Honor yang tidak boleh dilanggar: fee platform yang 0% **tidak boleh
     disembunyikan** di halaman harga, dan "Biaya platform 0%" tanpa
     penjelasan akan membuat pengrajin mengira FurniTech tidak Wearing biaya
     apa pun. Yang ditulis justru bebannya.
   * Rincian biaya tampil di tiga tempat: wizard pendaftaran, ringkasan saldo
     siap cair, dan rincian detail pesanan. Halaman lacak publik **tidak
     boleh** menampilkannya — `test:lacak` tetap mengunci itu.
   * Pembayaran langganan berbeda: fee Rp 4.440 di sana ditanggung
     **FurniTech**, jadi Pendapatan platform per langganan adalah
     `harga paket − Rp 4.440` (Basic Rp 300.000 → Rp 295.560).
   * Tidak ada minimum nilai pesanan dan tidak ada ambang minimum pencairan.
     Keduanya konsisten dengan model "biaya dibebankan ke pengrajin".

D. Add-on Custom Domain
   Model ditetapkan pemilik produk pada 2026-09-28 (PRD v1.8). Angka lengkap
   di `docs/proyeksi-revenue.md` Bagian 10.
   * **Root domain platform: `mebeltech.com`** (PRD v1.9). `.com` dipilih
     karena tidak butuh verifikasi legalitas usaha; `.id` dan `.co.id`
     membutuhkannya. Terdaftar di Cloudflare sebagai Zone, DNS
     di-pointing ke Vercel, dan `NEXT_PUBLIC_ROOT_DOMAIN=mebeltech.com`.
   * **Subdomain gratis di SEMUA paket** — `tokonya.mebeltech.com`. Tidak ada
     biaya, tidak bisa hilang, dan tidak butuh DNS. Ini yang membuat paket
     Basic Rp300.000 punya sesuatu yang nyata untuk ditawarkan, bukan
     sekadar hosting.
   * **Custom domain sendiri adalah add-on berbayar**, bukan fitur paket.
     Cloudflare tidak menjual `.id` maupun `.co.id`, jadi hanya `.com` yang
     ditawarkan; biaya at-cost $10,46/tahun, dijual Rp250.000/tahun dengan
     marjin 24,5%.
   * **Dibayar di muka untuk 12 bulan, auto renewal.** Biaya Cloudflare juga
     ditagih di muka, jadi marjin per invoice tidak pernah tergerus churn —
     pelanggan yang berhenti di bulan ke-5 tetap menghasilkan marjin penuh.
   * **Tiga syarat yang tidak boleh dilewati:** (1) invoice tahunan dibuat
     otomatis saat `periodEnd` lewat, (2) suspend otomatis setelah 3 bulan
     tidak dibayar, (3) invoice hanya dibuat setelah `customDomainVerified
     = true`. Tanpa (2), 1.000 domain yang tidak ditagih memakan Rp188 juta
     per tahun — lebih besar dari seluruh laba add-on.
   * Add-on ini menambah omzet platform, jadi PPh Rezim A 0,5% juga diterapkan
     pada omzet domain.

E. Add-on "Paket Pendirian PT Perorangan"
   Model ditetapkan pemilik produk pada 2026-09-28 (PRD v2.0). Angka dan
   analisisnya di `docs/proyeksi-revenue.md` Bagian 11.

   NAMA. Ditutup sebagai "Paket Pendirian PT Perorangan", bukan "Jasa
   Legalitas PT Perorangan". Alasannya bukan selera copywriting:

   * **"Paket"** menyatakan apa yang dibeli — sekumpulan barang dengan isi
     terdefinisi. Bukan jenis jasa dan bukan klaim keahlian, jadi tidak ada
     yang perlu dibuktikan ke pelanggan.
   * **"Pendirian"** adalah kata yang benar-benar dicari pemilik usaha.
     Orang mengetik "pendirian PT" di Google, bukan "legalitas".
   * **"Legalitas" dihilangkan** karena memunculkan pertanyaan yang tidak
     perlu muncul sebelum orang menekan beli: "apakah mereka pengacara?".
     Isi paket ini semuanya pengurusan administratif, dan penamaan tidak
     boleh menjanjikan sesuatu yang tidak dikerjakan.

   ISI PAKET & BIAYA RESMI. Satu-satunya biaya cash adalah PNBP:

   | Item | Asal | Biaya |
   |---|---|---|
   | Pendaftaran AHU/SABH + Sertifikat Pendaftaran | PNBP negara | **Rp50.000** |
   | NIB (OSS) | gratis | Rp0 |
   | NPWP Elektronik | gratis | Rp0 |
   | Logo perusahaan | dikerjakan sendiri | Rp0 |
   | **Total** | | **Rp50.000** |

   Sumber tarif: **PP 30/2026** (berlaku 1 Agustus 2026) pasal 33 —
   "Pendaftaran Pendirian Perseroan Perorangan untuk Usaha Mikro dan Kecil,
   per permohonan 50.000,00". Dikonfirmasi di portal resmi Ditjen AHU.

   **TIDAK ADA "AKTA PERUSAHAAN".** Dokumen itu tidak pernah terbit untuk PT
   Perseroan Perorangan:

   * PT Persekutuan Modal → akta notaris, wajib.
   * **PT Perseroan Perorangan → Pernyataan Pendirian yang diisi sendiri
     secara elektronik di SABH.** Bukan akta, dan tidak ada notaris.

   FurniTech adalah Perseroan Perorangan, jadi struktur yang dijual adalah
   strukturnya sendiri. Yang diserahkan: **Pernyataan Pendirian (e-Akta) +
   Sertifikat Pendaftaran Perseroan Perorangan**, bukan akta.

   MODEL JUAL. Satu kali, di luar paket langganan, dibeli terpisah.

   * **Dipasang sebagai titik masuk, bukan produk etalase.** Diperkenalkan di
     langkah "Paket" atau "Bayar" wizard pendaftaran — tempat orang sedang
     bertransaksi — dan setelah pembayaran langganan berhasil.
   * Setelah dibayar, **tok FurniTech-nya dibuat dalam sesi yang sama**.
     Kalau tidak, FurniTech sudah mendapat Rp450.000 tanpa hubungan apa pun
     dengan produknya, dan orang itu tidak akan pernah kembali.
   * Rp50.000 PNBP **tidak boleh masuk ke dalam harga paket** dan tidak
     boleh disembunyikan: biaya negara itu milik pelanggan, bukan margin.

   BATAS YANG MESTI DITULIS DI HALAMAN. Satu kalimat, dan bukan opsional:
   *"Pelayanan administrasi dan pengurusan dokumen, bukan konsultasi
   hukum."* Seluruh pekerjaan di paket ini adalah pengisian formulir
   administratif — cek ketersediaan nama di AHU, memilih KBLI, mengurus NIB
   dan NPWP. Tidak ada satu pun yang masuk kategori pemberian nasihat hukum,
   representasi klien, atau penafsiran aturan. Batas ini juga yang melindungi
   FurniTech dari ekspektasi yang naik sendiri.

   PEMASARAN. **Jangan memakai kata "murah"** di halaman mana pun.
   Rp500.000 itu murah kalau yang diterimanya benar-benar NIB Indonesia yang
   bisa dipakai ke bank dan tender, dan mahal kalau hanya nama di sertifikat.
   Menempelkan kata "murah" membuat orang mengira yang dibeli cuma nama.

3. Tech Stack & Arsitektur Sistem
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER INTERFACE                         │
│   Next.js (App Router) + Tailwind CSS + shadcn/ui + Phosphor Icons       │
│   Tampilan responsif: Mobile / Tablet / Desktop                          │
│            [Phase 1: PWA | Phase 2: Next.js + Capacitor]               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ROUTING & MULTI-TENANCY                           │
│   proxy.ts (Next 16) + Cloudflare for SaaS API (Custom Domains)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND & DATABASE SERVICES                     │
│         Supabase (PostgreSQL + Supabase Auth + Supabase Storage)       │
│                     ORM: Drizzle ORM (Single DB + RLS)                 │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
┌──────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│  PAYMENT & PAYOUT    │ │    NOTIFIKASI      │ │   CRON SCHEDULER     │
│ Midtrans Core & Payouts│ │ WhatsApp (wa.me) │ │  (tanpa cron)     │
└──────────────────────┘ └────────────────────┘ └──────────────────────┘

 * Frontend: Next.js (App Router), Tailwind CSS v4, shadcn/ui di atas
   Base UI, Phosphor Icons (inline SVG, offline-safe).
 * Database & ORM: PostgreSQL (Supabase) diakses menggunakan Drizzle ORM.
 * Arsitektur Multi-Tenant: Single Database dengan isolasi data berbasis tenant_id dan Supabase Row Level Security (RLS).
 * Authentication: Supabase Auth (Email/Password & Magic Link).
 * Domain Routing: proxy.ts + Cloudflare for SaaS (Custom Hostnames API).
   Catatan: pada Next.js 16 middleware.ts sudah deprecated, digantikan proxy.ts
   dengan fungsi export `proxy` dan runtime Node.js.
 * Notifikasi WhatsApp: TIDAK memakai gateway API pihak ketiga. Foto progres
   dikirim manual oleh tukang lewat tautan `wa.me` (§4 Modul 4).
 * Notifikasi Push: Firebase Cloud Messaging (Push Notification PWA/Mobile).
 * Cron Job: TIDAK dipakai lagi untuk pencairan — pemicunya bukti pengiriman
   yang diunggah kurir (Modul 3).
 * Hosting & Source Control: Vercel (Hosting Platform) & GitHub (Repository Codebase).
 * Rencana Rilis Aplikasi: lengkap di §7.
 * Fase 1: Progressive Web App (PWA) — dipasang, dapat diinstal, offline-capable.
 * Fase 2: Hybrid Mobile App (Next.js + Capacitor untuk Android & iOS).
### 3.1 Persyaratan Tampilan Responsif (lintas modul)

Semua halaman WAJIB dapat dipakai pada tiga ukuran layar. Ini bukan sesuatu yang
bisa diabaikan: target pengguna utama adalah tukang yang memakai HP di bengkel, dan
pemilik toko yang memakai tablet atau laptop di kantor.

 * Mobile — lebar 375px sampai 767px. Titik Samsun untuk tukang: antrean
   produksi dan unggah foto progres harus nyaman dipakai satu tangan. Navigasi
   berubah menjadi menu ringkas, bukan deretan menu penuh.
 * Tablet — 768px sampai 1023px. Titik nyaman untuk admin penjualan dan
   pemilik toko saat Away dari meja kerja.
 * Desktop — 1024px ke atas. Tata letak dua atau tiga kolom untuk daftar dan
   detail; tabel boleh tampil penuh.

Aturan yang berlaku untuk semua modul:
 * Tidak ada lebar tetap (px) pada konten; pakai kontainer responsif.
 * Tabel data meluaphorizontal dengan sendirinya di layar sempit, atau berubah
   menjadi daftar kartu di bawah breakpoint md.
 * Target sentuh sekurang-kurangnya 44 x 44px pada layar sentuh.
 * Tidak ada informasi yang hanya tersedia lewat hover.
 * Tata letak tetap berfungsi pada 200% zoom dan ukuran teks yang dinaikkan pengguna.
 * Gambar produk & foto progres diberi rasio tetap supaya tidak menggeser
   tata letak saat dimuat.

4. Spesifikasi Modul & Fitur Platform
Modul 1: Toko Online Pembeli (Storefront / Front-Office)
 * Dynamic Tenant Rendering:
   * Menampilkan toko berdasarkan host akses. **Subdomain gratis
     `namatoko.mebeltech.com` tersedia di semua paket dan tidak perlu
     konfigurasi apa pun** — tenant langsung aktif setelah membayar. Custom
     domain `namatoko.com` opsional lewat add-on Rp250.000/tahun (§2.D);
     sampai tagihannya aktif dan terverifikasi, toko tetap hidup di
     subdomain.
 * Katalog Produk & Variansi:
   * Detail dimensi (P \times L \times T), pilihan jenis kayu, warna finishing, dan kain pelapis.
 * Kalkulasi Ongkir Otomatis (All-In Shipping Pricing):
   * Pembeli memilih Kota/Kabupaten alamat pengiriman saat checkout.
   * Alamat disimpan di Supabase (customer_addresses).
   * Sistem melakukan kalkulasi otomatis berbasis matriks tarif kargo kota tujuan:
     
 * Checkout & Midtrans Gateway:
   * Pembayaran non-COD ditampung di akun escrow FurniTech via Midtrans,
     kanal Virtual Account saja.
   * Pembeli membayar `harga produk + ongkir` apa adanya. Platform Service
     Fee 0%; fee gateway Rp 4.440 dipotong dari bagian pengrajin (§2.C).
   * Satu pesanan = satu pembayaran. Skema DP + pelunasan tidak dipakai di
     storefront karena akan mengalikan fee masuk dua kali.
 * Metode Bayar (Virtual Account & COD):
   * COD (Bayar di Tempat): uang diterima langsung oleh kurir pengrajin, atau
     pembeli transfer ke rekening pengrajin yang nomor dan atas namanya
     ditampilkan otomatis oleh aplikasi. **Tidak ada biaya Midtrans sama
     sekali** — tidak ada transaksi masuk maupun pencairan.
   * Bukti COD: foto bukti penerimaan uang (tunai) atau foto bukti transfer,
     diunggah kurir ke aplikasi. Tanpa bukti itu, pesanan COD tidak dianggap
     lunas.
   * Risiko penolakan pembayaran dan sengketa COD sepenuhnya ditanggung
     pengrajin. FurniTech tidak ikut campsur, dan tidak imposing biaya
     tambahan ke pembeli.

Modul 1a: Kurir & Bukti Pengiriman
   * Peran baru **Kurir**, ditunjuk pengrajin. Aksesnya sangat dibatasi:
     hanya halaman yang memuat daftar pengiriman yang ditugaskan kepadanya,
     dan hanya dua aksi — mengunggah foto bukti, dan memasukkan tanda tangan
     digital pelanggan. Tidak ada akses katalog, keuangan, atau pesanan lain.
   * Alur bukti penerimaan: kurir memfoto barang di tangan pelanggan, lalu
     pelanggan menandatangani langsung di layar HP kurir. Keduanya diunggah
     sebagai satu bukti.
   * **Tidak ada langkah yang menunggu pembeli.** Pelanggan tidak memakai
     aplikasi sama sekali. Ini yang menghapus risiko uang terkunci permanen:
     uang hanya keluar kalau bukti sudah diunggah, jadi kalau bukti tidak
     pernah diunggah, tidak ada uang yang tertahan.
   * Bukti yang diunggah inilah yang memicu pencairan otomatis (Modul 3).
Modul 2: Dashboard Internal Pengrajin (Back-Office)
 * Manajemen Peran & Akses (RBAC via Supabase RLS):
   * Owner (Pemilik): Akses penuh keuangan, saldo, request payout, laporan, & manajemen tim.
   * Admin Penjualan: Kelola katalog produk, chat, dan status pesanan.
   * Tukang / Tim Produksi: Tampilan ringkas di HP untuk melihat antrean produksi & mengunggah foto progres pengerjaan (Visual Progress Tracker).
 * Visual Progress Tracker:
   * Tim tukang mengubah status pesanan memakai LIMA tahap, disertai unggahan
     foto bukti dari tempat kerja:
     1. Bahan Dipotong (bahan_dipotong) — bahan sudah dipotong sesuai ukuran.
     2. Perakitan (perakitan) — komponen disambung, belum finishing.
     3. Finishing (finishing) — cat/pelapis dan penyelesaian permukaan sudah diterapkan.
     4. Quality Control (qc) — pemeriksaan mutu hasil pengerjaan.
     5. Packing (packing) — dikemas siap kirim.
   * Pemetaan tahap ke status pesanan ditetapkan di satu berkas kode
     (src/lib/order-status.ts) agar tidak bercabang di beberapa tempat:
     bahan_dipotong & perakitan → in_production, finishing & qc → quality_control,
     packing → ready_to_ship.
   * Warna indikator tiap tahap mengikuti DESIGN.md §3.
 * Pencatatan Pesanan Kustom:
   * Modul input spesifikasi khusus jika ada permintaan ukuran/desain luar katalog standar.
Modul 3: Otomatisasi Payout (Midtrans Payouts)
 * **Pemicu: bukti pengiriman, bukan jadwal.** Jadwal 06.00/18.00 WIB yang
   pernah ada DIHAPUS. Begitu kurir mengunggah foto barang diterima dan tanda
   tangan pelanggan (Modul 1a), sistem langsung memanggil API Payouts. Tidak
   ada cron-job.org lagi untuk pencairan.
 * Alur Pencairan:
   * Sistem menambah saldo pengrajin sebesar
     `total pesanan − fee platform (0) − Rp 4.440` untuk setiap pesanan yang
     lunas (§2.C).
   * Mengirim payout via API Midtrans Payouts (produk ini sebelumnya bernama
     IRIS) ke rekening bank pengrajin. `POST /payouts` secara resmi
     menerima banyak payout dalam satu permintaan.
   * Nominal yang ditransfer = saldo pengrajin pada saat itu dikurangi biaya
     pencairan **Rp 5.550 per penerima**, yang ditanggung pengrajin.
   * Tidak ada ambang minimum pencairan. Tidak ada batch kosong: kalau tidak
     ada yang siap dicairkan, tidak ada payout yang dibuat sama sekali.
   * Setiap permintaan memakai `iris-idempotency-key` yang unik. Ini yang
     membuat payout ganda mustahil secara struktural, bukan hanya karena
     kita menjaga idempotensi sendiri.
   * Fee dihitung ulang di server dari `orders`, tidak pernah dari nilai yang
     dikirim klien.
   * Kalau konstanta fee belum diisi, pencairan DIBLOKIR dengan pesan yang
     bisa dibaca — bukan memakai 0.
 * Rekening pengrajin diverifikasi saat pendaftaran lewat
   `POST /account_validation` dari Payouts, dan WAJIB terverifikasi sebelum
   produk ditayangkan. Nama pemilik rekening yang dikembalikan Midtrans
   disimpan terpisah dari nama yang diketik pengrajin; kalau berbeda,
   pengrajin yang memutuskan — bukan sistem yang memilih diam-diam.
Modul 4: Kirim Foto Progres ke Pembeli (tautan WhatsApp)
 * STATUS SAAT INI: hanya alur foto progres yang diimplementasikan. Alur notifikasi
   otomatis (checkout, pembayaran, payout) BELUM ADA — lihat "Pekerjaan yang
   Ditunda" di bawah modul ini.
 * Alur yang berjalan sekarang:
   * Di Antrean Produksi, tiap pesanan punya tombol "Kirim lewat WhatsApp".
   * Tombol membuka `wa.me` dengan nomor pembeli (sudah ternormalisasi ke
     format 628…) dan pesan pembuka yang menyebut nama pembeli & kode pesanan.
   * Foto dipilih sendiri oleh tukang di WhatsApp, lalu dikirim.
   * Aplikasi tidak mengirim foto apa pun. Label tombol dan teks pendamping
     menyatakan ini terbuka, agar pengguna tidak mencari-cari alasan foto belum
     terkirim setelah menekan sekali.
 * Normalisasi nomor: wajib, karena `wa.me` menolak nomor diawali 0 sedangkan
   data bisa tersimpan sebagai 08xx, 628xx, atau +62 812-3456-7890. Dilakukan
   satu kali di server (`src/lib/wa-link.ts`), bukan di komponen.
 * Alasan tidak memakai Fonnte atau gateway WA lain:
   1. Foto progres disimpan di bucket privat dan hanya dilayani lewat signed
      URL berumur satu jam. Gateway WA bisa mengirim teks dan satu tautan, tidak
      bisa melampirkan foto — jadi pesan otomatis hanya sampai sebagai "produksi
      Anda sudah di tahap Finishing", tanpa bukti pekerjaan sama sekali.
   2. Tukang sudah memegang HP-nya di bengkel. Berhenti sebentar untuk
      melampirkan foto di WhatsApp jauh lebih sedikit gesekan daripada mengisi
      form lalu mengunggah berkas.
   3. Percakapan menjadi dua arah. Pembeli hampir selalu membalas — "warna yang
      lebih terang bisa?", "kapan selesai?" — dan tidak ada tugas yang lebih
      penting bagi tukang daripada menjawab pembeli.
   4. Tanpa pihak ketiga: tidak ada kredensial yang bisa kedaluwarsa, tidak ada
      biaya per pesan, dan tidak ada layanan yang bisa menolak pengiriman.
 * Yang dikorbankan, dan itu keputusan sadar: percakapan terjadi di WhatsApp,
   bukan di FurniTech. FurniTech tidak tahu pesan terkirim atau dibaca, dan
   timeline pesanan tidak mencatat "pembeli sudah diberi tahu". Untuk tahap
   produk ini trade-off itu diterima, karena yang paling penting adalah bukti
   fotonya sampai kepada pembeli.
 * CATATAN KUOTA: tidak ada lagi kuota notifikasi WhatsApp per paket (§2.B).
   Tabel `notification_usage` tetap ada di skema untuk keperluan kuota push
   notification di Sprint 6, dan kolom `monthlyWaQuota` sudah dihapus dari
   `src/lib/plans.ts` supaya tidak ada batas yang tidak ditegakkan.
 * PEKERJAAN YANG DITUNDA (belum ada di roadmap saat ini):
   * Notifikasi otomatis saat checkout baru dan konfirmasi pembayaran.
   * Notifikasi bukti pencairan ke owner (06.00 & 18.00 WIB).
   * Kalau notifikasi otomatis nanti dibutuhkan, yang hilang bukan hanya
     "kirim pesan", melainkan CATATAN bahwa pesan terkirim. `wa.me` tidak
     memberi status pengiriman maupun pembacaan, jadi sistem otomatis akan
     memakai gateway WA berbayar (mis. lewat WhatsApp Business API Meta),
     yang biayanya harus masuk ke model paket langganan.
Modul 5: Super Admin Panel & SaaS Billing Engine (FurniTech sebagai SaaS Owner)
 * Dashboard Platform:
   * Direktori seluruh tenant beserta status langganan & domain yang dipakai.
   * Monitoring MRR, GMV, dan beban gateway yang dibayar pengrajin. Pendapatan
     platform berasal dari langganan saja — fee platform sudah dihapus.
   * **Pengaturan fee platform dan harga paket langganan**, dapat diubah
     owner kapan saja. Harga yang sudah terbit di sebuah invoice TIDAK ikut
     berubah: invoice mengunci harga saat dibuat, jadi pengrajin yang sedang
     berjalan tidakerie suddenly ditagih lebih mahal.
   * Impersonate Login untuk troubleshooting tenant (wajib tercatat di audit log).
 * SaaS Onboarding & Billing:
   * Registrasi pengrajin + pemilihan paket (Basic/Pro/Max) dengan pembayaran
     Midtrans Core di awal pendaftaran. Tetap tanpa free trial.
   * Riwayat invoice, renewal, serta upgrade/downgrade plan.
   * **Manajemen Custom Domain**: verifikasi domain (CNAME + TXT) via
     Cloudflare for SaaS API, penagihan add-on tahunan, dan suspend otomatis
     setelah 3 bulan tidak dibayar (§2.D). Invoice add-on TIDAK boleh dibuat
     sebelum `customDomainVerified = true`.
   * **Penagihan add-on "Paket Pendirian PT Perorangan"** (§2.E): invoice
     `leg-` issued pada langkah pembayaran wizard, **hanya untuk tenant yang
     aktivasi melalui webhook langganan**. Webhook `leg-` tidak boleh menulis
     `subscriptionExpiresAt` maupun mengubah status langganan — kalau tidak,
     satu invoice tambahan diam-diam memberi satu tahun langganan gratis.
 * Audit & Keamanan:
   * Audit log integrasi pihak ketiga (Midtrans Core/Payouts, Cloudflare, Meta/
     WhatsApp Business API bila notifikasi otomatis-poorongan diaktifkan nanti).
   * Peran super_admin bersifat global (tenant_id kosong) dan HANYA dapat
     ditetapkan lewat kode server-side yang tepercaya, tidak boleh berasal dari
     metadata pendaftaran yang dikirim klien.
5. Skema Struktur Database (Drizzle ORM & Supabase RLS)
Rancangan tabel utama dengan isolasi tenant_id. Kolom uang memakai bigint
(satuan rupiah penuh tanpa desimal) karena Rupiah tidak memakai satuan pecahan;
stok bahan tetap numeric karena satuannya dapat pecahan (m3, Liter).
 * tenants: Data pengrajin, domain (slug & custom domain + status verifikasinya),
   paket langganan (Basic/Pro/Max), periode langganan, dan data rekening bank
   tujuan payout. `custom_domain` punya unique index: satu tenant satu domain,
   dan domain yang bentrok ditolak database, bukan menimpa.
 * users: Profil pengguna (Super Admin, Owner, Admin Penjualan, Tukang) terhubung
   ke auth.users.id; tenant_id kosong untuk super_admin.
 * products: Katalog mebel terisolasi per tenant_id (dimensi P x L x T, jenis kayu,
   finishing, harga dasar, galeri foto).
 * materials: Inventaris bahan baku (kayu, finishing, hardware, busa) + ambang
   stok minimum untuk Low Stock Alert.
 * customer_addresses: Alamat pengiriman pembeli agar dapat dipakai ulang.
 * shipping_rates: Matriks tarif kargo per kota/kabupaten milik pengrajin.
 * orders & order_items: Transaksi pembeli, status pembayaran, rincian biaya
   (subtotal, ongkir, total all-in), DP/pelunasan, fee Midtrans Rp 4.440 per
   invoice, platform fee (default 0), saldo bersih pengrajin, serta referensi
   transaksi Midtrans. Fee MDR tidak dipakai karena kanal pembayaran hanya VA
   dan COD (§2.C).
 * production_progress: Tahapan pengerjaan + URL foto progres produksi dari tukang.
 * payout_logs & payout_items: Riwayat eksekusi payout pada pukul 06.00 & 18.00 WIB
   beserta rincian order yang tercakup dalam setiap batch payout, dan biaya
   pencairan Rp 5.000 per eksekusi.
 * saas_invoices: Tagihan langganan SaaS (paket, periode, nominal, status,
   Midtrans). Table yang sama juga dipakai untuk tagihan add-on custom domain — perlu
   `item_type` supaya webhook tahu invoice itu domain atau langganan, dan
   `orderId` berawalan berbeda (`saas-` vs `dom-`) supaya aktivasi tenant
   tidak ikut tersalut, dan `leg-` untuk tagihan paket pendirian PT
   Perorangan (§2.E) yang sekali bayar dan tidak boleh memulai periode
   langganan apa pun.
 * integration_audit_logs: Jejak integrasi Midtrans, Cloudflare, Meta/WhatsApp
   Business API, Firebase.
 * notification_usage: Pemakaian kuota notifikasi WhatsApp per bulan per tenant.
6. Milestones & Timeline Pengembangan
Cakupan sprint mengikuti ROADMAP.md (6 sprint); urutan di bawah diselaraskan dengan
nama sprint di ROADMAP.md.
 * Sprint 1 — Foundation, DB Schema & Multi-Tenant Routing:
   * Next.js App Router + Tailwind, skema Drizzle, Supabase Auth, RLS tenant_id.
   * proxy.ts untuk subdomain & custom domain via Cloudflare for SaaS.
 * Sprint 2 — Super Admin Panel & SaaS Billing Engine:
   * Dashboard platform (MRR, GMV, beban gateway pengrajin), registrasi &
     pembayaran langganan, dan pengaturan harga paket serta fee platform.
 * Sprint 3 — Back-Office (Dashboard, Order, RBAC & Inventory):
   * Dashboard toko, manajemen katalog & variasi, Custom Order Builder (DP/pelunasan),
     inventaris bahan baku dengan Low Stock Alert, inbox CS.
 * Sprint 4 — Visual Progress Tracker & Kirim Foto Progres via WhatsApp:
   * Antarmuka mobile untuk tukang & unggah foto progres.
   * Tautan `wa.me` di Antrean Produksi agar tukang bisa mengirim foto ke
     pembeli. Notifikasi otomatis (checkout, pembayaran, payout) ditunda —
     lihat §4 Modul 4.
 * Sprint 5 — Storefront Public (Catalog, Auto-Ongkir & Checkout Midtrans):
   * Katalog & filter per tenant, kalkulasi ongkir per kota, checkout escrow,
     halaman order tracking publik, widget live chat.
 * Sprint 6 — Auto-Payout (pemicu bukti), PWA & QA:
   * Engine payout otomatis begitu bukti pengiriman masuk.
   * PWA, Firebase push, audit keamanan RLS, dan deployment Vercel Production.

7. Rencana Rilis: Phase 1 (PWA) & Phase 2 (Native)

FurniTech_bind_two_release dengan alasan yang berbeda.

7.1 Phase 1 — Progressive Web App (PWA)
Deliverable Phase 1 adalah PWA yang bisa dipasang di layar utama HP dan tetap
berguna saat koneksi tidak stabil.
 * manifest.json: nama aplikasi FurniTech, ikon, warna tema slate-900 dan
   amber-600, display standalone.
 * Service Worker untuk cache shell aplikasi (halaman, aset, CSS, JavaScript).
 * Halaman tetap dapat dibuka saat offline, dan menampilkan penanda bahwa sedang luring.
 * Install prompt di browser yang mendukung; pengingat untuk menambahkan
   ke home screen khusus iOS.
 * Firebase Cloud Messaging untuk push notification (pembaruan status pesanan
   & progres produksi).
 * Verifikasi Lighthouse untuk performa, A11y, dan PWA.
Catatan: PWA memakai Service Worker. Pada Phase 2 Service Worker tidak lagi
menjadi lapisan offline utama karena aset sudah berada di dalam paket aplikasi.

7.2 Phase 2 — Hybrid Mobile App (Next.js + Capacitor, Android & iOS)
Phase 2 membungkus aplikasi yang sama menjadi aplikasi native melalui
Capacitor, khusus untuk dua platform:
 * Android — paket APK/AAB, target SDK terbaru, build & rilis ke Google Play.
 * iOS — paket Xcode, build & rilis ke App Store.
 * Satu basis kode: Next.js App Router, Tailwind, dan Server Action yang sama.
   Tidak ada penulisan ulang antarmuka untuk native.

Keputusan arsitektur yang sudah diambil untuk Phase 2:
 * Mode A (dipakai untuk rilis pertama): aplikasi native memanggil URL Vercel
   yang sudah produksi lewat `server.url` pada capacitor.config.ts. Seluruh
   logika server tetap di server, jadi tidak ada duplikasi.
 * Konsekuensi mode A yang harus disadari: aplikasi tidak punya kemampuan
   offline, dan pembungkus webview perlu fungsi yang nyata agar tidak ditolak
   toko aplikasi (Apple App Store 4.2 minimum functionality, Google Play
   minimum functionality). UI khusus tukang, kamera untuk foto progres, dan
   push notification native menjadi alasan fungsional yang sah.
 * Mode B (disiapkan untuk tahap berikutnya, belum dikerjakan): static export
   plus pemindahan mutasi ke panggilan Supabase dari klien, sehingga unggah
   foto bisa diantre saat luring.
 * Fondasi Mode B sudah disiapkan sejak awal: seluruh policy RLS tenant sudah
   benar dan teruji, jadi pemindahan mutasi ke sisi klien bersifat mekanis,
   bukan penulisan ulang.

Batasan yang harus dipahami sebelum Phase 2:
 * Arsitektur sekarang TIDAK dapat di-static-export. Aplikasi memakai Server
   Action, proxy.ts, dan koneksi PostgreSQL langsung. Karena itu mode A
   menjadi pilihan, bukan sekadar preferensi.
 * Ikon memakai inline SVG (Phosphor), bukan icon font dari CDN. Icon font
   yang diambil dari jaringan akan hilang saat laring dan menyebabkan
   kedipan tampilan pada setiap aplikasi dibuka.
 * Domain milik FurniTech belum ada. Selama ini tenant diakses lewat path
   (/t/<slug>); mode host-based aktif begitu domain tersedia tanpa perubahan
   kode.

7.3 Prasyarat & Definition of Done tiap Fase
Phase 1 (PWA):
 * Aplikasi terpasang di layar utama dan dapat dibuka ulang.
 * Shell aplikasi tetap termuat saat luring dengan penanda yang jelas.
 * Push notification sampai ke perangkat.
 * Skor Lighthouse PWA & Performance memenuhi target yang ditetapkan.
Phase 2 (Native):
 * Satu basis kode berjalan di Android dan iOS.
 * Alur inti yang dipakai tukang — login, melihat antrean, mengunggah foto
   progres — berjalan dari perangkat nyata, bukan hanya simulator.
 * Foto progres bisa diambil langsung lewat kamera pada perangkat.
 * Notifikasi push masuk sebagai notifikasi native.
 * Build rilis siap diajukan ke Google Play dan App Store.
