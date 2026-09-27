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
     * Integrasi Midtrans Batch Payout API.
     * Perhitungan Platform Service Fee 1,5% dan fee Midtrans sebelum pencairan,
       mengikuti model yang ditetapkan di PRD.md §2.C:
       - Hanya Bank Transfer / VA sebagai kanal pembayaran. Tidak ada MDR
         persen, jadi fee-nya konstanta, bukan tabel per channel.
       - `dibayar ke pengrajin = total pesanan − 1,5% × total pesanan`
       - `beban platform = 1,5% × total pesanan − Rp 4.440`
       - `beban pencairan = Rp 5.000 per eksekusi`, ditanggung FurniTech
     * Fee dihitung ulang di server dari `orders`; kalau konstanta fee belum
       diisi, pencairan diblokir dengan pesan yang terbaca — bukan `?? 0`.
     * Setup cron-job.org webhook untuk eksekusi payout setiap pukul 06.00 WIB
       dan 18.00 WIB, dengan secret yang wajib diverifikasi supaya route tidak
       bisa dipicu siapa saja.
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

STATUS: model bisnis ditetapkan dan ditulis ke PRD.md §2.C + v1.4, dan angka
sumbernya di docs/midtrans-fee.md. Mesin payout BELUM dibangun, dan sengaja
ditahan sampai pertanyaan“MIDTRANS_IRIS_API_KEY” dan tarif per-batch terjawab.

TIGA ALUR UANG, DUA KONSTANTA FEE

  Alur 1 — Langganan. Pengrajin bayar harga paket apa adanya.
           `diterima = harga − Rp4.440`
           Basic Rp300.000 → Rp295.560. Tidak ada pencairan; ini pendapatan
           platform langsung.

  Alur 2 — Pembelian produk. Pembeli bayar `harga + ongkir` tanpa biaya
           layanan tambahan.
           `platform fee = 1,5% × total pesanan`
           `pendapatan platform = 1,5% × total pesanan − Rp4.440`
           `dibayar ke pengrajin = total pesanan − 1,5% × total pesanan`
           Rp10.000.000 → pengrajin Rp9.850.000, platform Rp145.560.
           Cek buku: 9.850.000 + 145.560 = 9.995.560 = saldo escrow setelah
           fee. Balance.

  Alur 3 — Pencairan. Nilai ke pengrajin TIDAK dipotong.
           `dikirim = saldo bersih pengrajin`
           `beban FurniTech = Rp5.000 per pencairan`

KENAPA HANYA BANK TRANSFER/VA
  Fee VA Rp4.000 itu FLAT per transaksi, sedangkan semua kanal lain memakai MDR
  persen. MDR adalah lapisan biaya tambahan (kolom "Total MDR" terpisah dari
  "Total Transaction Fee" di halaman Billings) yang tidak ada kebutuhan
  bisnisnya di sini. Konsekuensi yang bagus: fee menjadi KONSTANTA, bukan
  tabel per channel — jadi tidak ada channel yang bisa salah pilih dan tidak
  ada tarif MDR yang perlu dikelola. Seluruh tarif kanal lain didokumentasikan
  di docs/midtrans-fee.md §1 supaya tidak perlu dicek ulang.

  PERUBAHAN KODE YANG WAJIB MENYUSUL
  `enabled_payments` di src/lib/midtrans/snap.ts masih mendaftarkan `qris`,
  `gopay`, `shopeepay`, dan `credit_card`. Semua itu harus dihapus, dan
  `test:checkout` harus mengunci daftar kanal itu — kalau kanal yang
  tidak dimaksud masih bisa dipakai, seluruh hitungan fee di atas jadi tidak
  berlaku karena angkanya berbeda per kanal.

BIAYA YANG BELUM TERHITUNG — DAN INI YANG PALING BERBAHAYA
  Beban riil FurniTech per pesanan adalah Rp9.440 (Rp4.440 masuk + Rp5.000
  keluar), bukan Rp4.440 seperti pada contoh di atas:

  | Harga pesanan | Fee 1,5% | Bersih |            |
  |----------------|----------|--------|------------|
  | Rp10.000.000   | Rp150.000| Rp140.560| sehat     |
  | Rp1.000.000    | Rp15.000 | Rp 5.560 | tipis     |
  | Rp630.000      | Rp 9.450 | Rp10     | impas     |
  | Rp296.000      | Rp 4.440 | −Rp5.000 | RUGI      |
  | Rp100.000      | Rp 1.500 | −Rp7.940 | RUGI      |

  Titik impas Rp629.333. Di bawah itu FurniTech kehilangan uang pada setiap
  transaksi, dan kerugian itu tidak terlihat di laporan penjualan karena yang
  salah bukan omzetnya melainkan fee-nya. Mebel custom jarang sekecil itu,
  tapi pesanan aksesori/Perbaikan bisa. Keputusan minimum pesanan masih
  terbuka — lihat docs/midtrans-fee.md §8.

  VARIABEL TERBESAR YANG BELUM DIKETAHUI: Rp5.000 itu per-penerima atau
  per-batch?

  | Pengrajin aktif | Disbursement/hari | Fee/hari | Fee/bulan   |
  |-----------------|-------------------|----------|-------------|
  | 1               | 2                 | Rp10.000 | Rp 300.000  |
  | 10              | 20                | Rp100.000| Rp3.000.000 |
  | 50              | 100               | Rp500.000| Rp15.000.000|
  | 100             | 200               | Rp1.000.000 | Rp30.000.000 |

  Kalau per batch, biayanya Rp10.000–Rp300.000/bulan tanpa tergantung jumlah
  pengrajin. Selisihnya pada 100 pengrajin: Rp29,7 juta per bulan. Itu satu
  pertanyaan, dan menentukan apakah model ini layak atau tidak.
