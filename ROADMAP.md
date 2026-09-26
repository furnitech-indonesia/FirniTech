ROADMAP.md — FurniTech SaaS Development Roadmap
Proyek: FurniTech (Multi-Tenant SaaS for Furniture Craftsmen)
Target Rilis: Phase 1 (PWA) & Phase 2 (Hybrid Mobile Native: Android + iOS via Capacitor)
Status: Sprint 1–3 selesai. Sprint 10 Fase A–D (UI Redesign) sedang dikerjakan.
Sprint 4–6 (PWA) dan Sprint 7–8 (Native) menyusul.
Tech Stack Utama: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
shadcn/ui (Base UI), Phosphor Icons, Drizzle ORM + Zod, Supabase (PostgreSQL +
Auth + RLS + Storage), Midtrans (Core + IRIS), Cloudflare for SaaS, Fonnte WA
API, Firebase FCM, cron-job.org, Vercel, Capacitor (Android & iOS).
🗺️ Gambaran Umum Milestones
[Sprint 1] Foundation, DB Schema & Multi-Tenant Routing
   │
   ▼
[Sprint 2] Super Admin Panel & SaaS Billing Engine
   │
   ▼
[Sprint 3] Back-Office Craftsman (Dashboard, Order, RBAC & Inventory)
   │
   ▼
[Sprint 4] Visual Progress Tracker (Carpenter UI) & WA Fonnte Engine
   │
   ▼
[Sprint 5] Storefront Public (Catalog, Auto-Ongkir & Checkout Midtrans)
   │
   ▼
[Sprint 6] Midtrans IRIS Auto-Payout, Cron, PWA Optimization & QA
   │
   ▼
[Sprint 10] UI/UX Redesign — Stitch Design System
   │      (Fase A token → B landing → C login → D wizard registrasi)
   │
   ▼
[Sprint 7] Android Native App (Capacitor)
   │
   ▼
[Sprint 8] iOS Native App (Capacitor) & Rilis Produksi

Catatan urutan: Sprint 10 diletakkan setelah Sprint 6 karena redesign tidak
bergantung pada fitur bisnis apa pun — justru menambah risikonya kalau
dilakukan sebelum landing & login beres.

🏃 Sprint Breakdown & Execution Plan
📍 Sprint 1: Foundation, DB Schema & Multi-Tenant Routing
Fokus Utama: Inisialisasi arsitektur proyek, skema database Drizzle, isolasi tenant Supabase RLS, dan middleware routing Cloudflare SaaS.
 * Deliverables Utama:
   * Setup repositori Next.js (App Router) + Tailwind CSS + Google Material Symbols.
   * Implementasi skema Drizzle ORM lengkap di src/db/schema (Tabel tenants, users,
     products, materials, orders, order_items, production_progress, payout_logs,
     payout_items, shipping_rates, customer_addresses, saas_invoices).
   * Konfigurasi Supabase Auth & Row Level Security (RLS) berbasis tenant_id.
   * Implementasi proxy.ts untuk menangani subdomain (namatoko.furnitech.id) dan
     custom domain (namatoko.com) via Cloudflare for SaaS.
     Catatan: pada Next.js 16, middleware.ts sudah deprecated dan digantikan proxy.ts.
 * Definition of Done (DoD):
   * Database terhubung via Drizzle ORM dan migrasi berhasil.
   * Middleware sukses mengarahkan domain kustom ke tenant yang sesuai di Supabase.
📍 Sprint 2: Super Admin Panel & SaaS Billing Engine
Fokus Utama: Halaman pengawasan platform bagi penyedia layanan (SaaS Owner) dan alur registrasi/langganan mitra pengrajin.
 * Deliverables Utama:
   * Super Admin Dashboard:
     * Halaman direktori tenant, monitoring MRR, GMV, dan Impersonate Login.
     * Panel Global Financial Analytics (SaaS Subscription + Platform Fee 1.5%).
     * Audit log integrasi API (Midtrans IRIS, Cloudflare, Fonnte).
   * SaaS Onboarding & Billing:
     * Halaman registrasi pengrajin & pilih paket langganan (Basic Rp300rb, Pro Rp500rb, Max Rp1jt).
     * Integration Midtrans Core API untuk pembayaran langganan SaaS (Direct Payment without trial).
     * Modul penambahan Custom Domain via Cloudflare API.
 * Definition of Done (DoD):
   * Pengrajin baru dapat mendaftar, membayar langganan, dan mendapatkan akun tenant aktif secara otomatis.
   * Super Admin dapat memantau kesehatan seluruh ekosistem SaaS.
📍 Sprint 3: Back-Office Craftsman (Dashboard, Order, RBAC & Inventory)
Fokus Utama: Modul operasional internal untuk pemilik toko (Owner) dan admin penjualan.
 * Deliverables Utama:
   * Role-Based Access Control (RBAC):
     * Isolasi hak akses untuk Owner, Admin Penjualan, dan Tukang.
   * Management Core:
     * Dashboard Overview Toko (Statistik pesanan, pendapatan, saldo siap cair).
     * Modul Manajemen Katalog Produk & Variasi Mebel (Kayu, Finishing, Ukuran).
     * Modul Custom Order Builder (Input pesanan kustom & kalkulasi DP/Pelunasan).
     * Modul Inventaris Stok Bahan Baku (Kayu, cat, hardware) + Low Stock Alert.
     * Customer Service & Live Chat Inbox Dashboard.
 * Definition of Done (DoD):
   * Admin dapat membuat produk, mencatat pesanan kustom, dan mengelola stok bahan baku secara real-time.
   * Seluruh halaman back-office dapat dipakai di mobile, tablet, dan desktop.
📍 Sprint 4: Visual Progress Tracker (Carpenter UI) & WA Fonnte Engine
Fokus Utama: Antarmuka khusus tukang kayu dan otomatisasi notifikasi WhatsApp.
 * Deliverables Utama:
   * Carpenter Mobile Interface:
     * Layout mobile-first khusus tukang kayu (antrean pekerjaan & detail dimensi mebel).
     * Fitur unggah foto progres produksi, 5 tahap: Bahan Dipotong \rightarrow Perakitan \rightarrow
       Finishing \rightarrow QC \rightarrow Packing (pemetaan ke status pesanan di src/lib/order-status.ts).
   * WhatsApp Notification Engine (Fonnte API):
     * Handler pemicu notifikasi otomatis saat checkout, konfirmasi pembayaran, update foto progres pengerjaan, dan pengiriman resi kargo.
 * Definition of Done (DoD):
   * Tukang dapat mengambil dan mengunggah foto progres dari HP di bengkel, yang secara otomatis memicu pesan WhatsApp ke pembeli.
   * UI tukang mobile-first: target sentuh >= 44px, satu tangan, tetap jelas di
     layar 375px tanpa geser horizontal.
📍 Sprint 5: Storefront Public (Catalog, Auto-Ongkir & Checkout Midtrans)
Fokus Utama: Halaman toko online publik pembeli berbasis multi-tenant.
 * Deliverables Utama:
   * Dynamic Storefront Rendering:
     * Halaman Home, katalog, dan filter kategori produk berbasis tenant ID/domain.
   * All-In Shipping Calculator:
     * Integrasi penyimpanan alamat pelanggan di Supabase (customer_addresses).
     * Kalkulasi otomatis tarif kargo per kota tujuan yang ditambahkan ke total transaksi secara instan.
   * Checkout & Customer Portal:
     * Integration Midtrans Payment Gateway (Escrow Account FurniTech) dengan potongan MDR resmi.
     * Halaman publik Order Tracking (menampilkan timeline foto progres produksi & resi kargo).
     * Widget Live Chat Floating di toko online.
 * Definition of Done (DoD):
   * Pembeli dapat memilih produk, memasukkan kota tujuan, melihat total harga include ongkir kargo, dan membayar via Midtrans.
   * Storefront dapat dipakai di mobile, tablet, dan desktop; checkout di HP
     tidak memaksa mengetik dari nol.
📍 Sprint 6: Midtrans IRIS Auto-Payout, Cron, PWA Optimization & QA
Fokus Utama: Otomatisasi pencairan dana, pengujian end-to-end, dan persiapan rilis PWA.
 * Deliverables Utama:
   * Automated IRIS Payout Engine:
     * Integrasi Midtrans IRIS Batch Payout API.
     * Perhitungan otomatis pemotongan Platform Service Fee (1.5%) dan Midtrans MDR sebelum pencairan.
     * Setup cron-job.org webhook untuk eksekusi payout setiap pukul 06.00 WIB dan 18.00 WIB.
   * PWA & Performance Optimization:
     * Konfigurasi manifest.json, Service Workers, dan Firebase Push Notifications.
     * Cloudflare Image Optimization & caching strategy di Vercel.
   * End-to-End Testing & Security Audit:
     * Pengujian batas hak akses Supabase RLS.
     * Uji coba transaksi real/sandbox Midtrans & pencairan IRIS.
 * Definition of Done (DoD):
   * Sistem payout berjalan otomatis 2x sehari tanpa eror.
   * Aplikasi dapat diinstal sebagai PWA di perangkat seluler dan siap rilis ke publik.
   * Shell aplikasi tetap termuat saat luring dengan penanda yang jelas.
   * Push notification (Firebase FCM) sampai ke perangkat.
   * Seluruh halaman tetap rapi pada 375px, 768px, dan 1024px.
📍 Sprint 7: Android Native App (Capacitor)
Fokus Utama: Membungkus aplikasi PWA yang sudah jadi menjadi aplikasi native
Android dengan basis kode yang sama.
 * Deliverables Utama:
   * Inisialisasi Capacitor di repo ini (android/ + capacitor.config.ts).
   * Arsitektur Mode A: `server.url` menunjuk ke deployment Vercel produksi,
     sehingga seluruh logika server tetap di server.
   * Identitas aplikasi: appId, nama, ikon, splash screen, warna status bar.
   * Integrasi plugin native yang dibutuhkan alur tukang:
     * Kamera untuk mengambil foto progres langsung (bukan lewat input file).
     * Push notification native lewat Firebase FCM.
     * Status bar & orientation untuk pemakaian di bengkel.
   * Penyesuaian UI: navigasi ringkas untuk layar sentuh, target sentuh >= 44px.
 * Definition of Done (DoD):
   * Alur inti tukang — login, melihat antrean, mengambil foto, mengunggah
     progres — berjalan di perangkat Android nyata, bukan hanya emulator.
   * Aplikasi dapat dibangun menjadi AAB dan diunggah ke Google Play Console
     dalam mode internal testing.
   * Tidak ada kedipan tampilan saat aplikasi dibuka (ikon inline SVG, bukan
     icon font dari jaringan).

📍 Sprint 8: iOS Native App (Capacitor) & Rilis Produksi
Fokus Utama: Membangun padanan iOS dan menyiapkan rilis ke publik.
 * Deliverables Utama:
   * Inisialisasi platform iOS (ios/ + Xcode project).
   * Penyesuaian khusus iOS: safe area (notch & home indicator), keyboard
     avoidance saat mengisi form, dan gesture navigasi.
   * Privacy Manifest sesuai ketentuan Apple untuk data yang diakses.
   * Pengujian perangkat nyata untuk alur inti tukang.
   * Rilis: PWA tetap menjadi kanal Phase 1, native menjadi kanal tambahan.
 * Definition of Done (DoD):
   * Alur inti tukang berjalan di perangkat iOS nyata.
   * Build siap diajukan ke App Store Connect dengan screenshot sesuai ukuran
     perangkat yang diminta.
   * Rilis dua kanal (PWA + native) berjalan berdampingan tanpa bentrok data:
     session dan RLS tetap berlaku di kedua kanal.
 * Catatan arsitektur: Mode B (static export + mutasi sisi klien untuk
   kemampuan luring penuh) TIDAK dikerjakan pada sprint ini. Fondasinya sudah
   disiapkan sejak Sprint 1 melalui RLS tenant yang lengkap; cukup ketika
   waktunya dipindahkan, sifatnya mekanis.

📍 Sprint 9 (Opsional, Bersyarat): Mode B — Offline-First Native
Fokus Utama: Kemampuan luring penuh untuk tukang di bengkel tanpa sinyal.
 * Hanya dikerjakan bila umpan balik pengguna menunjukkan kebutuhan kuat.
 * Cakupan: static export, pemindahan mutasi ke panggilan Supabase dari klien,
   antrean unggah foto, dan sinkronisasi dua arah.
 * Perlu dua prasyarat — RLS sudah benar (sudah, sejak Sprint 1) dan
   operasi khusus server (payout IRIS, resolusi custom domain, signed URL
   storage) dipindah ke Edge Function terlebih dahulu.

🎨 Sprint 10: UI/UX Redesign — Penerapan Stitch Design System
Fokus Utama: Meningkatkan kualitas tampilan seluruh aplikasi dari tingkat
"fungsional" menjadi "profesional", memakai sistem desain yang sudah disetujui
(Stitch, lihat
`stitch/stitch_furnitech_furniture_saas_platform/furnitech_saas_system/DESIGN.md`).
Sprint ini TIDAK menambah fitur bisnis — tujuannya murni kualitas tampilan,
kecuali Fase D yang membangun alur registrasi yang memang belum ada.

Aturan yang mengikat sprint ini:
 * `DESIGN.md` (brand identity) tetap menjadi induk. Stitch adalah turunan dari
   brief yang sama, jadi 95% isinya sudah sama. Kalau Stitch bertentangan dengan
   DESIGN.md atau PRD, DESIGN.md/PRD yang menang.
 * Skill `taste-skill` (`.agents/skills/`) TIDAK dipakai. Arah estetikanya
   (font survivors, GSAP, bento, material brutalis) bertentangan dengan
   DESIGN.md dan dengan sifat aplikasi ini — dashboard operasional untuk
   pengrajin yang memakainya di bengkel, bukan halaman marketing. Yang diambil
   darinya hanya checklist aksesibilitas (skip-link, focus ring, reduced-motion,
   empty/loading/error state).
 * Konten tidak boleh dikarang. Tidak ada statistik fiktif, testimonial fiktif,
   promo fiktif, atau harga yang tidak ada di `src/lib/plans.ts`. Halaman publik
   yang menampilkan angka tidak berdasar = kebohongan yang bisa jadi masalah hukum.

📍 Fase A — Merge Token Stitch ke Design System (fondasi Fase B & C)
 * Mengganti sumber nilai di `app/globals.css` dengan nilai dari Stitch:
   skala tipografi eksplisit (display 40/48, headline-lg 32/40,
   headline-lg-mobile 26/34, title-md 16/24, body-md 14/20, label-sm 11/14),
   tiga level bayangan (card / card-hover / overlay), tiga level surface
   (container-low / high / highest), dan `font-feature-settings: "tnum" 1`
   agar kolom rupiah & dimensi rata vertikal.
 * Token status `pending` diubah dari kuning (yellow-600) menjadi amber
   (amber-600) mengikuti Stitch.
 * Menambahkan `prefers-reduced-motion` dan skip-to-content link.
 * Menyinkronkan `DESIGN.md` §2–§4 dengan nilai final supaya dokumen dan kode
   tidak berbeda.
 * DoD: `lint → typecheck → build` bersih dan 66 test tetap lulus; tidak ada
   perubahan visual selain angka, bayangan, dan density teks.

📍 Fase B — Landing Page Publik (/)
 * Struktur mengikuti desain Stitch; 100% konten ditulis ulang dari
   `src/lib/plans.ts`, `PRD.md`, dan `ROADMAP.md`.
 * Yang dibuang: bar promo fiktif, blok 4 statistik (belum ada pelanggan),
   dan blok testimonial (tidak ada pelanggan sungguhan).
 * CTA harus benar-benar bekerja — tombol CTA di halaman `/` saat ini
   `type="button"` tanpa handler, sehingga tidak melakukan apa pun.
 * DoD: Pengunjung dapat memahami apa itu FurniTech dalam 10 detik, melihat
   harga yang benar, dan mencapai /login atau /t/<slug> dalam 1 klik.
 * STATUS: SELESAI. Struktur mengikuti Stitch; seluruh konten ditulis ulang dari
   sumber data. Blok statistik dan testimoni Stitch dihapus karena tidak ada
   datanya. Tombol CTA yang tadinya `type="button"` tanpa handler sekarang
   tautan sungguhan.
 * Revisi kedua memulihkan blok yang hilang di versi pertama: header sticky
   dengan drawer mobile, mockup cockpit di hero (bento 4/5/3, dibangun dari
   DOM — bukan `<img>` dari CDN, karena DESIGN.md §5 melarang permintaan
   jaringan saat luring dan saat dibungkus Capacitor), blok split Custom
   Domain dan Order Kustom, toggle bulanan/tahunan di harga, dan footer
   3 kolom. Diskon dihitung `savingFor()` dari `plans.ts`, bukan diketik:
   Stitch menulis "Hemat 15%" padahal selisih harganya 10%.

📍 Fase C — Halaman Login
 * Split layout ala Stitch: panel kiri untuk branding dan daftar manfaat,
   panel kanan untuk form. Di mobile urutannya dibalik — form muncul lebih
   dulu, branding disembunyikan. Form adalah pekerjaan, bukan hiasan.
 * Menambahkan link "Lupa password", `aria-invalid` yang konsisten, dan fokus
   otomatis ke field pertama yang error.
 * DoD: Tidak ada informasi yang hanya tersedia lewat hover; alur magic link
   tetap berfungsi.

📍 Fase D — Wizard Registrasi Pengrajin
 * Halaman registrasi belum ada sama sekali di repo (yang ada hanya /login),
   meski `tenants`, `saas_invoices`, dan enum terkait sudah lengkap di
   `src/db/schema/`. Sprint ini membangun kodenya, bukan tabelnya.
 * Empat langkah: (1) Akun, (2) Workshop, (3) Paket, (4) Bayar.
 * `provisionOwner()` di `src/lib/auth/actions.ts`: membuat user Supabase
   dengan `role: owner` yang ditetapkan DI SERVER (trigger `handle_new_user`
   menolak role tinggi dari metadata, dan `tenant_id` selalu NULL saat signup),
   lalu menulis `tenants` + `users` dengan `tenantId` yang sama, lalu
   `saas_invoices` berstatus `pending`.
 * Slug workshop divalidasi unik terhadap `tenant_slug_idx`, dengan live
   preview URL `/t/<slug>` saat pengetikan.
 * Perlu migrasi: `subscriptionStatusEnum` belum punya nilai "menunggu bayar".
   Tanpa itu tenant yang belum membayar akan otomatis `active`.
 * Terblokir: kredensial Midtrans Core belum diisi (lihat bagian Environment).
   Kode charge akan ditulis, tetapi langkah 4 tidak dapat diuji end-to-end
   sampai kredensial asli tersedia. `tenants.isActive` dinyalakan oleh
   webhook Midtrans.
 * DoD: Pengrajin baru dapat mendaftar, memilih paket, dan tenant-nya aktif
   hanya setelah pembayaran terverifikasi.

⚙️ Environment Variables Required (.env.example)

Gunakan daftar ini saat mengonfigurasi GitHub Codespaces. Versi yang siap
disalin ada di file .env.example pada repositori.

# NEXT.JS & APP CONFIG
# Kosongkan ROOT_DOMAIN selama domain milik FurniTech belum tersedia: tenant
# lalu diakses lewat path /t/<slug>, dan mode host-based aktif otomatis begitu
# domain diisi (tanpa perubahan kode, tapi perlu build ulang).
NEXT_PUBLIC_APP_URL="https://app.vercel.app"
NEXT_PUBLIC_ROOT_DOMAIN=""

# SUPABASE (DATABASE, AUTH, STORAGE, RLS)
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_xxx"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_xxx"

# DATABASE DRIZZLE ORM
# DATABASE_URL -> transaction pooler port 6543 untuk query runtime.
# DIRECT_URL  -> session pooler port 5432, WAJIB untuk drizzle-kit migrate
#                karena drizzle-kit memakai pg_advisory_lock yang tidak
#                didukung transaction mode.
DATABASE_URL="postgresql://postgres.your-ref:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.your-ref:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# MIDTRANS PAYMENT & IRIS PAYOUT
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-xxx"
MIDTRANS_SERVER_KEY="SB-Mid-server-xxx"
MIDTRANS_IRIS_API_KEY="IRIS-xxx"

# CLOUDFLARE FOR SAAS
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
CLOUDFLARE_ZONE_ID="your-zone-id"

# FONNTE WHATSAPP API
FONNTE_API_TOKEN="your-fonnte-token"

# FIREBASE PUSH NOTIFICATION (PWA Phase 1 & Native Phase 2)
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-key"
FIREBASE_ADMIN_CREDENTIALS="your-firebase-admin-json"

# CAPACITOR (Phase 2) — ditulis di capacitor.config.ts, bukan di .env.
# Native memakai server.url yang menunjuk ke deployment Vercel produksi.
