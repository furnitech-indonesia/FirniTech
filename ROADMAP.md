ROADMAP.md — FurniTech SaaS Development Roadmap
Proyek: FurniTech (Multi-Tenant SaaS for Furniture Craftsmen)
Target Rilis: Phase 1 (PWA) & Phase 2 (Hybrid Mobile Native: Android + iOS via Capacitor)
Status: Sprint 1–3 selesai. Sprint 10 Fase A–D (UI Redesign) SELESAI.
Sprint 4 (Visual Progress Tracker & kirim foto via WhatsApp) SELESAI.
Berikutnya Sprint 5 (Storefront Public), lalu Sprint 6 (PWA/QA), lalu Sprint 7–8
(Native).
Tech Stack Utama: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
shadcn/ui (Base UI), Phosphor Icons, Drizzle ORM + Zod, Supabase (PostgreSQL +
Auth + RLS + Storage), Midtrans (Core + IRIS), Cloudflare for SaaS, Firebase FCM,
cron-job.org, Vercel, Capacitor (Android & iOS).
CATATAN: Fonnte WhatsApp API TIDAK dipakai. Notifikasi foto progres dikirim
manual oleh tukang lewat tautan `wa.me` — alasan lengkapnya di PRD.md §4 Modul 4.
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
[Sprint 4] Visual Progress Tracker (Carpenter UI) & Kirim Foto via WhatsApp
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
     * Audit log integrasi API (Midtrans IRIS, Cloudflare, dan Meta/WhatsApp
       Business API bila notifikasi otomatis diaktifkan nanti).
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
📍 Sprint 4: Visual Progress Tracker (Carpenter UI) & Kirim Foto via WhatsApp
Fokus Utama: Antarmuka khusus tukang kayu, dan cara tukang mengirim foto progres
kepada pembeli.
 * Deliverables Utama:
   * Carpenter Mobile Interface:
     * Layout mobile-first khusus tukang kayu (antrean pekerjaan & detail dimensi mebel).
     * Fitur unggah foto progres produksi, 5 tahap: Bahan Dipotong \rightarrow Perakitan \rightarrow
       Finishing \rightarrow QC \rightarrow Packing (pemetaan ke status pesanan di src/lib/order-status.ts).
   * Kirim Foto Progres ke Pembeli (tautan WhatsApp, BUKAN gateway API):
     * Tombol "Kirim lewat WhatsApp" di Antrean Produksi → membuka `wa.me`
       dengan nomor pembeli (sudah ternormalisasi ke 628…) dan pesan pembuka
       yang menyebut nama pembeli & kode pesanan. Foto dipilih tukang sendiri
       di WhatsApp. Logikanya di src/lib/wa-link.ts.
   * NOTIFIKASI OTOMATIS (checkout, konfirmasi pembayaran, bukti payout IRIS)
     TIDAK DIBAWA. Belum ada di roadmap dan belum ada di kode. Pertimbangannya
     ada di PRD.md §4 Modul 4: foto progres hidup di bucket privat dengan
     signed URL berumur satu jam, jadi gateway WA hanya bisa mengirim teks dan
     tautan — tidak bisa melampirkan foto, padahal bukti itulah yang dibutuhkan
     pembeli. Tidak ada gateway WA yang berarti juga tidak ada kuota WA per
     paket; `monthlyWaQuota` sudah dihapus dari src/lib/plans.ts.
 * Definition of Done (DoD):
   * Tukang dapat mengambil dan mengunggah foto progres dari HP di bengkel,
     lalu mengirimnya ke pembeli lewat WhatsApp dalam satu ketukan.
   * UI tukang mobile-first: target sentuh >= 44px, satu tangan, tetap jelas di
     layar 375px tanpa geser horizontal.
 * STATUS: SELESAI.
   * Antrean Produksi (src/components/carpenter-queue.tsx) menampilkan hanya
     pesanan yang ditugaskan ke tukang itu, belum selesai, urutan lama ke baru.
     Dimensi tampil dalam cm (`P 180 × L 90 × T 75 cm`) karena itulah yang
     dipakai memotong kayu — sebelumnya sama sekali tidak terlihat. Lima tahap
     produksi ditampilkan sebagai strip ber-`aria-hidden` dengan teksnya yang
     membawa makna, karena lima label tidak muat di 375px. Tidak ada satu pun
     nominal rupiah di layar ini.
   * `npm run test:carpenter` (16 pemeriksaan, Playwright pada 375px) mengunci
     DoD: tanpa geser horizontal, tanpa target sentuh di bawah 44px, pesanan
     rekan kerja tidak bocor, pesanan selesai tidak muncul, tahap yang tampil
     adalah yang terakhir, dan tautan `wa.me` memakai format 628… bukan
     nomor mentah dari database.
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
 * STATUS: 1 dari 4 bagian selesai.
   * Bagian 1 (SELESAI) — storefront: beranda, katalog, filter kategori, detail
     produk. Detail di commit `2245e72`.
   * Bagian 2, 3, 4 — rencana rinci di bawah. Semua fakta di bagian tersebut
     sudah diverifikasi terhadap layanan sungguhan, bukan diasumsikan.

━━━ Sprint 5, Rencana Lanjutan ━━━

Bagian 2 — Form Alamat Bertingkat (desa → kecamatan → kab/kota → provinsi)

ALUR PEMBELI. Pembeli storefront tidak punya akun, jadi "alamat saya" tidak
bisa memakai sesi. Alamat di-key per (tenant, nomor HP) di `customer_addresses`
— jadi identitas pembelinya adalah nomor HP yang dia ketik sendiri:
  1. Pembeli mengetik nomor HP.
  2. Kalau ada alamat tersimpan untuk (tenant, nomor itu), alamatnya
     ditampilkan sebagai pilihan. Alamat yang pernah dipakai ditandai
     "terakhir dipakai" supaya tidak perlu mengetik ulang.
  3. Kalau tidak ada, pembeli diarahkan ke form alamat lengkap.
Nomor HP adalah kunci, bukan autentikasi. Konsekuensinya pembeli bisa melihat
dan memakai alamat milik orang lain yang tahu nomornya. Ini diterima karena
alamat bukan data rahasia dan sudah jadi perilaku umum di marketplace, TAPI
artinya form alamat TIDAK BOLEH menampilkan data apa pun selain alamat itu
sendiri (tidak ada total pesanan, tidak ada riwayat).

STRUKTUR FORM (cascading, bukan empat dropdown bebas):
  Provinsi → Kabupaten/Kota → Kecamatan → Desa/Kelurahan
  Diisi manual: nama jalan, nomor rumah, RT, RW
  Otomatis: kode pos, titik peta
  Mengubah level mana pun mengosongkan semua level di bawahnya. Kalau
  provinsi diganti, kabupaten yang sebelumnya terpilih pasti tidak lagi benar —
  dan membiarkannya terpilih menghasilkan alamat yang tidak pernah ada.

SUMBER DATA WILAYAH — SUDAH DIVERIFIKASI, BUKAN ASUMSI.
  `https://www.emsifa.com/api-wilayah-indonesia/v2`
  Diuji pada 2026-09-27, semua level 200 OK:
    /v2/provinces.json                 6,9 KB   34 provinsi (ada lat/lng)
    /v2/regencies/32.json              5,1 KB   kabupaten/kota (ada lat/lng)
    /v2/districts/32.73.json            3,2 KB   kecamatan
    /v2/villages/32.73.01.json          ±1-8 KB  desa + `postal_code` + lat/lng
    /v2/villages/32.73.01.1001.json     0,4 KB  satu desa, lengkap dengan
                                               rantai induknya
  Gratis, tanpa API key, tanpa pendaftaran. Sumber data: Kepmendagri/BIG untuk
  wilayah, `cahyadsn/wilayah_kodepos` untuk kode pos (83.762 desa/kelurahan,
  10.632 kode pos).
  JEBakan format id yang sudah teridentifikasi: v2 memakai id BERTITIK
  ("32.73", "32.73.01", "32.73.01.1001"), sedangkan v1 memakai id rapat
  ("3273", "3273010"). Memakai id v1 ke endpoint v2 membalas 404. Semua
  pemanggilan harus memakai id yang dikembalikan level sebelumnya apa adanya.

  KODE POS OTOMATIS — BISA. `postal_code` tersedia di level desa, jadi
  tidak perlu lookup tambahan. Tapi dua pengecualian yang harus ditangani di UI:
   - Beberapa desa tidak punya kode pos. Field dibiarkan kosong dan tetap bisa
     diisi manual; tidak boleh memblokir checkout.
   - Satu kode pos bisa dipakai banyak desa, jadi isi field di dalam <datalist>
     (bukan select) supaya pembeli bisa mengoreksi kalau kode pos desanya ternyata berbeda
     dari kode pos yang terisi otomatis. Memaksa angka dari API saat
     kenyataannya berbeda adalah kesalahan yang menyebalkan, bukan membantu.

  KECIL BUNDLE. Level desa ada ~83.000, jadi MEMASUKKAN SEMUA KE BUNDLE akan
  beberapa MB dan tidak mungkin untuk PWA yang harus tetap ramping di 375px.
  Strateginya: provinsi + kabupaten di-cache ke repo sebagai snapshot (~13 KB
  bersama, muat di bundle utama), sedangkan kecamatan dan desa diambil sesuai
  permintaan dan di-cache di `localStorage`. Satu kabupaten = 3,2 KB, satu
  kecamatan = 1-8 KB; cukup kecil untuk diambil on-demand.
  Fallback WAJIB: kalau API mati, form harus tetap bisa diisi manual (pembeli
    mengetik nama desa sendiri). Bergantung pada pihak ketiga di tengah
    checkout adalah cara memastikan orang tidak bisa memesan.

  PRIVAASI. Koordinat GPS adalah lokasi rumah orang. Disimpan, tapi TIDAK PERNAH
  dirender di halaman lacak publik. `customer_addresses` sudah punya RLS.

Bagian 3 — Kalkulator Ongkir Instan & Pembuatan Order

ONGKIR DIHITUNG DARI KABUPATEN/KOTA, BUKAN KOTA BEBIAS. Ini jebakan
  integrasi yang sudah teridentifikasi sekarang, sebelum koding:
  - Pohon wilayah memberi nama resmi: "Kota Bandung", "Kabupaten Bogor".
  - `shipping_rates.cityName` diisi bebas oleh pengrajin, dan data seed sekarang
    berisi "Bandung" dan "Jakarta" — TANPA awalan.
  - Lookup yang membandingkan teks apa adanya tidak akan pernah cocok, dan
    kalau sampai cocok untuk kasus kebetulan, tarif yang terpakai bisa milik
    kota yang salah.
  Perbaikan: tambah kolom `regencyId` ke `shipping_rates`, isi dari pohon
  wilayah (backfill dari nama yang sudah ada dengan normalisasi awalan), lalu
    lookup memakai id. Nama tetap disimpan dan tetap ditampilkan.

KOTA YANG BELUM PUNYA TARIF TIDAK BOLEH BERHASIL DENGAN ONGKIR 0. Ini adalah
kegagalan diam-diam yang paling berbahaya di checkout: pembeli melihat total
murah, menekan bayar, dan uang yang baru terkumpul adalah ongkir yang
seharusnya ditagih. Kalau tidak ada tarif, checkout DIBLOKIR dengan pesan
"Belum ada tarif ongkir untuk kota ini" plus saran menghubungi toko. Form
kota tujuan menampilkan daftar kota yang memang ditserve pengrajin ini, jadi
seharusnya jarang terjadi — tapi kalau terjadi, harus kelihatan.

PERHITUNGAN TOTAL (semua dihitung ulang di server, tidak pernah percaya
  angka dari klien):
  itemsSubtotal = Σ(harga produk × jumlah)
  shippingFee  = tarif dari `shipping_rates` untuk regency tujuan
  totalAmount  = itemsSubtotal + shippingFee
  Nominal dikirim klien hanya `productId` + `qty`; harga dan ongkir selalu
  diambil ulang dari database. Kalau tidak, orang bisa mengirim
  `qty: 1, price: 1` dan membeli meja 12 juta seharga satu rupiah.

Bagian 4 — Halaman Lacak Pesanan Publik

KODE PESANAN SAJA TIDAK CUKUP. Halaman ini publik dan tanpa login, dan isinya
  berisi nama pembeli, alamat lengkap, foto progres, dan nomor resi.
  `generateOrderCode()` menghasilkan `ORD-` + 9 karakter base36, jadi ruang
  tebaknya ~10^14 dan TIDAK bisa ditebak dengan enumerate. Yang realistis
  adalah kode yang BERBAGIAN: difoto dari struk, dikirim lewat chat, atau
  diberikan kepada orang yang seharusnya tidak tahu. Enumerasi bukan
  ancamannya — kebocoran yang tidak disengaja adalah ancamannya.
  Karena itu verifikasi ditambahkan: kode pesanan + nomor HP harus cocok.
  Verifikasi ini murah dan menutup jalur yang paling mungkin terjadi.
  Halaman yang gagal tidak boleh memberi tahu apakah kode pesanan itu ada —
  itu mengubah halaman lacak menjadi alat untuk menebak keberadaan pesanan.

ISINYA: status pesanan, timeline 5 tahap beserta foto progres, nomor resi
  kargo, dan RINGKASAN items. Alamat ditampilkan sebagian (jalan + kota),
  koordinat GPS tidak pernah.

CATATAN SOAL PETA. maplibre-gl berukuran 20,7 MB belum dikompres, jadi WAJIB
  di-import dinamis (`await import(...)`) hanya saat form peta dibuka. Kalau
  masuk bundle utama, ini menambah ~1 MB ke PWA yang harus tetap ringan.
  Tile OSM dari `tile.openstreetmap.org` DILARANG untuk penggunaan komersial
  atau berskala besar oleh kebijakan penggunaan OSM — jadi URL tile harus
  lewat environment variable, OSM hanya untuk pengembangan, dan produksi
  wajib menunjuk penyedia yang punya perjanjian. Atribut © OpenStreetMap
  contributors wajib tampil.
  Yang lebih penting: PETA HARUS OPSIONAL. `latitude`/`longitude` nullable,
  form alamat harus bisa diselesaikan tanpa peta, dan kondisi luring harus
  punya state yang jelas — bukan peta putih kosong yang membuat orang mengira
  aplikasinya rusak. Untuk kurir kargo yang perlu bernavigasi, yang paling
  berguna tetap alamat lengkap + RT/RW, bukan peta. Peta adalah pelengkap,
  bukan syarat. Geolokasi browser dipakai untuk mengisi titik awal, dan itu
  perlu izin eksplisit dari pengguna — jangan diminta diam-diam.

KESULITAN YANG TERBUKA (perlu keputusan, bukan hanya pengerjaan):
  - Kredensial Midtrans masih kosong, jadi pembuatan order tidak bisa diuji
    end-to-end. Sama seperti Fase D, kodenya bisa ditulis dan diuji sampai
    pembuatan order-nya, tetapi tidak sampai pembayarannya benar-benar masuk.
  - Peta tidak bisa dipakai di produksi tanpa memilih penyedia tile berbayar.
  - Data wilayah berasal dari layanan gratis pihak ketiga. Kalau nanti dipindah
    ke database (83.000 baris), dependensi eksternal ini hilang — tapi itu
    pekerjaan tersendiri dengan biaya migrasi sendiri.
  - Tagihan ongkir untuk alamat di luar jangkauan tenant tidak ada konsepnya
    sama sekali. Kalau pengrajin hanya punya tarif untuk 3 kota, pembeli di
    kota ke-4 akan terkunci. Perilaku yang masuk akal: pengrajin bisa menandai
    satu tarif default, ATAU pembeli diberi tahu kargo ke kotanya belum
    dilayani. Ini perlu keputusan produk, bukan default teknis.

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
 * STATUS: SELESAI. Split layout: panel kiri berisi tiga pilar dan harga
 *   (dibaca dari `PLANS`, bukan diketik), panel kanan berisi form. Di mobile
 *   urutannya dibalik — form dulu, panel branding disembunyikan kecuali logo
 *   dan nama.
 * Perbaikan struktural: kedua cara masuk dipisah dengan TAB, bukan ditumpuk
 *   di bawah garis pemisah. Versi pertama menumpuk dua form dalam satu kartu,
 *   sehingga ada DUA field berlabel "Email" dan tidak ada yang bisa tahu email
 *   itu milik form yang mana. Dengan tab hanya satu field email yang ada di
 *   DOM, jadi masalahnya hilang secara struktural, bukan diberi label yang
 *   lebih jelas.
 * Aturan taste-skill yang dipakai: §4.3 anti-center (split), §4.5 satu
 *   intent satu label dan tombol tidak boleh membungkus, §4.6 label di atas
 *   input tanpa placeholder-as-label, §4.7 headline maksimal 2 baris,
 *   §3.E `min-h-[100dvh]` bukan `h-screen`, §6.B reduced motion.
 * Aturan taste-skill yang DITOLAK karena bertentangan dengan DESIGN.md:
 *   §4.1 "avoid Inter" (Inter dipilih bersurat untuk keterbacaan angka),
 *   §8 "dark mode mandatory" (DESIGN.md §6 light mode penuh).
 * DoD: Tidak ada informasi yang hanya tersedia lewat hover; alur magic link
   tetap berfungsi. `test:visual` mengunci jumlah field email dan pergantian
   tab.

📍 Fase D — Wizard Registrasi Pengrajin
 * Halaman registrasi belum ada sama sekali di repo (yang ada hanya /login),
   meski `tenants`, `saas_invoices`, dan enum terkait sudah lengkap di
   `src/db/schema/`. Sprint ini membangun kodenya, bukan tabelnya.
 * Empat langkah: (1) Akun, (2) Workshop, (3) Paket, (4) Bayar.
 * `provisionOwner()` membuat user Supabase dengan `role: owner` yang
   ditetapkan DI SERVER (trigger `handle_new_user` menolak role tinggi dari
   metadata, dan `tenant_id` selalu NULL saat signup), lalu menulis `tenants` +
   `users` dengan `tenantId` yang sama, lalu `saas_invoices` berstatus
   `pending`.
   PENYIMPANGAN dari rencana awal di atas: `provisionOwner()` TIDAK diekspor
   dari `src/lib/auth/actions.ts`, tapi hidup di `src/lib/auth/provision.ts`
   yang bukan `"use server"`. Alasannya teknis, bukan selera: setiap export
   dari berkas `"use server"` menjadi endpoint HTTP yang bisa dipanggil siapa
   saja dengan argumen pilihan sendiri. Kalau fungsi provisioning diekspor dari
   sana, siapa pun bisa meminta pembuatan akun owner tanpa email terverifikasi
   dan tanpa bayar. `registerOwner` di `actions.ts` tetap Server Action-nya; ia
   hanya memanggil fungsi server biasa yang sudah tervalidasi skemanya.
 * Slug workshop divalidasi unik terhadap `tenant_slug_idx`, dengan live
   preview URL `/t/<slug>` saat pengetikan. Pengecekannya di `SlugField`
   (src/components/register-form.tsx) memakai `useWatch` + debounce 400ms,
   bukan `watch()` yang dipanggil saat render.
 * Migrasi `0005`: `subscriptionStatusEnum` ditambah nilai `pending`. Tanpa itu
   tenant yang belum membayar akan otomatis `active`.
 * Pembayaran: `createSaasCharge()` (src/lib/midtrans/saas.ts) memakai Midtrans
   Snap lewat `fetch` — tanpa dependensi baru. `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
   sengaja TIDAK dipakai: kita mengarahkan ke halaman Snap milik Midtrans, jadi
   tidak ada popup Snap JS di browser dan tidak perlu kunci publishable.
 * `app/api/webhooks/midtrans/route.ts` — satu-satunya jalan yang menyalakan
   tenant. Verifikasi `X-Midtrans-Signature` (sha512) WAJIB, status `pending`
   tidak boleh mengaktifkan, `subscriptionExpiresAt` baru diisi setelah bayar,
   dan handler-nya idempoten karena Midtrans mengirim notifikasi berulang.
 * Gerbang tenant yang belum bayar ada di DUA tempat dan keduanya wajib:
   `app/dashboard/layout.tsx` (redirect ke `/menunggu-pembayaran`) dan
   `src/lib/tenants.ts` (tenant `isActive = false` tidak ter-resolve menjadi
   toko publik, jadi tidak muncul di `/t/<slug>`).
 * STATUS: SELESAI. Langkah 4 sudah teruji end-to-end terhadap route webhook
   sungguhan memakai kunci uji lokal: 15 pemeriksaan lulus, termasuk bahwa
   `pending` tidak mengaktifkan, signature palsu ditolak 403, nominal tidak
   cocok ditolak 400, settlement sah mengactivate tenant sekaligus mengisi
   periode langganan, notifikasi berulang diabaikan, dan jejak audit tertulis.
 * Kredensial Midtrans Core yang asli masih belum diisi. Perilaku yang dipilih
   sementara: pendaftaran TIDAK berhenti, tenant dibuat dan ditandai `pending`,
   lalu pengguna diberi tahu pembayarannya belum bisa diproses. Alasannya,
   menolak pendaftaran membuat wizard sama sekali tidak bisa diuji, sedangkan
   pendaftaran yang berhasil lalu gagal di langkah pembayaran menyisakan akun
   yang emailnya sudah terpakai sehingga tidak bisa diulang. Tenant seperti
   ini diaktifkan manual lewat panel super admin.
 * Pengujian: `npm run test:register` (6 pemeriksaan wizard lewat Playwright)
   dan `npm run test:webhook` (23 pemeriksaan keamanan: aturan skema,
   verifikasi signature, dan gerbang tenant). Uji gerbang memakai tenant
   sampling yang dibuat lalu dihapus, bukan dengan menonaktifkan tenant seed.
 * DoD: Pengrajin baru dapat mendaftar, memilih paket, dan tenant-nya aktif
   hanya setelah pembayaran terverifikasi — TERPENUHI.

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
# NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak dipakai: pendaftaran mengarahkan ke
# halaman Snap Midtrans, jadi tidak ada popup Snap JS di browser.
MIDTRANS_SERVER_KEY="SB-Mid-server-xxx"
# "true" = sandbox (app.midtrans.com), "false" = produksi.
MIDTRANS_IS_SANDBOX="true"
MIDTRANS_IRIS_API_KEY="IRIS-xxx"

# CLOUDFLARE FOR SAAS
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
CLOUDFLARE_ZONE_ID="your-zone-id"

# WHATSAPP — tidak memakai gateway API pihak ketiga.
# Foto progres dikirim manual oleh tukang lewat tautan wa.me
# (src/lib/wa-link.ts). Tidak ada kredensial yang perlu diisi.

# FIREBASE PUSH NOTIFICATION (PWA Phase 1 & Native Phase 2)
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-key"
FIREBASE_ADMIN_CREDENTIALS="your-firebase-admin-json"

# CAPACITOR (Phase 2) — ditulis di capacitor.config.ts, bukan di .env.
# Native memakai server.url yang menunjuk ke deployment Vercel produksi.
