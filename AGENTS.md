# AGENTS.md

## Apa isi repo ini sekarang

FurniTech — SaaS multi-tenant untuk pengrajin mebel. Sprint 1 (Foundation, DB
Schema & Multi-Tenant Routing) **sudah selesai** dan ter-verifikasi terhadap
database Supabase sungguhan.

Stack yang benar-benar terpasang: **Next.js 16.3 (App Router) + React 19 +
TypeScript + Tailwind CSS v4 + Drizzle ORM 0.45 + Supabase (PostgreSQL + Auth +
RLS)**. Halaman demo bawaan template Codespaces (`pages/`, `components/`,
`styles/`) sudah dihapus.

Dokumen produk (bahasa Indonesia): `PRD.md` (v1.1), `ROADMAP.md` (6 sprint),
`DESIGN.md` (token). `ROADMAP.md` = acuan cakupan sprint; `PRD.md` = acuan
kebutuhan & aturan bisnis. **Middleware**: Next 16 tidak punya `middleware.ts` —
konvensinya `proxy.ts` dengan fungsi `export function proxy` (runtime Node.js only;
`export const runtime` di sana akan throw).

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # build produksi (Turbopack)
npm run lint           # ESLint CLI — `next lint` sudah DIHAPUS di Next 16
npm run typecheck      # tsc --noEmit
```

Urutan gerbang: `lint → typecheck → build`. Di Codespaces `npm run dev` sudah
berjalan otomatis (`postAttachCommand`) dan rebuild menjalankan
`npm install && npm run build`, jadi **jangan** menyalakan server kedua di port
3000. Untuk uji end-to-end, `npm run build && npm run start` — tapi matikan
process-nya lagi (cari PID via `pgrep -f next-server`; jangan pakai
`pkill -f "next start"`, polanya akan mencocokkan shell itu sendiri).

`npm run build` mencetak warning `ignored package-lock.json in /workspaces` —
harmless, karena direktori induk bukan repo git. Jangan "perbaiki" dengan
`outputFileTracingRoot`.

## Database — dua koneksi, jangan ditukar

| Var | Port | Dipakai untuk |
|---|---|---|
| `DATABASE_URL` | 6543 (transaction pooler) | query runtime |
| `DIRECT_URL` | 5432 (session pooler) | `drizzle-kit migrate` |

```bash
npm run db:generate   # SQL dari src/db/schema
npm run db:migrate    # WAJIB lewat DIRECT_URL
npm run db:apply      # sama, tapi menampilkan error SQL apa adanya
npm run db:verify     # 6 pemeriksaan: tabel, RLS, trigger, kolom uang, anon
npm run db:test-rls   # 8 uji isolasi tenant dgn JWT pengguna sungguhan
npm run db:studio
npm run db:seed       # idempoten
npm run test:auth     # 11 uji auth & RBAC via HTTP (butuh server jalan)
npm run test:schemas  # 14 uji skema validasi (guard uang, pesan, id)
npm run test:responsive # 23 pemeriksaan struktural responsif & token
npm run test:sprint3  # 16 uji halaman & pembatasan role Sprint 3
npm run test:register  # 6 pemeriksaan wizard /daftar (Playwright, butuh server)
npm run test:carpenter # 16 pemeriksaan antrean tukang di 375px (butuh server)
npm run test:alamat    # 25 pemeriksaan form alamat & peta (butuh server)
npm run test:ongkir    # 13 pengujian tarif ongkir & lookup
npm run test:lacak     # 17 pengujian privasi halaman lacak
npm run test:checkout  # 31 uji checkout & pembayaran (butuh server + kredensial Midtrans)
npm run test:pwa      # 20 pemeriksaan PWA & luring (menyalakan servernya sendiri)
npm run test:webhook   # 46 uji: skema, signature, gerbang tenant, e2e webhook
npm run test:visual   # 27 pemeriksaan visual Playwright (butuh server jalan)
npm run db:seed:sprint3  # bahan, variasi, pesanan kustom, percakapan contoh
```

**`test:visual` satu-satunya alat yang bisa melihat halaman.** Semua test lain
membaca source code; yang ini merender. Yang ia tangkap dan tidak bisa ditangkap
secara struktural: scroll horizontal di lebar tertentu, target sentuh yang
melewati 44px, error konsol, aset 404, drawer yang tidak terbuka, Escape yang
tidak menutup, dan toggle yang tidak mengubah apa pun. Jalankan setiap kali
menyentuh layout, navigasi, atau token visual.

Dua jebakan yang sudah ditemukan sekali:

- **Playwright harus di-pin ke 1.49.x.** Codespace ini Ubuntu 20.04 (glibc
  2.31). Playwright 1.50+ menolak chromium di platform itu dengan
  `ERROR: Playwright does not support chromium on ubuntu20.04-x64`.
  `npx playwright install --with-deps` juga gagal, dan errornya terlihat seperti
  masalah permission padahal bukan.
- **Tunggu transisi sebelum mengukur posisi.** `.skip-link` punya
  `transition: transform 150ms`. Mengukur `getBoundingClientRect()` langsung
  setelah `keyboard.press("Tab")` menangkap posisi SEBELUM transisi selesai, dan
  akan melaporkan elemen yang sebenarnya benar sebagai tersembunyi. Butuh
  `waitForTimeout`.

- **Server harus hidup sebelum menjalankan `test:visual` / `test:register`.**
  Kedua skrip itu memanggil `requireServer()` lebih dulu. Tanpa pemeriksaan
  itu, server yang mati membuat halaman fallback ter-render dan hasilnya
  dilaporkan sebagai "0 langkah terlihat" — terbaca sebagai bug wizard
  padahal wizard-nya tidak pernah diuji. Ini sudah terjadi setelah `.next`
  terhapus dan `npm run start` gagal diam-diam (kode keluar 2, pesan jelas).

Screenshot ditulis ke `screenshots/` yang sudah di-gitignore. Kalau ada bug
visual, lihat screenshot-nya dulu sebelum menebak penyebabnya.

Tiga jebakan yang sudah pernah menyakitkan, jangan diulang:

1. **Migrasi lewat port 6543 gagal tanpa pesan error.** drizzle-kit memakai
   `pg_advisory_lock`, tidak didukung pgbouncer mode transaction; yang terjadi
   adalah spinner lalu `exit 1` tanpa output. Karena itu `drizzle.config.ts`
   memakai `DIRECT_URL`, dan `npm run db:apply` ada untuk kasus mirror seperti ini.
2. **Runtime wajib `prepare: false`** (sudah di-set di `src/db/client.ts`).
   pgbouncer mode transaction tidak mendukung prepared statement bernama.
3. **`npm run db:apply` menulis hash ke `drizzle.__drizzle_migrations`** supaya
   `drizzle-kit migrate` tidak mencoba menerapkan ulang.

## Skema & aturan yang tidak boleh dilanggar

- **Uang = `bigint` (rupiah penuh, tanpa desimal).** Stok bahan tetap `numeric`
  karena satuannya bisa pecahan (m3, Liter). Jangan balik ke `numeric(_, 2)`
  untuk uang — itu sumber pembulatan.
- **Semua waktu = `timestamptz`.** Slot payout IRIS disimpan sebagai enum
  (`morning`/`evening`) + `scheduledFor` UTC; **jangan** menyimpan `"06:00"`
  sebagai teks — 06:00 WIB = 23:00 UTC hari sebelumnya.
- **`users.role` tidak punya default.** Wajib dipilih eksplisit.
- **Payout itu batch**: `payout_logs` = 1 transfer, rincian order ada di
  `payout_items`.
- **Pemetaan `progress_stage` → `order_status` hanya di
  `src/lib/order-status.ts`.** Dua enum itu tumpang tindih; jangan mulai aturan
  transisi di tempat lain.
- `examples-schema.ts` sudah dipindah & dipecah jadi `src/db/schema/*.ts`.
  Definisi tabel sekarang tinggal di sana.
- **Alamat pembeli WAJIB tersimpan**: `customer_addresses` (key per
  `(tenant_id, customer_phone)`, satu alamat default per nomor thanks partial
  unique index). `orders.customer_address_id` menunjuk ke sana, TETAPI kolom
  alamat di `orders` tetap di-snapshot — histori order tidak boleh berubah
  saat pembeli mengedit alamatnya.

## RLS & auth — bagian yang paling mudah salah

- Fungsi bantu `current_tenant_id()`, `current_user_role()`, `is_super_admin()`,
  `is_tenant_staff()` adalah `security definer` + `set search_path = ''`.
  Itu satu-satunya cara menghindari **rekursi RLS**: policy yang membaca tabel
  `users` dari dalam policy `users` akan loop. Jangan menggantinya dengan
  subquery biasa.
- User postgres (dipakai Drizzle) **bypass** RLS. Setiap query server WAJIB
  memfilter `tenantId` secara eksplisit. RLS itu lapisan kedua, bukan satu-satunya.
- Trigger `handle_new_user` **menolak** role dari `raw_user_meta_data` dépassé
  `admin_penjualan`/`tukang`, dan `tenant_id` selalu NULL saat signup.
  Onboarding owner hanya boleh lewat kode server-side. Ini sudah diuji.
- `npm run db:test-rls` membuktikan isolasi dengan JWT asli. Jalankan setelah
  menyentuh policy.

## Pendaftaran owner & pembayaran (Sprint 10 Fase D)

- **Tenant yang belum bayar HARUS terkunci di DUA tempat.** Menghapus salah
  satu berarti ada jalan masuk: `app/dashboard/layout.tsx` (redirect ke
  `/menunggu-pembayaran`) dan `src/lib/tenants.ts` (`isActive = false` tidak
  ter-resolve jadi toko publik, jadi tidak muncul di `/t/<slug>`).
  `npm run test:webhook` mengunci keduanya, dan uji itu terbukti menangkap
  regresi saat filter `isActive` sengaja dihapus.
- **`provisionOwner()` tidak boleh diekspor dari berkas `"use server"`.**
  Setiap export di sana adalah endpoint HTTP yang bisa dipanggil siapa saja
  dengan argumen pilihan sendiri; diekspor, provisioning owner berubah menjadi
  endpoint publik. Karena itu ia tinggal di `src/lib/auth/provision.ts` (bukan
  `"use server"`) dan hanya dipanggil `registerOwner` di
  `src/lib/auth/actions.ts`.
- **`subscriptionExpiresAt` tidak boleh diisi periode lengkap saat tenant
  dibuat.** Kalau diisi, tenant yang belum bayar langsung dapat periode gratis
  begitu webhook mengaktifkannya. Isi dengan *awal* periode; webhook yang
  menggantinya dengan *akhir* periode setelah uang masuk.
- **Pendaftaran tidak boleh berhenti hanya karena Midtrans belum
  dikonfigurasi.** Tenant dibuat sebagai `pending` dan pengguna diberi tahu
  pembayarannya belum bisa diproses. Menolak pendaftaran membuat wizard tidak
  bisa diuji; membiarkan pembuatan berhasil lalu gagal di pembayaran
  menyisakan akun yang emailnya sudah terpakai dan tidak bisa diulang.
- **Kegagalan `createSaasCharge()` harus jadi nilai balik, bukan exception.**
  Provisioning sudah berhasil saat charge dipanggil, jadi `throw` jadi 500
  padahal akun sudah ada. Kirim lewat `message` + `redirectTo`, bukan
  `error` — `ZodForm` hanya memanggil `onSuccess` kalau `error` kosong.
- **Webhook Midtrans wajib: signature, idempoten, dan tidak boleh
  membedakan `pending` dari lunas.** `X-Midtrans-Signature` =
  sha512(order_id + status_code + gross_amount + server_key), dibandingkan
  dengan `timingSafeEqual`. `pending` berarti VA sudah dibuat, uang belum
  masuk — mengaktifkannya membuat prinsip "tanpa free trial" jadi tidak
  berarti. Nominal pada notifikasi harus dicocokkan dengan tagihan, kalau
  tidak siapa pun bisa melunasi invoice murah pakai order_id yang sah.
- **`verifyWebhookSignature()` tidak boleh melempar error.** Server key
  kosong berarti verifikasi tidak bisa dilakukan = gagal, jadi `false`.
  Kalau melempar, server yang kredensialnya belum diisi membalas 500 ke
  setiap notifikasi, dan Midtrans lalu mengulang terus-menerus.
- **Pemeriksaan wizard pakai Playwright, bukan `main section`.** Di dalam
  `<main>` ada juga pembungkus tata letak dan section toaster Base UI yang juga
  punya `aria-label`. Selector langkah yang benar: `form section[aria-label]`.
- **Harus `#konten-utama`** di `app/daftar/page.tsx` dan
  `app/menunggu-pembayaran/page.tsx` — `test:responsive` mewajibkannya
  untuk setiap halaman.

## Halaman lacak pesanan (Sprint 5 bagian 4)

- **Kode pesanan SAJA TIDAK CUKUP.** Halaman ini publik, tanpa sesi, dan
  menampilkan nama pembeli, alamat, serta foto progres. Ruang tebakan kode
  (~10^14) memang besar, tapi kode bisa DIBAGIKAN — difoto dari struk, dikirim
  lewat chat, atau diberikan kepada orang yang seharusnya tidak tahu. Karena itu
  diverifikasi juga dengan nomor HP. `findOrderForTracking()` di
  `src/lib/orders-public.ts`.
- **Kegagalan TIDAK boleh dibeda-bedakan.** "Kode tidak ada" dan "nomor salah"
  mengembalikan `null` DAN pesan yang persis sama. Kalau dibedakan, halaman ini
  berubah jadi alat untuk menebak keberadaan pesanan orang.
- **Nomor HP selalu dibandingkan setelah dinormalisasi.** Data bisa tersimpan
  `08xx` (back-office) atau `628xx` (checkout), dan pembeli mengetik format
  berbeda lagi. Membandingkan teks apa adanya menolak pembeli dengan pesan salah.
- **Data yang tidak ditampilkan jangan diambil sama sekali.** Tidak ada
  `netTenantAmount`, `midtransMdrFee`, `platformServiceFee`, `dpAmount`, email,
  maupun koordinat GPS. Margin toko bukan urusan pembeli, dan koordinat adalah
  lokasi rumah orang. `test:lacak` mengunci ini dengan mencari NAMA KUNCI di
  hasil serialisasi — bukan angkanya, karena angka margin bisa kebetulan sama
  dengan total yang memang boleh tampil.
- **Jangan menulis ulang hasil normalisasi secara manual di tes.** Skrip test
  pernah menulis `6281299888777` dengan tangan padahal `normalizePhone` memberi
  `6281299988877` — satu angka beda di tengah, dan dua pengujian gagal terlihat
  seperti bug produk. Hitung dari fungsi yang sama.
- **Halaman lacak di level platform (`/lacak`), bukan di bawah `/t/<slug>`.**
  Pembeli sering tidak ingat nama toko tempat ia memesan; ia ingat kodenya.
- **`/lacak` tidak punya `<main>` sendiri** — `app/layout.tsx` yang
  menyediakan, supaya tidak ada dua landmark. Pembungkus `px-4` ada di halamannya
  sendiri, bukan di layout, supaya halaman full-bleed tetap bisa.

## PWA & luring (Sprint 6)

- **`public/sw.js` tidak boleh menyimpan HTML halaman per-orang.** Navigasi
  selalu network-first, dan tidak ada satu pun dokumen storefront/lacak/
  back-office yang masuk cache. Alasannya bukan quota: HTML-nya berbeda per
  orang (keranjang dari cookie, menu dari role, pesanan yang dilacak), jadi
  HTML yang tersimpan adalah kebocoran.
- **Navigasi harus `fetch(request, { cache: "no-store" })`.** Tanpa itu
  Chromium tetap menyajikan navigasi dari HTTP cache saat luring — gejalanya
  halaman orang lain yang muncul tepat saat jaringan putus, dan tidak
  terlihat sama sekali saat online.
- **Precache harus mengambil chunk-nya juga, bukan cuma HTML.** Kalau hanya
  HTML `/offline` yang tersimpan, halamannya tampil tapi React tidak pernah
  hydrasi karena chunk JS-nya belum pernah diunduh. Gejalanya tombol yang
  diam-diam tidak bekerja.
- **Fallback luring dua tingkat:** dokumen yang di-precache untuk path yang
  diminta, lalu `/offline`. Selalu melompat ke `/offline` membuat precache
  beranda jadi mubazir.
- **Halaman yang di-precache hanya `/` dan `/offline`.** `/` aman karena
  landing page platform tidak memuat apa pun dari cookie.
- **Tombol "Coba lagi" harus `location.reload()`, bukan `<Link href="">`.**
  `href` kosong = navigasi ke dokumen yang sama, bukan memuat ulang, jadi saat
  server masih mati orang menekan tombol yang tidak melakukan apa-apa.
- **`/api/**` dan non-GET tidak pernah dilayani dari cache.** Kalau notifikasi
  dilayani dari cache, Midtrans menerima 200 palsu lalu berhenti mengirim.
- **Tidak ada tombol "Pasang aplikasi" buatan sendiri.** Chrome dan iOS sudah
  menawarkannya; tombol yang hanya muncul di sebagian peramban lebih
  membingungkan daripada membantu.
- **SW tidak didaftarkan di `next dev`** (HMR akan menampilkan versi lama).
  `test:pwa` karena itu harus jalan terhadap `npm run start`.
- **`test:pwa` menyalakan `next start` sendiri di port 3199** dan benar-benar
  mematikan prosesnya untuk menguji luring. Alasannya: `context.setOffline()`
  Playwright tidak berlaku untuk permintaan service worker, jadi cara itu
  "lolos" tanpa menguji apa pun. Server port 3000 tidak boleh disentuh.
- **`finally` itu wajib di `test:pwa`.** Eksekusi yang gagal di tengah
  akan meninggalkan proses `next start` yatim; jalankan ulang selalu aman
  karena `stopServer()` membebaskan port 3199 lebih dulu.

## Checkout & pembayaran Midtrans (Sprint 5)

- **Tidak ada nilai uang dari klien, tanpa kecuali.** Keranjang hanya berisi
  `slug` + `qty`, dan tidak ada satu pun nominal yang dibaca dari sana. Harga
  dari `products`, ongkir dari `shipping_rates`. Cookie keranjang sengaja tidak
  ditandatangani — mengeditnya hanya bisa salah pilih barang, dan itu akan
  terhitung benar.
- **`readCart()` tidak boleh mengembalikan objek yang dipakai bersama.**
  `emptyCart()` selalu objek baru. `EMPTY_CART` versi lama dipakai bersama
  antar permintaan, dan `addToCartLine()` memutasi objek itu, jadi satu
  proses Next mengumpulkan keranjang semua pembeli tanpa cookie — pembeli
  berikutnya menerima barang milik orang lain, termasuk dari toko lain.
- **`clearCart()` tidak boleh dipanggil di `createCheckoutOrder`.** Mengosongkan
  cookie di server membuat Router me-render ulang halaman tanpa
  `CheckoutClient`, jadi komponen yang mengarahkan ke Midtrans ter-unmount dan
  pembeli terjebak di halaman keranjang kosong padahal sudah ditagih.
  Pengosongan terjadi di klien, sebelum navigasi, dan kegagalannya tidak
  menghalangi navigasi.
- **`?? 0` untuk ongkir tetap dilarang, dan sekarang juga dikunci tes.**
  `test:checkout` memeriksa kata kuncinya di sumber, bukan cuma angka — karena
  pemeriksaan angka tetap lulus kalau ada `?? 0` yang ditambahkan belakangan.
- **Aturan lookup ongkir ada di `src/lib/shipping-lookup.ts`, bukan di
  komponen.** Modul itu murni dan dipakai server (`findShippingRate`) maupun
  klien (menampilkan ongkir sebelum bayar). Dua salinan aturan pasti
  menyimpang; `test:checkout` mengunci urutan khusus → cadangan → `null`.
- **`addressId` dari FormData wajib disaring `tenantId`**, bukan hanya `id`.
  Alamat milik tenant lain ditolak dengan pesan yang bisa dibaca; tes memakai
  setter native + event `input` untuk menusipkan id asing, karena
  `field.value = x` pada controlled input ditimpa React di render berikutnya
  dan pengujiannya jadi tidak menguji apa pun.
- **Satu webhook, dua jenis tagihan.** `order_id` yang membedakan: `saas-…`
  untuk langganan, `ord-…` untuk pesanan. Notifikasi tidak membawa knowledge
  itu, jadi bentuknya yang jadi penanda.
- **`pending` bukan lunas.** Status `capture`/`settlement` saja yang
  mengirim pesanan; `deny`/`cancel`/`expire` mengembalikan pesanan ke
  `pending_dp` supaya pembeli bisa mencoba lagi, dan TIDAK mengubah
  `paymentStatus` jadi `refunded`.
- **Snap v1 tidak menerima `expiry`.** Field itu ditolak dengan pesan
  `expiry unit & duration must present` yang menyesatkan. `expiry` adalah fitur
  `/v2/charge`.
- **`redirect_url` dari API dipakai langsung**, bukan dirangkai dari token:
  nomor versi jalannya (`snap/v4/redirection/…`) berubah dari waktu ke waktu.
- **Server Action dari Client Component tidak bisa `redirect()`.** Kembalikan
  `redirectTo`; navigasi dilakukan di klien.
- **`finishUrl` dari Host request**, bukan `NEXT_PUBLIC_APP_URL` (di-inline
  saat build, jadi satu build untuk lokal dan Vercel akan mengarahkan ke
  domain yang salah).
- **MDR dan platform fee 1,5% belum dihitung** — itu Sprint 6. `orders` sudah
  punya kolomnya. Sumber tarifnya sudah dicek dan ditulis di
  `docs/midtrans-fee.md`; **bacanya sebelum implementasi payout.**
  Dua temuan dari sana yang mengubah desain:
  - **Tidak ada field biaya di payload webhook maupun respons GET status.**
    Semua contoh resmi tidak memuat `fee_amount`. Jadi MDR TIDAK boleh diambil
    dari notifikasi, dan `?? 0` jelas dilarang — pencairan harus DIBLOKIR kalau
    tarif channel-nya belum diisi.
  - **MDR adalah komponen terpisah dari fee Midtrans** (kolom "Total MDR" vs
    "Total Transaction Fee … excluding MDR" di halaman Billings), dan PPN 11%
    diambil dari nilai fee — kecuali QRIS, GoPay, dan ShopeePay.
  - Tarif di halaman publik adalah **batas bawah**, bukan angka final untuk
    akun merchant kita; diskon tidak pernah dipublikasikan.
  - **Fee ditanggung pengrajin, bukan platform** (PRD v1.6). Jadi
    `platformServiceFee` = 1,5% × `totalAmount` (produk + ongkir) UTUH, dan
    `midtransMdrFee` dipotong ke pengrajin. Rinciannya harus tampil di tiga
    tempat (wizard pendaftaran, ringkasan saldo, detail pesanan) dan TIDAK
    boleh tampil di halaman lacak publik.
  - **`feePayout` Rp 5.000 itu per BATCH pencairan, ditanggung platform.**
    Satu panggilan Payouts = Rp 5.000 berapa pun pengrajin di dalamnya, jadi
    dua slot/hari = Rp 10.000/hari. Nilai yang ditransfer ke pengrajin
    TIDAK dipotong — sama persis dengan saldonya. Asumsi "per batch" belum
    dikonfirmasi Midtrans; kalau per-penerima, biayanya tumbuh 10× pada 100
    pengrajin.
  - Fee dicatat sebagai **beban**, bukan pengurangan pendapatan.
  - **Semua konstanta fee hanya di `src/lib/fees.ts`.** Berkas itu sengaja
    TIDAK memakai `server-only` supaya modal kalkulator di modul produk dan
    server membaca angka yang sama. Kalau ditambah `server-only`, modal akan
    menarik graf modul server ke bundel klien.
  - **`test:checkout` mengunci daftar kanal.** Begitu QRIS atau kartu kredit
    aktif lagi, seluruh hitungan fee di `docs/midtrans-fee.md` tidak berlaku
    karena tarifnya persen — dan tidak ada pemeriksaan lain yang menangkapnya.

## Tarif ongkir (Sprint 5 bagian 3)

- **Pencocokan tarif WAJIB pakai `regencyId`, TIDAK PERNAH nama kota.**
  "Bandung" bisa Kabupaten Bandung (32.04) ATAU Kota Bandung (32.73), dan
  "Jakarta" tidak ada sebagai satu kabupaten sama sekali — dia dipecah jadi
  lima "Kota Administrasi Jakarta *". Pencocokan teks memilih kota yang salah
  tanpa error, dan tidak ada yang mengetahuinya sampai pembeli protes.
  Fungsinya: `findShippingRate()` di `src/lib/shipping.ts`.
- **Urutan lookup tidak boleh diubah:** (1) tarif khusus `regencyId` persis
  sama → (2) tarif cadangan `isDefault` → (3) `null`.
- **JANGAN pernah `?? 0` atau tarif terkecil sebagai jaring pengaman.**
  Pembeli yang melihat total murah lalu membayar, sementara ongkir sebenarnya
  tidak ditagih, adalah kegagalan diam-diam yang paling merusak di checkout.
  `null` wajib membuat pemanggil memblokir.
- **Query ongkir TIDAK boleh diekspor ulang dari berkas `"use server"`.**
  Berkas itu hanya boleh mengekspor async function; `export { x } from
  "@/lib/shipping"` menarik seluruh graf modul (drizzle, next/cache) ke bundel
  klien dan build gagal dengan "Ecmascript file had an error" — sementara
  `typecheck` tetap lolos. Impor langsung dari `@/lib/shipping`.
- **Unggahan tarif memakai dropdown, bukan teks bebas.** Provinsi + kabupaten
  ada di snapshot bundel, jadi formnya tidak pernah memanggil jaringan.
- **`isDefault` + `regencyId` tidak boleh dipakai bersamaan** (ditegakkan
  skema). Cadangan berlaku untuk semua wilayah; yang ada `regencyId`-nya
  berlaku untuk satu kabupaten. Hanya satu cadangan per tenant, dijamin
  `shipping_one_default_uniq`.
- **`setValue()` pada field yang tidak terdaftar tidak masuk FormData.**
  `cityName` dan `provinceName` tidak punya input terlihat, jadi keduanya butuh
  `<input type="hidden">` yang nilainya dibaca dari `watch`. Tanpa itu, form
  submit tanpa `cityName` dan skema menolaknya padahal dropdown sudah terisi.
- **Baris hasil backfill yang ambigu ditampilkan, bukan disembunyikan.**
  `NeedsReviewNotice` memperingatkan tarif yang belum punya `regencyId` dan
  bukan cadangan — diam-diamnya tarif generik itu jenis kesalahan yang baru
  ketahuan setelah ada yang protes.

## Peta (Leaflet + OSM)

- **Leaflet, bukan MapLibre.** Kebutuhan di sini cuma menandai satu titik yang
  bisa diketuk. MapLibre 20,7 MB + WebGL; Leaflet 1.9.4 kecil dan jalan tanpa
  WebGL.
- **`next/dynamic` itu wajib, bukan optimalisasi.** Impor statis — bahkan di
  berkas `"use client"` — menarik Leaflet ke bundel yang dimuat SETIAP
  pengunjung storefront, termasuk yang tidak pernah menyentuh peta.
  `test:alamat` mengunci ini: 0 permintaan Leaflet sebelum peta dibuka.
- **Jangan pakai `L.marker` bawaan.** Yang bawaan mencari PNG ikon lewat
  `L.Icon.Default.imageUrl` dan asset-nya tidak ikut terbawa di bundler
  modern, jadi marker-nya rusak. Pakai `L.circleMarker` — digambar SVG,
  tanpa aset yang bisa 404.
- **`L.map()` pada elemen yang sudah punya peta melempar** "Map container is
  already initialized". Efek mount bisa berjalan dua kali di React Strict
  Mode, jadi `map.remove()` dulu sebelum membuat peta baru.
- **Tulis `ref.current` di dalam `useEffect`, bukan saat render.** Pola
  "latest ref" yang assigning `ref.current = fn` di body komponen ditolak
  aturan `react-hooks/refs`, dan memang berbahaya pada render yang dibatalkan.
- **URL tile lewat `NEXT_PUBLIC_OSM_TILE_URL`.** Tile OSM publik dilarang untuk
  penggunaan komersial/berskala besar; variabel ini supaya produksi bisa
  menunjuk penyedia berizin tanpa menyentuh kode. Atribusi © OpenStreetMap
  wajib tampil dan diuji.
- **Peta tetap OPSIONAL.** `latitude`/`longitude` nullable, dan nilainya juga
  bisa diisi lewat geolokasi browser. Tidak ada langkah yang memaksa peta.

## Kirim foto progres via WhatsApp (Sprint 4)

- **TIDAK ada gateway WhatsApp pihak ketiga.** Tidak ada Fonnte, tidak ada
  `wa.me` yang dikirim server, tidak ada kredensial WA di `.env`. Foto dikirim
  manual oleh tukang lewat tautan `wa.me` yang dibangun di
  `src/lib/wa-link.ts` dan dirender di `src/components/carpenter-queue.tsx`.
  Alasan lengkapnya di PRD.md §4 Modul 4.
- **Alasan tekniknya yang paling penting:** foto progres disimpan di bucket
  privat dan hanya dilayani signed URL berumur satu jam
  (`src/lib/storage.ts`). Gateway WA bisa mengirim teks dan satu tautan, tidak
  bisa melampirkan foto. Kalau dulu otomatis, yang sampai ke pembeli cuma
  "produksi Anda sudah di tahap Finishing" tanpa bukti pekerjaan.
- **Label tombol harus jujur.** Tombolnya "Kirim lewat WhatsApp", bukan
  "Kirim foto", dan ada teks "Pilih fotonya di sana". `wa.me` hanya membuka
  percakapan; fotonya tetap dipilih tukang. Kalau labelnya "Kirim foto",
  orang menekan sekali lalu mencari-cari kenapa belum terkirim.
- **Normalisasi nomor WA WAJIB** dan dilakukan di server
  (`loadCarpenterQueue`), bukan di komponen: `wa.me` menolak nomor diawali 0
  sedangkan data bisa `08xx`, `628xx`, atau `+62 812-3456-7890`. Nomor gagal
  dinormalisasi jadi `null` supaya tombolnya tidak dirender — `wa.me` tanpa
  nomor membuka WhatsApp tanpa tujuan dan pengguna baru sadar setelah
  menekan kirim, ke nomor yang salah.
- **Tidak ada kuota WA.** `monthlyWaQuota` sudah dihapus dari
  `src/lib/plans.ts` dan barisnya dibuang dari tabel harga publik. Kalau
  dibiarkan, halaman itu mengiklarkan batas yang tidak ditegakkan kode mana
  pun. Tabel `notification_usage` tetap ada untuk kuota push notification
  Sprint 6.
- **Uji yang membersihkan fikstur harus menghapus audit-nya juga.**
  `integration_audit_logs.tenant_id` memakai `onDelete: "set null"`, jadi
  baris audit tidak ikut terhapus bersama tenant. Kalau tidak dihapus
  eksplisit, setiap menjalankan skrip mencampur sampah test ke tabel yang
  dibaca super admin.
- **Yang hilang dan itu sadar:** percakapan terjadi di WhatsApp, bukan di
  FurniTech. FurniTech tidak tahu pesan terkirim atau dibaca, dan timeline
  pesanan tidak mencatat "pembeli sudah diberi tahu".
- **Layar tukang bukan halaman pesanan yang disamarkan.**
  `src/components/carpenter-queue.tsx` menampilkan hanya pesanan yang
  ditugaskan ke tukang itu, dimensi dalam cm, tahap terakhir dari lima, dan
  tidak ada satu pun nominal rupiah. Data keuangan tidak relevan di bengkel,
  dan `test:carpenter` mengunci "tidak ada nominal" itu — yang mustahil
  dibuktikan dari source code.

## Back-office Sprint 3

- **Semua Server Action WAJIB lewat guard** `requireTenantWrite([...roles])`
  (src/lib/auth/guard.ts). `tenantId` SELALU dari guard, TIDAK PERNAH dari
  FormData. Klien Drizzle bypass RLS, jadi ini satu-satunya penahan tenantId
  yang salah. Query update/delete juga diverifikasi ulang tenantId-nya —
  knowing an UUID saja tidak cukup.
- **Stok bahan hanya boleh berubah lewat `adjustStock()`**, yang memperbarui
  `materials.quantity` dan menulis `material_adjustments` dalam satu
  transaksi. Ubah `quantity` langsung = jejak audit rusak.
- **Uang masuk form sebagai string** dan dikonversi di `src/lib/parse.ts`
  (`parseRupiah`, `parseDecimal`). Kolom `numeric` di Drizzle bertipe string.
- **Transisi status** hanya lewat `transitionOrderStatus`, yang memvalidasi
  dengan `canTransition()` DAN `ROLE_ALLOWED_TARGETS` (tukang tidak boleh
  menandai shipped/completed).
- **Foto produk & progres** masuk bucket privat `product-images`; render
  memakai signed URL. Object path yang disimpan, bukan URL. Jangan pernah
  menempelkan path mentah ke `<img src>`.
- **Form HTML tidak boleh bersarang.** Kalau butuh dua action dalam satu
  kartu, letakkan dua `<ActionForm>` sebagai saudara — browser akan
  men-olah form yang diinside.
- Navigasi per peran di `src/lib/nav.ts` (tukang hanya melihat antrean
  produksi). Menyembunyikan menu BUKAN otorisasi — guard tetap berlaku.

## Validasi form (zod + react-hook-form)

- Satu skema dipakai DUA kali: browser (react-hook-form) untuk umpan balik
  instan, lalu Server Action lagi sebagai lapis kedua. Dokumentasi lengkap di
  `docs/validasi.md`.
- **Otorisasi selalu lebih dulu, baru validasi.** Kalau validasi didahulukan,
  server membocorkan bentuk data yang diterima ke pemanggil yang tidak berhak.
- **Dua skema per form**: `*FormSchema` (field yang diketik pengguna) dan
  skema penuh yang menambahkan `id` milik server. Skema form TIDAK boleh
  memuat id — nilainya disuntikkan server sebagai input tersembunyi.
- **Skema zod TIDAK bisa dikirim dari Server Component ke Client Component**
  (tidak serializable). Karena itu `ZodForm` menerima skema sebagai impor di
  dalam file Client Component, bukan sebagai prop. Kalau sebuah form
  "dilewatkan" skema lewat prop, itu salah arsitektur.
- **Transformasi angka wajib ber-guard.** `Number("abc".replace(/\D/g,""))` → 0,
  jadi input buruk diam-diam jadi valid. `rupiah` menolak string tanpa digit
  dan tanda minus di depan. `decimalInput` menerima "+10" (form penyesuaian
  stok menyuruh mengetik begitu) tapi menolak "+ 10" dengan spasi.
- **Pesan zod bawaan berbahasa Inggris** ("Invalid input: expected string…")
  diterjemahkan di `parseForm()`. Pesan itu tidak boleh sampai tampil ke
  pengguna — ada test-nya.
- **Input file tidak didaftarkan ke RHF.** RHF tidak mengurus File; nilainya
  diambil dari `new FormData(formElement)` lalu divalidasi di
  `src/lib/storage.ts` (MIME + ukuran).
- `ActionForm` (useActionState) hanya untuk aksi tanpa input: ubah status,
  tandai dibaca, hapus. Jangan dipakai untuk form berisi input.
- **Jangan pernah memanggil `watch()` milik react-hook-form saat render.**
  `watch` adalah fungsi biasa, bukan hook; memanggilnya membuat React Compiler
  melewati memoisasi dan nilainya bisa stale. Komponen yang butuh nilai langsung
  memakai `useWatch` + `useFormContext` di dalam `<FormProvider>` — lihat
  `src/components/payment-breakdown-live.tsx`.
- `FormData` diambil dari `event.target` pada handler submit, BUKAN dari
  `useRef`. Membaca `ref.current` di dalam callback memicu
  `react-hooks/refs`.
- `src/lib/parse.ts` (parsing FormData manual) sudah superseded oleh skema.
  Jangan menambah fungsi parsing baru di sana.

## Auth & RBAC

Tiga lapis, urut dari yang paling murah:

1. **`proxy.ts` fast-path** — hanya cek ada/tidaknya cookie auth (prefix `sb-`).
   Ini HANYA penghematan kerja, bukan otorisasi.
2. **Layout server** — `app/dashboard/layout.tsx` memakai `requireSession()`,
   `app/admin/layout.tsx` memakai `requireRole(["super_admin"])`. Di sinilah
   keputusan role diambil, selalu dari database.
3. **RLS** — lapisan terakhir, sudah ada di Postgres.

Aturan yang tidak boleh dilanggar:
- `requireSession` melakukan redirect ke `/login?next=...`; `requireRole`
  melakukan redirect ke `/forbidden` (bukan ke login) karena user-nya memang
  sudah sah, hanya tidak berhak.
- `next` dari query string WAJIB divalidasi sebagai path internal
  (`startsWith("/")`, bukan `//` atau `://`) — kalau tidak, ini open redirect.
- Item navigasi dikirim dari server ke client (prop `items`), TIDAK dihitung
  dari role di sisi browser.
- `getAuthUser()` memvalidasi JWT ke server Supabase. Jangan pernah mempercayai
  isi cookie JWT tanpa memvalidasi.
- `useActionState` adalah hook → form login harus `"use client"`, sementara
  Server Action-nya tetap di file `"use server"`.

Cookie session Supabase bernama `sb-<project-ref>-auth-token` dengan nilai
`base64-` + base64(JSON session). `scripts/test-auth.ts` menyusun cookie dengan
format itu untuk menguji HTTP end-to-end.

## Multi-tenant routing

Dua mode, dipilih otomatis oleh ada/tidaknya root domain:

| Mode | Kapan | Cara akses tenant |
|---|---|---|
| path-based | `NEXT_PUBLIC_ROOT_DOMAIN` kosong (kondisi sekarang) | `/t/<slug>`, mis. `/t/mebeljaya` |
| host-based | root domain diisi | `slug.furnitech.id` atau custom domain terverifikasi |

- `proxy.ts` me-rewrite request ke `/t/*`; tenant di-resolve di **page**, bukan
  layout. `params` pada layout hanya berisi segmen dinamis di jalur layout itu
  sendiri, jadi `app/t/layout.tsx` selalu menerima `params = undefined` —
  segmen `[[...slug]]` ada di bawahnya. Resolusi di-page tetap hanya satu query
  per request karena dibungkus React `cache()`.
- **`NEXT_PUBLIC_*` di-inline Next saat BUILD.** Mengubah
  `NEXT_PUBLIC_ROOT_DOMAIN` lalu hanya restart TIDAK berpengaruh; harus
  `npm run build` ulang. Gejalanya: proxy tidak pernah rewrite, semua host
  dilayani halaman platform, dan tidak ada error sama sekali.
- Host `*.vercel.app` / `*.vercel-dns.com` selalu diperlakukan sebagai host
  platform, tidak boleh jadi subdomain tenant.
- **Host dibaca dari `x-forwarded-host` → `host`, bukan `request.url`.** Secara
  lokal `request.url` berisi alamat server (`localhost:3000`) walau Host
  header-nya domain tenant — dulu ini membuat rewrite diam-diam gagal. Di
  Vercel `request.url` berisi URL deployment. `getRequestHost()` menangani
  keduanya.
- Matcher `proxy.ts` wajib mengecualikan `_next/static`, `_next/image`, dan
  aset — kalau tidak, CSS/JS/gambar gagal dimuat.
- **Server Function bukan route terpisah**: matcher yang mengecualikan path akan
  melewati Server Function di path itu juga. Otorisasi wajib diulang di dalam
  setiap Server Function/Action, tidak boleh hanya mengandalkan proxy.
- Deploy ke **Vercel**: setiap domain tenant harus didaftarkan sebagai domain di
  project Vercel.

## Pushing to GitHub

`origin` = `https://github.com/furnitech-indonesia/FirniTech.git` (branch `main`).

Token bawaan codespace (`GITHUB_TOKEN`, app token `ghu_`) hanya ter-scope ke
`github/codespaces-nextjs`, jadi `git push` biasa gagal `403`. `/etc/gitconfig`
juga mendaftarkan `/.codespaces/bin/gitcredential_github.sh` sebagai credential
helper **pertama**, sehingga menutupi helper repo. PAT ada di `.env` dan
`.git/gh-credentials` (keduanya 600, `.env` di-gitignore). Selalu push dengan:

```bash
git -c credential.helper= -c 'credential.helper=store --file=.git/gh-credentials' push
```

Jangan membungkus ini dalam `git config alias` — quoting bersarang di alias `!`
merusak nilai `-c` di dalamnya dan alias itu diam-diam hanya mencetak git usage.

## Design system, ikon & komponen

- **Token satu arah: `DESIGN.md` → `app/globals.css` → utilitas Tailwind.**
  Nilai warna ada di bagian `:root`, lalu dipetakan ke utilitas lewat
  `@theme inline`. JANGAN menulis utilitas warna langsung di markup —
  `test:responsive` akan gagal. `DESIGN.md` tetap sumber kebenaran.
- **Skala tipografi, elevasi, dan permukaan tambahan ada di blok `@theme`
  (NON-inline), bukan `@theme inline`.** Stitch §Typography memberi 12 peran teks
  (`text-display` … `text-code-tabular`), 3 level bayangan (`shadow-card`,
  `shadow-card-hover`, `shadow-overlay`), dan 2 permukaan (`bg-surface-sunken`,
  `bg-surface-overlay`).
  - **Jangan** memindahkannya ke `@theme inline` dengan `var()` yang menunjuk
    nama variabelnya sendiri (`--text-display: var(--text-display)`). Itu
    referensi melingkar dan Tailwind **diam-diam tidak menghasilkan
    utility-nya** — tidak ada error, build tetap hijau, `.text-display` hilang
    dari CSS. Sudah pernah terjadi sekali. `test:responsive` memeriksa
    keberadaan blok `@theme` non-inline karena itu.
  - Token `@theme` hanya jadi utility kalau **dipakai**. Kalau menambah peran
    teks baru, ia tidak akan muncul di CSS sampai ada yang memakainya — itu
    normal, bukan bug.
- **Skill `.agents/skills/` (taste-skill) TIDAK dipakai untuk arah estetika.**
  Arahnya bertentangan dengan `DESIGN.md`: mengganti Inter, GSAP/bento, material
  brütalis. Yang diambil hanya checklist aksesibilitas (skip-link, focus ring,
  `prefers-reduced-motion`, empty/loading/error state). Jangan menambah dependency
  dari skill itu tanpa alasan.
- **Skip-to-content wajib ada.** `<a className="skip-link" href="#konten-utama">`
  di `app/layout.tsx`, dan setiap `page.tsx` punya `<main id="konten-utama">`.
  `test:responsive` menegakinya.
- Token status (pending/production/quality/settled/failed) dipakai lewat
  `bg-status-*` / `text-status-*`, bukan `bg-yellow-100` langsung.
- **shadcn/ui adalah pemilik TUNGGAL primitif** di `src/components/ui/`
  (Base UI, bukan Radix). Primitif itu milik kita sekarang — boleh diedit,
  tapi jangan menulis ulang primitif baru di tempat lain. `src/components/ui.tsx`
  yang lama sudah DIHAPUS karena berduplikasi.
  - Yang tetap milik kita: `src/components/panels.tsx` (`SectionCard`,
    `EmptyState`) — itu **komposisi pola halaman**, bukan primitif; dan
    `rhf-fields.tsx` — logika react-hook-form di dalam primitif shadcn.
  - `test:responsive` menegakkan aturan ini plus aturan "ActionForm tidak
    boleh dipakai untuk form berisi input".
- **Dua penyimpangan yang disengaja dari bawaan shadcn**, keduanya lewat
  `cva` dan bukan menyalin kode:
  - `badge`: 5 varian status (pending/production/quality/settled/failed) dari
    DESIGN.md §3. Bawaan shadcn hanya punya destructive.
  - `button`: varian `size="touch"` (min-h-11). Ukuran bawaan maksimum
    `h-9` (36px) dan TIDAK memenuhi syarat 44px di PRD §3.1.
- **Ikon: Phosphor, inline SVG. Bukan icon font dari CDN.** Ini syarat offline
  untuk PWA dan Capacitor (PRD §7.2), bukan selera visual.
  - Di **Client Component**: `import { XIcon } from "@phosphor-icons/react"`.
  - Di **Server Component**: WAJIB `from "@phosphor-icons/react/dist/ssr"`.
    Entry utama memanggil `createContext` yang tidak ada di RSC, dan build
    gagal dengan `createContext is not a function`. Ada test-nya.
  - Batas RSC: komponen ikon **tidak boleh** dikirim dari Server Component ke
    Client Component sebagai bagian dari array/prop. Karena itu `DashboardNav`
    menerima `role` (string) lalu memanggil `navForRole()` di sisi klien.
- `cn()` ada di `src/lib/utils.ts` (clsx + tailwind-merge). Wajib dipakai
  saat menggabungkan className pada komponen shadcn agar prop bisa menimpa.

## Tampilan responsif (PRD §3.1)

- Tiga ukuran: mobile (<768px), tablet, desktop (>=1024px). Desktop adalah
  kondisi paling longgar; yang perlu dirancang justru mobile.
- **Tabel data wajib punya padanan kartu** di bawah `md` (`md:hidden` + tabel
  `hidden md:block`). Scroll horizontal bukan jawaban yang baik.
- **Target sentuh 44px** → pakai `min-h-11` pada link, tombol, dan item menu.
- Jangan ada lebar tetap (`w-[400px]`) di className. Jangan ada informasi yang
  hanya muncul saat hover.
- Padding iOS notch/home indicator: kelas `.safe-top` dan `.safe-bottom`
  (memakai `env(safe-area-inset-*)`).
- Zoom tidak dibatasi (viewport `maximumScale: 5`).
- `npm run test:responsive` memeriksa aturan-aturan ini secara struktural.
  Pemeriksaan ini bukan pengganti pengujian visual.

## Skill UI/UX (.opencode/skills/)

Terpasang lewat `npx ui-ux-pro-max-cli init --ai opencode` (CLI `ui-ux-pro-max-cli`,
perintah `uipro`): 7 skill di `.opencode/skills/` — `ui-ux-pro-max`, `design`,
`ui-styling`, `design-system`, `brand`, `banner-design`, `slides`. Butuh Python 3
untuk skrip search-nya (sudah ada di codespace ini).

**Aturan presedensi — penting:** `DESIGN.md` adalah brand identity yang sudah
disetujui dan itu yang jadi acuan. Skill ini berguna untuk accessibilitas,
anti-pattern, tipografi, dan review — bukan untuk mengganti warna atau font.
Sebagai bukti: `search.py "furniture workshop SaaS dashboard" --design-system`
menghasilkan biru `#2563EB` + aksen oranye `#EA580C` + Plus Jakarta Sans +
Glassmorphism, yang **bertentangan** dengan DESIGN.md (slate + amber `#D97706`
+ Inter + tampilan clean tanpa efek kaca). Jangan menimpa token yang sudah
dipetakan di `app/globals.css` dengan hasil generator.

Skill juga menyarankan Material Symbols diganti Phosphor, dan `ui-styling`
menyarankan shadcn/ui. Keduanya belum tentu benar untuk repo ini —
Material Symbols sudah jadi keputusan DESIGN.md §5, dan menambah shadcn berarti
menambah Radix. Putuskan eksplisit sebelum berubah.

Penggunaan dasar:
```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "keyword" --design-system -f markdown
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
```

## Env & secrets

- `.env` = secret asli (600, gitignored). `.env.example` = placeholder, ter-commit.
  Jaga keduanya tetap sinkron saat menambah variabel.
- **Root domain belum ada.** `NEXT_PUBLIC_ROOT_DOMAIN` sengaja dikosongkan, jadi
  tenant routing berbasis host MATI dan yang aktif adalah mode path-based
  `/t/<slug>` (mis. `/t/mebeljaya`). Begitu domain diisi, subdomain routing
  langsung aktif — TAPI perlu `npm run build` ulang, karena `NEXT_PUBLIC_*`
  di-inline saat build. Jangan isi `furnitech.id` sebagai default
  hanya agar terlihat "benar" — itu membuat `*.vercel.app` tertafsir sebagai
  subdomain tenant dan seluruh halaman jadi 404.
- Kredensial akun uji tersimpan di `.env` (`TEST_SUPERADMIN_EMAIL`,
  `TEST_OWNER_EMAIL`, `TEST_ACCOUNT_PASSWORD`). **Hapus sebelum produksi.**
- Proyek Supabase `irpweashghfmhzqnunyj`, region **ap-northeast-1**. Kunci
  berformat baru (`sb_publishable_*` / `sb_secret_*`); JWT lama disimpan sebagai
  `SUPABASE_ANON_JWT` / `SUPABASE_SERVICE_ROLE_JWT`.
- `sb_secret_*` (service role) = admin penuh. Tidak boleh masuk `NEXT_PUBLIC_*`
  maupun kode client. Kalau bocor, rotasi lewat dashboard Supabase.
- Midtrans (Core + IRIS), Cloudflare, dan Firebase **belum diisi**.

## Konvensi

- Dokumen produk berbahasa Indonesia; kode & identifier bahasa Inggris.
- Aturan bisnis yang mudah salah: tanpa free trial, platform fee 1.5%, MDR
  Midtrans dipotong sebelum saldo pengrajin, payout IRIS 06.00 & 18.00 WIB.
- Batas paket & slot payout: `src/lib/plans.ts` (sumber tunggal).
