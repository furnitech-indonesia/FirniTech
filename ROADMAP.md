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
 * STATUS: 4 dari 4 bagian selesai.
   * Bagian 1 (SELESAI) — storefront: beranda, katalog, filter kategori, detail
     produk. Commit `2245e72`.
   * Bagian 2 (SELESAI) — form alamat bertingkat + peta Leaflet. Commit
     `5fee35c`.
   * Bagian 3 (SELESAI) — tarif ongkir berbasis `regencyId` + CRUD di
     `/dashboard/pengaturan/ongkir`. Commit `5fee35c`.
   * Bagian 4 (SELESAI) — halaman lacak publik `/lacak`. Commit `3961d00`.
   * Checkout & pembayaran Midtrans (bagian 5, yang tidak ada di daftar
     aslinya) — sudah selesai juga, lihat "CHECKOUT & PEMBAYARAN MIDTRANS"
     di bawah.

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
  Perbaikan (SELESAI): kolom `regency_id` dan `is_default` sudah ditambahkan
  ke `shipping_rates` lewat migrasi 0008, plus `shipping_tenant_regency_uniq`
  (satu tarif per kabupaten) dan `shipping_one_default_uniq` (satu cadangan
  per tenant). Backfill dijalankan sadar-ambigu: "Surabaya" terpetakan ke
  35.78 karena kandidatnya tunggal; "Bandung" (2 kandidat) dan "Jakarta"
  (0 kandidat) TIDAK ditebak dan tetap sebagai tarif umum, ditandai di UI lewat
  NeedsReviewNotice. `findShippingRate()` di src/lib/shipping.ts
  mengimplementasikan urutan lookup: spesifik → cadangan → null.
  Pengaturan tarif ongkir ada di /dashboard/pengaturan/ongkir dengan CRUD
  penuh (tambah, ubah, hapus, jadikan cadangan), memakai dropdown
  provinsi/kabupaten dari modul wilayah yang sama dengan storefront. Role
  owner dan admin_penjualan; tukang tidak boleh.

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

 * STATUS bagian 4 — SELESAI. Halaman lacak publik ada di `/lacak`, di level
   platform dan bukan di bawah `/t/<slug>`, karena pembeli sering tidak ingat
   nama toko tempat ia memesan — ia ingat kodenya.
   Verifikasi memakai kode pesanan DAN nomor WhatsApp. Ruang tebakan kode
   memang ~10^14 sehingga tidak bisa ditebak dengan enumerate, tapi kode bisa
   DIBAGIKAN — difoto dari struk, dikirim lewat chat, atau diberikan kepada
   orang yang seharusnya tidak tahu — dan halamannya menampilkan nama pembeli,
   alamat, serta foto progres.
   "Kode tidak ada" dan "nomor salah" sengaja mengembalikan pesan yang PERSIS
   sama. Kalau dibedakan, halaman ini berubah jadi alat untuk menebak keberadaan
   pesanan orang.
   Data margin toko (netTenantAmount, MDR, fee platform) dan koordinat GPS
   tidak diambil sama sekali. Lima tahap produksi SELALU digambar, bukan hanya
   yang sudah tercapai — pembeli berhak tahu masih ada tahap setelahnya, dan
   kalau hanya tahap tercapai yang tampil, "belum ada foto" terlihat seperti
   rusak. Link "Lacak" ditambahkan di header storefront.
   `npm run test:lacak` (17 pengujian) mengunci seluruh perilaku privasi dan
   timeline-nya.

CATATAN SOAL PETA — SUDAH DIKERJAKAN dengan Leaflet + OpenStreetMap.
  Keputusannya: LEAFLET, bukan MapLibre. Kebutuhan di sini cuma menandai satu
  titik yang bisa diketuk; MapLibre harus 20,7 MB belum dikompres dan butuh
  WebGL, sementara Leaflet 1.9.4 kecil, jalan tanpa WebGL, dan tidak membuat
  layar kosong di HP kelas bawah yang GPU-nya terbatas.
  Leaflet dimuat dengan `next/dynamic` sehingga HANYA diambil ketika pembeli
  menekan tombol "Pilih titik di peta" — bukan oleh setiap pengunjung
  storefront. Terbukti di `test:alamat`: 0 permintaan Leaflet sebelum peta
  dibuka, dan kode Leaflet tidak muncul di chunk `app/` mana pun di build.
  Penanda memakai `L.circleMarker`, bukan `L.marker` bawaan: yang bawaan
  mencari PNG ikon lewat `L.Icon.Default.imageUrl` dan asset-nya tidak ikut
  terbawa di bundler modern, hasilnya marker rusak. `circleMarker` digambar
  sebagai SVG, tanpa file aset yang bisa 404.
  TILE OSM: `tile.openstreetmap.org` DILARANG untuk penggunaan komersial atau
  berskala besar oleh kebijakan penggunaan OSM. Karena itu URL tile lewat
  `NEXT_PUBLIC_OSM_TILE_URL` — kosong memakai tile OSM (untuk pengembangan),
  dan produksi wajib diisi penyedia yang punya perjanjian (MapTiler, Stadia,
  atau tile sendiri). Atribut © OpenStreetMap contributors wajib tampil dan
  diuji keberadaannya.
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
   * Automated Payout Engine (Midtrans Payouts, dulu bernama IRIS):
     * Integrasi Midtrans Payout API, dipicu bukti pengiriman (bukan cron 2x/hari).
     * Perhitungan Platform Service Fee 1,5% dan fee Midtrans sebelum pencairan,
       mengikuti model yang ditetapkan di PRD.md §2.C:
       - Hanya Bank Transfer / VA sebagai kanal pembayaran. Tidak ada MDR
         persen, jadi fee-nya konstanta, bukan tabel per channel.
       - `dibayar ke pengrajin = total pesanan − 1,5% × total pesanan`
       - `beban platform = 1,5% × total pesanan − Rp 4.440`
       - `beban pencairan = Rp 5.000 per eksekusi`, ditanggung FurniTech
     * Fee dihitung ulang di server dari `orders`; kalau konstanta fee belum
       diisi, pencairan diblokir dengan pesan yang terbaca — bukan `?? 0`.
     * cron-job.org DIHAPUS untuk pencairan. Pemicunya bukti pengiriman yang
       diunggah kurir.
   * CATATAN BIAYA — HARUS DIBACA SEBELUM MULAI (detail di
     docs/midtrans-fee.md):
     - Beban riil FurniTech per pesanan adalah Rp 9.440 (Rp 4.440 masuk +
       Rp 5.000 keluar), sehingga titik impas platform ada di Rp 629.333 per
       pesanan. Di bawah itu FurniTech rugi, dan ruginya tidak terlihat dari
       laporan penjualan. Keputusan minimum pesanan masih terbuka.
     - Apakah Rp 5.000 berlaku per-penerima atau per-batch belum dikonfirmasi
       ke Midtrans. Selisihnya pada 100 pengrajin bisa Rp 29,7 juta/bulan.
       Mesin payout tidak boleh dibangun sebelum ini terjawab.
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

━━━ Checkout & Pembayaran Midtrans (escrow) ━━━

STATUS: SELESAI dan terverifikasi end-to-end terhadap server Midtrans
SANDBOX sungguhan. Bukan "belum bisa diuji" seperti seharusnya kalau
kredensialnya kosong — kredensialnya sudah ada dan `npm run test:checkout`
menjalankan 31 pemeriksaan, termasuk yang benar-benar membuat tagihan,
membuka halaman pembayaran Midtrans, lalu mengirim notifikasi lunas dengan
tanda tangan asli.

ALUR PEMBAYI
  1. Halaman detail produk punya tombol "Masukkan keranjang" (bukan "Beli
     sekarang" — mebel kargo hampir selalu lebih dari satu barang, dan ongkirnya
     bergantung pada kabupaten tujuan).
  2. `/t/<slug>/checkout` membaca keranjang dari COOKIE, bukan dari query
     string dan bukan dari FormData. Halaman ini juga bisa dibuka dengan
     keranjang kosong untuk menyiapkan alamat; tombol bayar tetap mati.
  3. Pembeli mengetik nomor WhatsApp → alamat tersimpan dimuat, atau form
     alamat lengkap dibuka. Alamat yang dipilih menentukan ongkir.
  4. Ongkir + total ditampilkan, lalu pembeli mengetik email dan menekan
     "Bayar".
  5. Server membuat `orders` + `order_items`, membuat tagihan Snap, menyimpan
     `snapToken`, lalu mengembalikan URL Midtrans. Klien yang mengarahkan.

INVARIANT YANG DIKUNCI `npm run test:checkout`
  - Harga SELALU diambil ulang dari `products`; cookie keranjang tidak
    ditandatangani dan memang boleh diedit, karena tidak ada nilai uang yang
    dibaca darinya.
  - `findShippingRate()` yang mengembalikan `null` MEMBLOKIR checkout. Tidak
    ada `?? 0` dan tidak ada tarif terkecil. Sumber daya yang menguji ini juga
    mengecek kata kuncinya di sumber, karena pemeriksaan angka saja tidak
    menangkap `?? 0` yang ditambahkan belakangan.
  - `addressId` dari FormData hanya dipakai bersama syarat `tenantId`. Alamat
    milik tenant lain ditolak dengan pesan yang bisa dibaca, dan tidak ada
    pesanan yang terbentuk.
  - Notifikasi tanpa tanda tangan → 403. Notifikasi dengan nominal yang salah
    (walaupun tanda tangannya benar) → 400. Notifikasi kedua untuk pesanan yang
    sudah lunas → 200 tanpa mengubah apa pun.
  - Keranjang satu pembeli tidak boleh bocor ke pembeli lain.

YANG SENGAJA TIDAK ADA DI SINI
  - Potongan MDR dan platform fee 1,5%. `orders` sudah punya kolomnya, tapi
    perhitungannya milik Sprint 6 (pencairan), karena MDR hanya diketahui
    setelah channel pembayaran benar-benar dipilih. Mengarangnya sekarang
    berarti menebak angka yang dipakai untuk membagi uang.
  - `pending` tidak dihitung lunas. Vault/VA yang baru dibuat belum menerima
    uang; mengaktifkannya di sini membuat "tanpa free trial" tidak berarti.

JEBAKAN YANG SUDAH TERLEWAT SEKALI
  - `readCart()` pernah mengembalikan objek modul `EMPTY_CART` yang SAMA untuk
    semua permintaan tanpa cookie, dan `addToCartLine()` memutasi objek itu.
    Satu proses Next lalu mengumpulkan keranjang semua pembeli tanpa cookie ke
    dalam satu objek: pembeli berikutnya menerima barang milik orang lain,
    termasuk dari toko lain. Sekarang `emptyCart()` selalu mengembalikan objek
    baru dan `addToCartLine()` tidak pernah memutasi hasil baca. Ada tes
    regresinya.
  - `clearCart()` TIDAK dipanggil di dalam `createCheckoutOrder`. Mengosongkan
    cookie di server membuat Router me-render ulang halaman tanpa
    `CheckoutClient`, sehingga komponen yang harus mengarahkan ke Midtrans
    justru ter-unmount. Pembeli melihat halaman keranjang kosong padahal
    tagihannya sudah dibuat. Keranjang dikosongkan di klien, tepat sebelum
    navigasi, dan kegagalan pengosongan tidak menghalangi navigasi.
  - Snap v1 TIDAK menerima field `expiry` sama sekali; pesannya
    `expiry unit & duration must present` meskipun kedua fieldnya dikirim, dan
    dicoba dengan 1, 86400, maupun 86400000. `expiry` itu fitur `/v2/charge`.
  - Midtrans mengembalikan `redirect_url` sendiri (`.../snap/v4/redirection/...`)
    dan nomor versi jalannya berubah dari waktu ke waktu. Pakai yang dikembalikan
    API, jangan dirangkai dari token.
  - Server Action yang dipanggil dari Client Component tidak bisa memanggil
    `redirect()`. Yang dikembalikan adalah `redirectTo`, dan navigasinya
    dilakukan di klien.
  - `finishUrl` diambil dari Host request, bukan dari `NEXT_PUBLIC_APP_URL`
    yang di-inline saat build — kalau tidak, satu build untuk staging lokal dan
    Vercel akan mengarahkan pembeli ke domain yang tidak melayani pesanan itu.

━━━ PWA & luring (bagian 1 dari Sprint 6) ━━━

STATUS: SELESAI dan terverifikasi dengan `npm run test:pwa` (20 pemeriksaan).

YANG DIKERJAKAN
  - `app/manifest.ts` — manifest PWA: `display: standalone`, ikon 192/512
    plus maskable, shortcut "Lacak pesanan" dan "Daftar toko". Sengaja
    `standalone`, bukan `fullscreen`: aplikasi ini dipakai sambil membuka
    WhatsApp untuk kirim foto progres, dan `fullscreen` menyembunyikan bilah
    status sehingga tidak ada cara melihat jam atau sinyal.
  - Ikon PNG (`public/icon-*.png`) dibuat oleh `scripts/make-icons.ts` yang
    merender SVG lewat Chromium. Tidak ada dependensi gambar baru untuk
    menghasilkan empat file sekali seumur proyek.
  - `public/sw.js` — service worker dengan dua prinsip: TIDAK ADA HTML
    per-orang yang di-cache, dan hanya aset hashed (`/_next/static/…`) yang
    aman di-cache. Navigasi network-first, fallback ke dokumen yang
    di-precache lalu ke `/offline`.
  - `app/offline/page.tsx` + `src/components/retry-button.tsx` — halaman
    cadangan yang jujur: tidak mengarang isi pesanan atau katalog, punya
    tombol "Coba lagi" yang benar-benar memuat ulang, dan `noindex`.
  - Pendaftaran service worker di root layout
    (`src/components/service-worker-registrar.tsx`), hanya di produksi.

EMPAT BUG NYATA YANG TERLEWAT — SEMUANYA HANYA MUNCUL SAAT LURING
  1. `cache.match("/offline")` mencari di cache RUNTIME, sedangkan halaman
     luring ada di cache STATIC. Fallback ke HTML minimalist selalu terjadi
     padahal halaman yang jauh lebih baik sudah tersimpan. Diganti
     `caches.match`, yang menelusuri semua cache.
  2. Navigasi tanpa `cache: "no-store"` dilayani HTTP cache peramban saat
     luring — jadi yang muncul adalah HTML lama milik orang yang pernah
     membuka URL itu, dan justru ketika orang itu sedang tidak bisa
     apa-apa. Persis kebocoran yang PWA ini dirancang untuk mencegah.
  3. Precache hanya menyimpan HTML `/offline`, tanpa chunk JS-nya. Halamannya
     tampil tapi React tidak pernah hydrasi, jadi tombol "Coba lagi" mati
     tanpa error apa pun. Sekarang `install` ikut mengambil setiap URL
     `/_next/static/…` yang dirujuk dokumen itu.
  4. Precache beranda tidak pernah dipakai: fallback luring langsung melompat
     ke `/offline`. "Shell aplikasi termuat saat luring" hanya berupa halaman
     permintaan maaf. Sekarang fallback dua tingkat.
  Plus: `<Link href="">` untuk "Coba lagi" ternyata `href` kosong = navigasi ke
  dokumen yang sama, bukan memuat ulang. Diganti `location.reload()`.

CATATAN SOAL CARA MENGUJI — INI YANG PALING SERING SALAH
  `context.setOffline()` milik Playwright TIDAK berlaku untuk permintaan yang
  lewat service worker: permintaan itu datang dari target service worker,
  bukan dari page, dan emulasi jaringan di level context tidak menjangkaunya.
  Percobaan pertama "menguji luring" begitu justru berhasil memuat halaman
  NYATA dan melaporkan lulus, padahal tidak ada yang diuji.
  `test:pwa` karena itu menyalakan `next start` sendiri di port 3199 dan
  benar-benar MEMATIKAN prosesnya. Server yang sedang dipakai orang (port
  3000) tidak disentuh.

YANG MASIH KOSONG DARI SPRINT 6
  - IRIS Batch Payout + cron 06.00/18.00 WIB (butuh `MIDTRANS_IRIS_API_KEY`).
  - Firebase push notification (butuh kredensial Firebase).
  - Cache Gambar Cloudflare (Vercel sudah menangani resize sendiri; yang
    tersisa hanya memilih penyedia CDN berizin).

━━━ Model Biaya & Payout (keputusan pemilik produk, 2026-09-27) ━━━

STATUS: model final (PRD v1.7) + rumus di `src/lib/fees.ts` + modal kalkulator
biaya di modul produk. Mesin payout BELUM dibangun.

PEMBAGIAN BEBAN (final)
  fee masuk  Rp4.440  →  pengrajin, saat pesanan lunas
  fee payout Rp5.550  →  pengrajin, saat pencairan, PER PENERIMA
  platform fee 0%     →  FurniTech tidak mengambil apa-apa per transaksi
  fee langganan        →  FurniTech (Rp300.000 → diterima Rp295.560)

  escrow masuk     = totalAmount − 4.440
  saldo pengrajin += totalAmount − 0 − 4.440
  saat payout     : saldo ditransfer = saldo − 5.550

  Beban pengrajin per pesanan = Rp9.990 datar (bukan persen). Propriosinya
  naik untuk pesanan kecil: 0,10% untuk Rp10 juta, 1,50% untuk Rp666.000,
  9,99% untuk Rp100.000. Mebel custom selalu di rentang pertama.

YANG SUDAH DIKERJAKAN
  - `src/lib/fees.ts` — konstanta dan rumus. Tanpa `server-only` supaya modal
    kalkulator dan server membaca angka yang sama. `PLATFORM_FEE_RATE` dan
    `FEE_PENCAIRAN` TIDAK boleh disalin ke `plans.ts` — pernah terduplikasi
    dan tidak ada yang menangkapnya.
  - `src/components/fee-calculator-dialog.tsx` — modal kalkulator biaya di
    form produk, plus hitung mundur dari target pendapatan. Kedua fee
    ditampilkan TERPISAH, bukan dijumlahkan, karena kapan potongannya
    berbeda (salah satu saat pesanan lunas, yang lain saat uang keluar).
  - `ALLOWED_PAYMENT_CHANNELS` + `REJECTED_PAYMENT_CHANNELS` dipakai
    `snap.ts`. CIMB (maks Rp250 juta) dan SeaBank (maks Rp100 juta)
    dinonaktifkan karena batas maksimum nominalnya.
  - Diskon tahunan 5% dan harga tahunan DIHITUNG dari harga bulanan × 12 ×
    0,95, bukan diketik. `test:visual` dan `test:webhook` ikut membaca
    `plans.ts` supaya tidak perlu diubah lagi saat harga berubah.
  - Panel admin & dashboard menampilkan "beban gateway yang dibayar
    pengrajin", bukan "fee platform 0%" yang selalu Rp 0.
  - `test:checkout` mengunci 20+ pemeriksaan fee, termasuk "pembagian escrow
    menutup" dan "harga minimum menutup KEDUA fee".

CATATAN SOAL RISIKO YANG DISEPAKAI SENDIRI
  Tanda tangan digambar di layar HP kurir, dan foto bukti transfer COD hanya
  bukti foto. Keduanya lemah secara pembuktian. Ini DITERIMA karena: tidak
  ada sengketa, tidak ada refund, dan kanal pembayaran hanya VA (transfer
  bank tidak bisa di-chargeback). Kalau nanti kartu kredit atau QRIS
  ditambahkan, keputusan "tidak ada refund" menjadi tanggung jawab platform
  dan bukan cuma urusan pengrajin.

━━━ Sprint 6 — Peran Kurir (selesai 2026-09-27) ━━━

YANG DIKERJAKAN
  - Enum `user_role` bertambah `kurir` (migrasi 0009), terpisah dari `tukang`
    dengan sengaja: tukang perlu seluruh antrean produksi, kurir ada di jalan
    dan butuh satu hal saja. `orders.assigned_courier_id` + index.
  - RLS khusus (migrasi 0010). `is_tenant_staff()` mengembalikan TRUE untuk
    SEMUA peran tenant, jadi kurir tidak boleh memakainya — kalau ikut, satu
    akun kurir akan melihat seluruh pesanan workshop-nya. Policy `orders_courier_read`
    hanya meloloskan `assigned_courier_id = auth.uid()`, dan `orders_staff_read`
    dikecualikan untuk kurir. Kurir juga TIDAK boleh menulis apa pun ke
    `orders`: itu menutup jalan samping mengubah `payment_status` sendiri lalu
    memicu pencairan.
  - `loadCourierQueue` memfilter `assignedCourierId` di query, bukan
    menyembunyikan lewat UI — klien Drizzle bypass RLS, jadi filter di sini
    adalah lapisan aplikasi yang sebenarnya. Nominal TIDAK diambil sama
    sekali; nomor HP hanya empat digit terakhir.
  - Halaman `/kurir` (satu-satunya untuk peran ini, `ROLE_HOME["kurir"]`),
    penugasan dari detail pesanan, `assignCourier` dengan syarat
    `role = 'kurir'`. Sekalian diperbaiki bug lama: dropdown "Tukang" menampilkan
    SEMUA user tenant karena query-nya hanya memfilter `tenantId`.
  - `test:kurir` — 11 pemeriksaan RLS dengan JWT kurir sungguhan lewat PostgREST.

TEMUAN YANG PERLU DIPERHATIKAN (tiga, dan semuanya ketahuan karena tes)
  1. **RLS tidak bisa menyembunyikan KOLOM.** `GET /rest/v1/orders?select=
     net_tenant_amount` tetap berhasil untuk kurir pada barisnya sendiri, karena
     RLS menyaring baris saja. Klaim "kurir tidak melihat nominal" di kode
     aplikasi_permissions to Be Polite, bukan jaminan — anon key memang
     ikut terkirim ke browser.
  2. **`revoke select (kolom)` DITOLAK DIAM-DIAM.** Postgres memenuhi hak
     akses kolom dari grant level TABEL, jadi selama Supabase memberi
     `grant select` untuk seluruh tabel, revoke per kolom tidak berpengaruh.
     Tidak ada error — `test:kurir` melihat `net_tenant_amount` bernilai 0,
     bukan 403. Diperbaiki dengan mencabut di level tabel lalu memberi grant
     per kolom aman (migrasi 0012 lalu 0013). `snap_token` ikut tercabut: ini
     kredensial pembayaran.
  3. **Mencabut seluruh tabel membuat tes RLS lulus hampa.** Setelah 0012
     PostgREST mengembalikan nol baris untuk semua orang, jadi "kurir A tidak
     melihat pesanan kurir B" tetap lulus — tanpa menguji apa pun. Ini lebih
     buruk dari kebocoran yang ditutup: tes hijau yang tidak menguji. Grant
     per kolom dipulangkan supaya emitenya benar.

  Ketiganya sudah tertulis sebagai komentar di berkas migrasinya, supaya
  tidak ada yang menyimpulkan "sudah kita revoke" sambil nilainya masih bisa
  dibaca.

━━━ Sprint 6 — Bukti Penerimaan (selesai 2026-09-27) ━━━

YANG DIKERJAKAN
  - Tabel `delivery_proofs` (migrasi 0014, 0015). **Append-only di database**:
    trigger menolak UPDATE dan DELETE. Bukti yang bisa diedit bukan bukti,
    dan karena baris ini yang memicu pencairan, "bisa diedit" berarti uang
    bergerak berdasarkan angka yang bisa direkayasa.
  - UNIQUE pada `order_id`, ditegakkan di database. `if (!existing)` di
    aplikasi tidak menutup dua request bersamaan — dan dua bukti untuk satu
    pesanan berarti pencairan dua kali.
  - `courier_id` disimpan terpisah dari `orders.assigned_courier_id`, dan
    `signer_name` terpisah dari `orders.customer_name`. Penugasan bisa berubah
    setelah pengiriman, dan yang menandatangani belum tentu pembeli.
  - Bucket privat `delivery-proofs` + `npm run db:buckets`. Bucket tidak
    dibuat lewat migrasi SQL (Storage tinggal di luar skema `public`), jadi
    kegagalan "bucket tidak ada" harus terasa jelas, bukan 404 yang ditelan.
  - Kolom tanda tangan di layar HP kurir (`src/components/signature-pad.tsx`).
    Canvas di-backing store `devicePixelRatio`, pointer events + `touch-action:
    none`, dan `setPointerCapture` supaya garis tidak terpotong saat jari keluar
    dari kanvas.
  - `submitDeliveryProof` — memverifikasi penugasan ULANG di server, menolak COD
    yang melebihi sisa tagihan, dan menghapus objek yang sudah terunggah kalau
    langkah berikutnya gagal (kalau tidak, setiap percobaan yang gagal
    menyisakan berkas yatim).
  - `ready_to_ship -> completed` jadi transisi langsung di `order-status.ts`.
    `shipped` adalah langkah yang tidak perlu: kurir yang mengunggah bukti lalu
    koneksinya putus akan meninggalkan pesanan `shipped` padahal barangnya
    sudah sampai, dan pencairan memicu dari bukti — bukan dari status.
  - Bukti tampil di detail pesanan pengrajin lewat signed URL, dengan tombol
    hapus/ubah yang TIDAK ada (cuma akan menampilkan error).

DUA TEMUAN DARI TES
  1. **Trigger ikut menyalakan ON DELETE CASCADE.** Versi pertama menolak
     semua delete — termasuk yang datang dari cascade FK `tenants -> orders ->
     delivery_proofs`. Akibatnya penghapusan tenant mustahil, dan di produksi
     gejalanya "owner tidak bisa berhenti jadi pelanggan". Diperbaiki dengan
     `pg_trigger_depth() = 1` (delete langsung ditolak, cascade diizinkan)
     plus `revoke update, delete` untuk menutup jalur kedua. Ketiganya
     diverifikasi empiris, bukan diasumsikan: delete langsung ditolak, cascade
     lolos, dan `test:kurir` mengulang keduanya lewat koneksi yang sama dengan
     kode aplikasi — karena GRANT PostgREST akan memblokir lebih dulu dan
     membuat tesnya hijau tanpa menguji trigger sama sekali.
  2. **`formData.get()` mengembalikan `null`, bukan `undefined`.** Skema COD
     memakai `z.string().optional()` yang menolak `null` dengan pesan
     "expected string, received null". Field COD memang belum selalu ada di
     form kurir, jadi `null` adalah kasus normal. Ketahuan hanya oleh
     `test:kurir-ui`, yang benar-benar menekan tombol kirim dan membaca pesan
     errornya.

━━━ Sprint 6 — Rekening pencairan (selesai 2026-09-27) ━━━

YANG DIKERJAKAN
  - Transport Payouts `src/lib/midtrans/payouts.ts`: `POST /account_validation`,
    `GET /beneficiary_banks`. Autentikasi `iris-credential` (BUKAN Server Key)
    + `iris-idempotency-key`.
  - `idempotencyKeyFor()` = SHA-256 dari `path|body`, dipotong 32 hex.
    Dipilih deterministik dengan sengaja: kunci yang dibuat ulang tiap
    percobaan (`Date.now()`, `Math.random()`) justru MEMBATALIR jaminan retry
    Payouts dan membuat payout ganda mungkin. `test:rekening` mengunci
    determinismenya.
  - Tabel `tenant_bank_accounts` (migrasi 0019, 0020) + halaman
    `/dashboard/pengaturan/rekening` (khusus owner) + `saveBankAccount`.
  - **Kegagalan verifikasi tidak memblokir penyimpanan.** `unverified` kalau
    belum sempat dicek, `failed` kalau ditolak — keduanya menahan pencairan,
    tapi hanya yang kedua yang perlu diperbaiki pengrajin. Error jaringan
    TIDAK pernah dilaporkan sebagai "rekening Anda salah".
  - Nama rekening yang disimpan setelah verifikasi berhasil adalah NAMA DARI
    BANK, bukan yang diketik, karena itulah yang akan tampil ke pembeli. Kalau
    berbeda, pengrajin diberi tahu eksplisit di pesan sukses.
  - Audit log setiap perubahan rekening — tanpa nomor & nama, hanya 4 digit
    terakhir, karena untuk rekonsiliasi cukup tahu BERUBAH oleh siapa kapan.
  - `test:rekening` — 21 pemeriksaan (fungsi murni, determinisme key, RLS).

DUA TEMUAN
  1. **Kolom rekening di `tenants` BOCOR ke akun kurir.** Policy
     `tenants_select` adalah `id = current_tenant_id()` tanpa penyaringan
     role, jadi siapa pun dengan `tenantId` bisa membaca baris itu —
     termasuk `bank_account_name` yang bisa berisi nama orang. Dan ini TIDAK
     bisa ditutup di tempat lain: RLS menyaring baris (baris ini memang milik
     kurir juga), GRANT menyaring kolom per peran DATABASE (owner, admin,
     dan kurir semuanya `authenticated`). Satu-satunya jalan: tabel terpisah
     dengan policy sendiri. Migrasi 0018 menghapus kolomnya dari `tenants`.
     `test:rekening` mengunci baik kebocorannya maupun bahwa kolomnya tidak
     dikembalikan ke sana.
  2. **Dropdown menampilkan nilai mentah, bukan label.** `SelectField` tidak
     meneruskan `items` ke `Select.Root` Base UI, jadi `<SelectValue>`
     menampilkan `bca` alih-alih "Bank Central Asia (BCA)" dan
     `bahan_dipotong` alih-alih "Bahan Dipotong". Bug lama di seluruh aplikasi,
     baru terlihat karena halaman rekening memakai dropdown pertama kali.
     Diperbaiki di `src/components/rhf-fields.tsx` — satu tempat, semua form.

━━━ Sprint 6 — Mesin payout (selesai 2026-09-27) ━━━

YANG DIKERJAKAN
  - `payout_logs` kehilangan `slot` dan `scheduled_for` (migrasi 0021). Model
    cron 06.00/18.00 WIB dihapus; pencairan dipicu bukti penerimaan. Enum
    `payout_slot` sengaja TIDAK dihapus — nilai enum yang tidak dipakai boleh
    membusuk, dan `DROP TYPE` gagal selama masih ada baris yang memakainya.
  - **`orders.payment_method` (`va` | `cod`) dan `payout_status` `blocked`
    ditambahkan sekarang, bukan nanti.** Keduanya dibutuhkan mesin payout:
    pesanan COD uangnya sudah diterima di tempat, jadi kalau ikut payout
    pengrajin dibayar dua kali; dan penolakan kita sendiri (rekening belum
    terverifikasi) harus terpisah dari penolakan bank, karena dua masalah itu
    punya tindakan yang sama sekali berbeda.
  - **UNIQUE pada `payout_items.order_id`** — ini satu-satunya hal yang
    benar-benar mencegah uang dibayar dua kali. Ditulis SEBELUM
    `POST /payouts`, jadi proses yang mati di tengah tidak akan mengambil
    item yang sama lagi di percobaan berikutnya.
  - `payout_items.amount` = KREDIT per pesanan; `payout_logs.amount` =
    YANG DITRANSFER (= jumlah kredit − fee). Kalau yang disimpan per item
    adalah nominal transfer, penjumlahannya tidak akan sama dengan
    `payout_logs.amount` dan tidak ada yang bisa menelusuri selisihnya.
  - `fee_amount` & `order_count` disimpan, bukan dihitung ulang —
    payout lama harus tetap menunjukkan berapa yang benar-benar dipotong.
  - Snapshot rekening di `payout_logs` (bukan referensi), supaya payout
    kemarin tetap menunjukkan rekening mana yang waktu itu dipakai.
  - 4 syarat kelayakan, semuanya wajib: metode `va`, `fully_paid`, punya
    bukti (EXISTS, bukan status — status bisa diubah manual, bukti tidak),
    dan belum masuk `payout_items` (NOT EXISTS).
  - `runPayout()` + halaman `/dashboard/pencairan` (khusus owner) +
    `PayoutButton` yang menyebut nominalnya di label tombol.
  - Pemicu otomatis: `submitDeliveryProof` memanggil `runPayout` setelah
    bukti tersimpan. Kegagalan TIDAK dikembalikan ke kurir — dia tidak bisa
    bertindak apa-apa, dan membuatnya melihat "gagal mencairkan" akan
    membuat ia mengirim ulang bukti, yang memicu pencairan kedua.
  - `test:payout` — 22 pemeriksaan (kelayakan, aritmetika fee, penolakan,
    keunikan), semua tanpa kredensial.

DUA TEMUAN
  1. **Urutan pengecekan menentukan pesan yang sampai ke owner.** "Payouts
    belum dikonfigurasi" dicek paling awal membuat EMPAT alasan penolakan
    lain dilaporkan sebagai "belum dikonfigurasi" selama kredensial kosong —
     termasuk "saldo belum cukup", yang membuat `balance_below_fee` hanya
     hidup sebagai kode yang tidak pernah dieksekusi. Sekarang diperiksa
     SETELAH semua fakta tentang toko dicek, karena itulah yang tidak berubah
     karena kita menghidrasi kredensial.
  2. **`err.code` sering `undefined`.** Drizzle membungkus error postgres.js
     di dalam `cause`, jadi tes UNIQUE yang hanya membaca `err.code`
     melaporkan "tidak ditolak" untuk pelanggaran yang benar-benar terjadi.
     Persis jenis tes yang hijau sambil salah.

━━━ Sprint 6 — COD di checkout (selesai 2026-09-28) ━━━

YANG DIKERJAKAN
  - `orders.payment_method` dipakai sungguhan. `dpAmount = 0` untuk COD — kalau
    diisi `totalAmount`, pesanan COD terlihat LUNAS di semua layar padahal
    belum ada satu rupiah pun yang diterima. Tidak ada `midtrans_order_id` dan
    tidak ada tagihan: COD tidak lewat Midtrans sama sekali, dan menyimpan
    `order_id` yang tidak pernah dibayar akan muncul di rekonsiliasi sebagai
    transaksi menggantung.
  - COD hanya ditawarkan kalau rekening pengrajin **terverifikasi** — dicek di
    server, di `checkout-view.tsx` (untuk tidak menawarkan) DAN di
    `createCheckoutOrder` (tetap menolak meski dipaksa). Alasannya: nomor
    rekening COD ditampilkan ke pembeli, jadi menampilkan yang belum dicek
    berarti FurniTech mengarahkan orang mengirim uang ke nomor yang bisa
    jadi salah.
  - Panel COD di halaman lacak (`CodPaymentPanel`): cara bayar (tunai ke
    kurir / transfer), nama bank, nomor, atas nama, total. Nomor ditampilkan
    **utuh** — berbeda dari halaman pencairan, karena yang membaca di sini
    adalah orang yang harus MEMBAYAR ke rekening itu.
  - `codBank` hanya terisi untuk pesanan COD yang BELUM lunas dan rekeningnya
    terverifikasi. Query terpisah, bukan `leftJoin`, supaya syaratnya terlihat
    dalam tiga baris dan tidak bisa lolos tanpa terlihat.
  - Field COD di form kurir (nominal + bukti transfer opsional), dan
    `submitDeliveryProof` menolak nominal COD **pada pesanan VA** serta
    mewajibkannya **pada pesanan COD** — dua arah, karena hanya satu arah
    yang biasanya dip Thinking.
  - `recordPayment` DITOLAK untuk pesanan COD, dan tombolnya tidak dirender.
    Catatan COD adalah `delivery_proofs.cod_amount`; membiarkan juga
    `orders.payment_status` bisa diisi manual berarti dua sumber kebenaran
    untuk hal yang sama, dan pencairan tidak pernah membaca `cod_amount` jadi
    tidak ada yang akan menemukan ketidakkonsistenannya.
  - `test:cod` — 13 pemeriksaan, hampir semuanya soal TIDAK bocor.

TEMUAN DARI CEK VISUAL
  Dua catatan di bawah tombol bayar ("Pembayaran ditangani Midtrans…",
  "VA semua bank, QRIS, dan e-wallet tersedia…") serta keterangan field email
  tetap tampil saat COD dipilih. Semuanya benar untuk VA dan SALAH untuk COD —
  dan itu declaration yang salah di halaman pembayaran, tempat orang paling
  serius saat menyerahkan uang. Sekarang keduanya mengikuti metode yang dipilih.

YANG MASIH HARUS DIKERJAKAN
  6. Pengaturan fee platform & harga paket di panel super admin, dengan
     aturan: invoice yang sudah terbit mengunci harga saat dibuat.

CATATAN: `POST /payouts` belum pernah dipanggil sungguhan
(`MIDTRANS_IRIS_API_KEY` kosong). Bentuk respons dibaca defensif, dan
`already_sent` diperlakukan sebagai SUKSES — kalau layanan memberi tahu ini
retry, berarti transfer sudah terjadi di percobaan sebelumnya. `payouts.ts`
sengaja hanya mengirim satu tujuan rekening per panggilan meski endpoint-nya
menerima banyak: satu permintaan gagal berarti satu pengrajin tidak
tertunaikan, dan status recipient lain jadi tidak jelas.

CATATAN: `MIDTRANS_IRIS_API_KEY` masih kosong, jadi `POST /account_validation`
belum pernah dipanggil sungguhan. Bentuk respons dibaca defensif (tiga jalur
nama pemilik), dan respons tanpa nama pemilik diperlakukan sebagai KEGAGALAN
bukan "terverifikasi tanpa nama" — menganggapnya sukses berarti meloloskan
rekening milik orang lain karena layanan tidak mengirim field yang kita kira
ada. Daftar bank cadangan di `src/lib/banks.ts` juga belum diverifikasi;
`verifyBankCodesAgainstMidtrans()` ada untuk membandingkannya dengan
`GET /beneficiary_banks` sebelum produksi.
