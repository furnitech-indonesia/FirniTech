Product Requirement Document (PRD) — FurniTech
Nama Produk: FurniTech
Tipe Platform: SaaS Multi-Tenant (B2B2C E-Commerce & Internal Operations for Furniture Makers)
Versi PRD: 1.6
Status: Approved for Development
Catatan Revisi:
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
 * Paket Basic: Rp300.000 / bulan (atau Rp3.240.000 / tahun)
 * Paket Pro: Rp500.000 / bulan (atau Rp5.400.000 / tahun)
 * Paket Max: Rp1.000.000 / bulan (atau Rp10.800.000 / tahun)
 * Kebijakan Free Trial: Tidak Ada. Pengrajin wajib memilih dan membayar paket langganan saat pendaftaran awal.
B. Matriks Fitur & Batasan Paket (Feature Differentiation)
| Fitur / Spesifikasi | Basic (Rp300rb/bln) | Pro (Rp500rb/bln) | Max (Rp1jt/bln) |
|---|---|---|---|
| Custom Domain (namatoko.com) | Tersedia | Tersedia | Tersedia |
| Maksimal Katalog Produk | Hingga 20 Produk | Hingga 100 Produk | Unlimited Produk |
| Jumlah Akun Staf (RBAC) | 2 Akun (Owner + 1 Staf) | 5 Akun Staf/Tukang | Unlimited Akun Staf/Tukang |
| Kirim foto progres via WhatsApp | ✅ (tanpa batas) | ✅ (tanpa batas) | ✅ (tanpa batas) |
| Laporan Keuangan & Kas | Transaksi Dasar | Rekap Laba/Rugi Bulanan | Laporan Eksekutif & Analytics |
| Jadwal Pencairan (Payouts) | Included (2x/hari) | Included (2x/hari) | Included (2x/hari) |
C. Kebijakan Transaksi & Potongan Biaya (Fees)
   Model final ditetapkan pemilik produk pada 2026-09-27 (PRD v1.6). Angka,
   sumber, dan risikonya: `docs/midtrans-fee.md`. Konstanta dan rumusnya
   tinggal di `src/lib/fees.ts` — satu-satunya tempat angkanya ditulis.
   * **Kanal pembayaran: HANYA Virtual Account** — BCA, BNI, BRI, BSI,
     Danamon, Permata. Alasan ekonomi: fee VA Rp 4.000 datar per transaksi,
     sedangkan semua kanal lain memakai MDR persen yang merupakan lapisan
     biaya tambahan. Konsekuensinya fee menjadi **konstanta**, bukan tabel
     per channel.
   * **CIMB VA dan SeaBank dinonaktifkan** karena batas maksimum nominalnya
     (Rp 250 juta dan Rp 100 juta) terlalu kecil untuk pesanan mebel.
   * **Pembagian beban:**
     - `feeMasuk` Rp 4.440 → **ditanggung pengrajin**
     - `feePayout` Rp 5.000 → **ditanggung platform**, dari saldo merchant
       balance FurniTech, **per batch** (dua slot/hari = Rp 10.000/hari)
   * **Platform Service Fee 1,5% dihitung dari `totalAmount`** (subtotal
     produk + ongkir) dan **tidak dipotong apa pun**.
   * **Fee Midtrans dicatat sebagai BEBAN**, bukan pengurangan pendapatan.

   RUMUS
   ```
   platformFee  = 1,5% × totalAmount
   feeMasuk     = Rp4.440   per transaksi  → pengrajin
   feePayout    = Rp5.000   per batch      → platform (merchant balance)

   escrow masuk     = totalAmount − feeMasuk
   saldo pengrajin += totalAmount − platformFee − feeMasuk
   saat payout     : saldo ditransfer = saldo UTUH (tanpa potongan)
   pendapatan platform = platformFee
   ```

   CONTOH — pesanan Rp 10.000.000
   ```
   yang dibayar pembeli            Rp10.000.000
   escrow dikreditkan Midtrans     Rp 9.995.560
   platform fee 1,5% → FurniTech   Rp  150.000
   fee masuk         → pengrajin    Rp    4.440
   diterima pengrajin              Rp 9.845.560
   Cek buku: 150.000 + 9.845.560 = 9.995.560 ✓

   terpisah, dari merchant balance platform:
     fee payout 2 batch/hari       Rp  10.000/hari
   ```

   CATATAN YANG WAJIB DIPERHATIKAN
   * Beban pengrajin sekarang hanya Rp 4.440 per pesanan — **datar**, jadi
     proporsinya turundrastis untuk pesanan besar: 0,04% untuk pesanan Rp 10
     juta, 1,48% untuk Rp 300.000, 4,44% untuk Rp 100.000. Mebel custom
     selalu berada di rentang pertama, dan **tidak perlu minimum nilai
     pesanan**.
   * Biaya ini tetap harus tertulis dan terlihat sebelum pengrajin memasang
     harga: di wizard pendaftaran, di ringkasan saldo siap cair, dan di
     rincian detail pesanan. Fee pencairan Rp 5.000 juga perlu disebut
     walaupun ditanggung platform, karena itu alasan FurniTech menetapkan
     ambang minimum pencairan — kalau tidak, pengrajin akan bertanya
     "kenapa saldo saya tidak dikirim?".
   * **Modal kalkulator biaya di modul produk** (`src/components/
     fee-calculator-dialog.tsx`) menampilkan rinciannya plus hitung mundur
     dari target pendapatan. Semua angkanya diimpor dari `src/lib/fees.ts`;
     ada tes yang mengunci agar tidak ada konstanta yang ditulis ulang di
     komponen.
   * Halaman lacak publik TIDAK BOLEH menampilkan rincian biaya ini.
     `test:lacak` tetap mengunci: margin, fee platform, dan fee gateway tidak
     boleh muncul di halaman yang dilihat pembeli.
   * Platform aman secara finansial kalau fee pencairan memang **per batch**:
     titik impas platform ada di Rp 333.333 per pesanan pada satu order per
     batch. **Kalau ternyata per-penerima**, 100 pengrajin dengan 1 order per
     batch berarti Rp 30 juta/bulan. Asumsi ini belum dikonfirmasi ke
     Midtrans dan **wajib dikonfirmasi sebelum produksi**.

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
│ Midtrans Core & IRIS │ │  WhatsApp (wa.me)  │ │    cron-job.org      │
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
 * Cron Job: cron-job.org (Trigger webhook pencairan & pembaruan status sistem).
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
   * Menampilkan toko berdasarkan host akses (namatoko.com atau namatoko.furnitech.id).
 * Katalog Produk & Variansi:
   * Detail dimensi (P \times L \times T), pilihan jenis kayu, warna finishing, dan kain pelapis.
 * Kalkulasi Ongkir Otomatis (All-In Shipping Pricing):
   * Pembeli memilih Kota/Kabupaten alamat pengiriman saat checkout.
   * Alamat disimpan di Supabase (customer_addresses).
   * Sistem melakukan kalkulasi otomatis berbasis matriks tarif kargo kota tujuan:
     
 * Checkout & Midtrans Gateway:
 * Pembayaran ditampung di akun escrow FurniTech via Midtrans, kanal Bank
   Transfer / Virtual Account saja.
 * Pembeli membayar `harga produk + ongkir` apa adanya. Platform Service Fee
   1,5% dipotong dari nilai itu, dan fee Midtrans Rp 4.440 dipotong dari fee
   platform — bagian pengrajin tidak pernah kena pemotongan (§2.C).
 * Satu pesanan = satu pembayaran. Skema DP + pelunasan tidak dipakai di
   storefront karena akan mengalikan fee masuk dua kali.
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
Modul 3: Otomatisasi Payout (Midtrans Payouts) & Cron
 * Jadwal Pencairan Dana:
   * Dieksekusi otomatis via cron-job.org ke webhook FurniTech setiap pukul 06.00 WIB dan 18.00 WIB.
 * Alur Pencairan:
   * Sistem menambah saldo pengrajin sebesar
     `total pesanan − 1,5% × total pesanan − Rp 4.440` untuk setiap pesanan
     yang lunas (§2.C).
   * Mengirim instruksi batch payout via API Midtrans Payouts (produk ini
     sebelumnya bernama IRIS) ke rekening bank pengrajin. Satu eksekusi
     pencairan per pengrajin per slot, bukan per order.
   * Nominal yang ditransfer = saldo pengrajin pada saat itu, **penuh**.
     Biaya pencairan Rp 5.000 ditanggung platform dari merchant balance,
     dihitung sekali per batch bukan per pengrajin.
   * Pengrajin dengan saldo di bawah ambang minimum tidak ditransfer pada
     slot itu; saldonya tetap tersedia untuk slot berikutnya.
   * Kalau tidak ada saldo yang memenuhi ambang pada sebuah slot, tidak ada
     payout yang dibuat sama sekali — bukan membuat batch kosong.
   * Fee dihitung ulang di server dari `orders`, tidak pernah dari nilai yang
     dikirim klien.
   * Kalau konstanta fee belum diisi, pencairan DIBLOKIR dengan pesan yang bisa
     dibaca — bukan memakai 0.
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
   * Monitoring MRR, GMV, dan pendapatan Platform Service Fee (1.5%).
   * Impersonate Login untuk troubleshooting tenant (wajib tercatat di audit log).
 * SaaS Onboarding & Billing:
   * Registrasi pengrajin + pemilihan paket (Basic/Pro/Max) dengan pembayaran
     Midtrans Core di awal pendaftaran. Tetap tanpa free trial.
   * Riwayat invoice, renewal, serta upgrade/downgrade plan.
   * Manajemen Custom Domain melalui Cloudflare for SaaS API.
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
   tujuan payout.
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
   invoice, platform fee 1.5%, saldo bersih pengrajin, serta referensi
   transaksi Midtrans. Fee MDR tidak dipakai karena kanal pembayaran hanya
   Bank Transfer/VA (§2.C).
 * production_progress: Tahapan pengerjaan + URL foto progres produksi dari tukang.
 * payout_logs & payout_items: Riwayat eksekusi payout pada pukul 06.00 & 18.00 WIB
   beserta rincian order yang tercakup dalam setiap batch payout, dan biaya
   pencairan Rp 5.000 per eksekusi.
 * saas_invoices: Tagihan langganan SaaS (paket, periode, nominal, status, Midtrans).
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
   * Dashboard platform (MRR, GMV, fee 1.5%), registrasi & pembayaran langganan.
   * Modul custom domain via Cloudflare API.
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
 * Sprint 6 — Auto-Payout, Cron, PWA & QA:
   * Engine payout batch 2x/hari (06.00 & 18.00 WIB) via cron-job.org.
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
