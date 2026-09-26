Product Requirement Document (PRD) — FurniTech
Nama Produk: FurniTech
Tipe Platform: SaaS Multi-Tenant (B2B2C E-Commerce & Internal Operations for Furniture Makers)
Versi PRD: 1.0
Status: Approved for Development
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
│   Next.js (App Router) + Tailwind CSS + Google Icons + Firebase Push   │
│            [Phase 1: PWA | Phase 2: Next.js + Capacitor]               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ROUTING & MULTI-TENANCY                           │
│     Next.js Middleware + Cloudflare for SaaS API (Custom Domains)      │
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

 * Frontend: Next.js (App Router), Tailwind CSS, Google Symbols/Icons.
 * Database & ORM: PostgreSQL (Supabase) diakses menggunakan Drizzle ORM.
 * Arsitektur Multi-Tenant: Single Database dengan isolasi data berbasis tenant_id dan Supabase Row Level Security (RLS).
 * Authentication: Supabase Auth (Email/Password & Magic Link).
 * Domain Routing: Next.js Middleware + Cloudflare for SaaS (Custom Hostnames API).
 * Notifikasi: Fonnte (WhatsApp Gateway API) & Firebase Cloud Messaging (Push Notification PWA/Mobile).
 * Cron Job: cron-job.org (Trigger webhook pencairan IRIS & pembaruan status sistem).
 * Hosting & Source Control: Vercel (Hosting Platform) & GitHub (Repository Codebase).
 * Rencana Rilis Aplikasi:
   * Fase 1: Progressive Web App (PWA)
   * Fase 2: Hybrid Mobile App (Next.js + Capacitor untuk Android & iOS)
4. Spesifikasi Modul & Fitur Platform
Modul 1: Toko Online Pembeli (Storefront / Front-Office)
 * Dynamic Tenant Rendering:
   * Menampilkan toko berdasarkan host akses (namatoko.com atau namatoko.furnitech.com).
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
   * Tim tukang mengubah status pesanan (Bahan Dipotong \rightarrow Perakitan \rightarrow Finishing \rightarrow Pengemasan) disertai unggahan foto bukti dari tempat kerja.
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
5. Skema Struktur Database (Drizzle ORM & Supabase RLS)
Rancangan tabel utama dengan isolasi tenant_id:
 * tenants: Memuat data pengrajin, domain, paket langganan (Basic/Pro/Max), status pembayaran langganan, dan data rekening bank IRIS.
 * users: Memuat data pengguna (Owner, Admin Penjualan, Tukang) terhubung ke tenants.id dengan atribut role.
 * products: Katalog mebel terisolasi per tenant_id.
 * shipping_rates: Matriks tarif kargo per kota/kabupaten milik pengrajin.
 * orders & order_items: Data transaksi pembeli, status pembayaran, dan total harga include ongkir.
 * production_progress: Catatan tahapan pengerjaan dan URL foto progres produksi dari tukang.
 * payout_logs: Riwayat eksekusi IRIS otomatis pada pukul 06.00 & 18.00 WIB.
6. Milestones & Timeline Pengembangan
 * Sprint 1 — Core Architecture & Authentication:
   * Setup Next.js, Drizzle ORM, Supabase Auth, & Supabase RLS multi-tenant.
   * Integration Cloudflare for SaaS API untuk custom domain routing.
 * Sprint 2 — Back-Office & RBAC:
   * Dashboard Owner, Admin Penjualan, dan antarmuka mobile-friendly untuk Tukang.
   * Fitur unggah foto progres produksi & manajemen katalog.
 * Sprint 3 — Storefront & Shipping Calculation:
   * Halaman publik toko online, integrasi tabel alamat Supabase & kalkulasi ongkir per kota.
   * Integration Midtrans Core API (Escrow Payment).
 * Sprint 4 — IRIS Payout, Fonnte WA, & Cron:
   * Integration Midtrans IRIS API & Cron Job (06.00 & 18.00 WIB).
   * Setup trigger notifikasi Fonnte WhatsApp API.
 * Sprint 5 — Phase 1 Release (PWA) & QA:
   * Pengujian end-to-end transaksi, pengujian PWA, dan deployment Vercel Production.
