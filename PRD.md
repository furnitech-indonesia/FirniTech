Product Requirement Document (PRD) — FurniTech
Nama Produk: FurniTech
Tipe Platform: SaaS Multi-Tenant (B2B2C E-Commerce & Internal Operations for Furniture Makers)
Versi PRD: 1.2
Status: Approved for Development
Catatan Revisi:
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
| Notifikasi WhatsApp (Fonnte) | Kuota Standar (100 WA/bln) | Kuota Sedang (500 WA/bln) | Unlimited WA Notification |
| Laporan Keuangan & Kas | Transaksi Dasar | Rekap Laba/Rugi Bulanan | Laporan Eksekutif & Analytics |
| Jadwal Payout IRIS | Included (2x/hari) | Included (2x/hari) | Included (2x/hari) |
C. Kebijakan Transaksi & Potongan Biaya (Fees)
 * Biaya Transfer Payout IRIS (06.00 & 18.00 WIB): Gratis (Sudah ditanggung/termasuk dalam biaya paket langganan FurniTech).
 * Payment Gateway Merchant Fee (Midtrans): Biaya MDR/potongan transaksi Midtrans dipotong langsung dari total nilai pembayaran sebelum sisa dana ditransfer ke saldo pengrajin.
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
│ Midtrans Core & IRIS │ │ Fonnte (WhatsApp)  │ │    cron-job.org      │
└──────────────────────┘ └────────────────────┘ └──────────────────────┘

 * Frontend: Next.js (App Router), Tailwind CSS v4, shadcn/ui di atas
   Base UI, Phosphor Icons (inline SVG, offline-safe).
 * Database & ORM: PostgreSQL (Supabase) diakses menggunakan Drizzle ORM.
 * Arsitektur Multi-Tenant: Single Database dengan isolasi data berbasis tenant_id dan Supabase Row Level Security (RLS).
 * Authentication: Supabase Auth (Email/Password & Magic Link).
 * Domain Routing: proxy.ts + Cloudflare for SaaS (Custom Hostnames API).
   Catatan: pada Next.js 16 middleware.ts sudah deprecated, digantikan proxy.ts
   dengan fungsi export `proxy` dan runtime Node.js.
 * Notifikasi: Fonnte (WhatsApp Gateway API) & Firebase Cloud Messaging (Push Notification PWA/Mobile).
 * Cron Job: cron-job.org (Trigger webhook pencairan IRIS & pembaruan status sistem).
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
   * Pembayaran ditampung di akun escrow FurniTech via Midtrans.
   * MDR Midtrans otomatis memotong total penerimaan.
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
Modul 3: Otomatisasi Payout (Midtrans IRIS) & Cron
 * Jadwal Pencairan Dana:
   * Dieksekusi otomatis via cron-job.org ke webhook FurniTech setiap pukul 06.00 WIB dan 18.00 WIB.
 * Alur Pencairan:
   * Sistem membaca saldo settled milik tenant yang sudah dikurangi potongan MDR Midtrans.
   * Mengirim instruksi batch payout via API Midtrans IRIS ke rekening bank pengrajin.
Modul 4: Integrasi Notifikasi WhatsApp (Fonnte API)
 * Picu Pesan Otomatis:
   * Checkout Baru: Kirim rincian pesanan dan petunjuk pembayaran ke WhatsApp Pembeli.
   * Pembayaran Diterima: Konfirmasi pembayaran berhasil dari Midtrans.
   * Update Progres Produksi: Kirim link foto progres pengerjaan mebel yang diunggah oleh tukang.
   * Notifikasi Payout: Kirim bukti transfer pencairan dana IRIS ke WhatsApp Owner Pengrajin (06.00 & 18.00 WIB).
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
   * Audit log integrasi pihak ketiga (Midtrans Core/IRIS, Cloudflare, Fonnte).
   * Peran super_admin bersifat global (tenant_id kosong) dan HANYA dapat
     ditetapkan lewat kode server-side yang tepercaya, tidak boleh berasal dari
     metadata pendaftaran yang dikirim klien.
5. Skema Struktur Database (Drizzle ORM & Supabase RLS)
Rancangan tabel utama dengan isolasi tenant_id. Kolom uang memakai bigint
(satuan rupiah penuh tanpa desimal) karena Rupiah tidak memakai satuan pecahan;
stok bahan tetap numeric karena satuannya dapat pecahan (m3, Liter).
 * tenants: Data pengrajin, domain (slug & custom domain + status verifikasinya),
   paket langganan (Basic/Pro/Max), periode langganan, dan data rekening bank IRIS.
 * users: Profil pengguna (Super Admin, Owner, Admin Penjualan, Tukang) terhubung
   ke auth.users.id; tenant_id kosong untuk super_admin.
 * products: Katalog mebel terisolasi per tenant_id (dimensi P x L x T, jenis kayu,
   finishing, harga dasar, galeri foto).
 * materials: Inventaris bahan baku (kayu, finishing, hardware, busa) + ambang
   stok minimum untuk Low Stock Alert.
 * customer_addresses: Alamat pengiriman pembeli agar dapat dipakai ulang.
 * shipping_rates: Matriks tarif kargo per kota/kabupaten milik pengrajin.
 * orders & order_items: Transaksi pembeli, status pembayaran, rincian biaya
   (subtotal, ongkir, total all-in), DP/pelunasan, fee MDR, fee platform 1.5%,
   saldo bersih pengrajin, serta referensi transaksi Midtrans.
 * production_progress: Tahapan pengerjaan + URL foto progres produksi dari tukang.
 * payout_logs & payout_items: Riwayat eksekusi IRIS pada pukul 06.00 & 18.00 WIB
   beserta rincian order yang tercakup dalam setiap batch payout.
 * saas_invoices: Tagihan langganan SaaS (paket, periode, nominal, status, Midtrans).
 * integration_audit_logs: Jejak integrasi Midtrans, Cloudflare, Fonnte, Firebase.
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
 * Sprint 4 — Visual Progress Tracker & WA Fonnte Engine:
   * Antarmuka mobile untuk tukang & unggah foto progres.
   * Trigger notifikasi WhatsApp (checkout, pembayaran, progres, resi, payout).
 * Sprint 5 — Storefront Public (Catalog, Auto-Ongkir & Checkout Midtrans):
   * Katalog & filter per tenant, kalkulasi ongkir per kota, checkout escrow,
     halaman order tracking publik, widget live chat.
 * Sprint 6 — IRIS Auto-Payout, Cron, PWA & QA:
   * Engine payout batch IRIS 2x/hari (06.00 & 18.00 WIB) via cron-job.org.
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
