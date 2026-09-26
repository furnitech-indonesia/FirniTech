# FurniTech

SaaS multi-tenant untuk pengrajin dan UMKM mebel: **storefront** (katalog, ongkir
otomatis, checkout Midtrans) dan **back-office** (order, RBAC, inventaris, visual
progress tracker), ditambah **Super Admin** untuk Denny/service provider.

Dokumen produk (bahasa Indonesia):

| File | Isi |
|---|---|
| `PRD.md` | Kebutuhan produk, model bisnis, modul, struktur data |
| `ROADMAP.md` | Rencana 6 sprint + Definition of Done |
| `DESIGN.md` | Brand & design tokens (sudah dipetakan ke Tailwind) |

## Stack

Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 · Drizzle ORM ·
Supabase (PostgreSQL + Auth + RLS + Storage) · Vercel · Midtrans (Core + IRIS) ·
Cloudflare for SaaS · Fonnte · Firebase FCM.

## Menjalankan

```bash
npm install
cp .env.example .env    # lalu isi nilainya
npm run dev             # http://localhost:3000
```

`npm run dev` sudah otomatis berjalan di GitHub Codespaces
(`.devcontainer/devcontainer.json` → `postAttachCommand`).

## Verifikasi

Repo ini belum punya test framework; gerbang quality adalah lint + typecheck +
build, ditambah dua skrip yang memeriksa database sungguhan.

```bash
npm run lint         # ESLint CLI (next lint sudah dihapus di Next 16)
npm run typecheck    # tsc --noEmit
npm run build        # build produksi (Turbopack)

npm run db:verify    # cek tabel, RLS, trigger, kolom uang, isolasi anon
npm run db:test-rls  # uji isolasi tenant dgn JWT pengguna sungguhan

# butuh server jalan: npm run build && npm run start
npm run test:auth    # 11 uji auth & RBAC (login, 403, redirect per role)
npm run test:schemas # 14 uji skema validasi (guard uang, pesan, id)
npm run test:responsive # 9 pemeriksaan struktural responsif & token
npm run test:sprint3 # 16 uji halaman back-office & pembatasan role
```

Urutannya: `lint → typecheck → build`, lalu `db:verify` bila ada perubahan
skema/RLS. Rebuild di Codespaces menjalankan `npm install && npm run build`,
jadi build yang rusak langsung ketahuan.

## Database

```bash
npm run db:generate   # buat SQL migration dari src/db/schema
npm run db:migrate    # terapkan (wajib lewat DIRECT_URL, port 5432)
npm run db:apply      # sama seperti migrate, tapi menampilkan error SQL apa adanya
npm run db:studio     # inspeksi visual
npm run db:seed        # tenant + produk + tarif contoh (idempoten)
npm run db:seed:sprint3 # bahan, variasi, pesanan kustom, percakapan contoh
```

Dua koneksi berbeda, dan itu disengaja:

- `DATABASE_URL` — transaction pooler, port **6543**. Dipakai query runtime.
  Wajib `prepare: false` karena pgbouncer tidak mendukung prepared statement.
- `DIRECT_URL` — session pooler, port **5432**. Dipakai `drizzle-kit migrate`
  karena drizzle-kit memakai `pg_advisory_lock` yang tidak didukung transaction
  mode. Memakai 6543 untuk migrasi akan gagal tanpa pesan error yang jelas.

## Modul back-office (Sprint 3)

| Modul | Rute | Isi |
|---|---|---|
| Katalog & variasi | `/dashboard/produk` | CRUD produk, variasi (ukuran/kayu/finishing), upload foto |
| Inventaris | `/dashboard/materials` | CRUD bahan, penyesuaian stok, Low Stock Alert |
| Pesanan | `/dashboard/pesanan` | daftar, detail, transisi status, pembayaran, resi |
| Custom Order Builder | `/dashboard/pesanan/baru` | catat pesanan di luar katalog + hitung DP/pelunasan |
| Inbox CS | `/dashboard/chat` | percakapan pembeli, balas, tandai terbaca, ubah status |

Tukang hanya melihat antrean produksi: katalog, inventaris, dan inbox
disembunyikan dari navigasinya — dan tetap ditolak bila diakses langsung.

## Validasi form

Satu skema zod dipakai dua kali: `react-hook-form` memvalidasi di browser
untuk umpan balik per field, lalu Server Action memvalidasi ulang sebagai
lapis kedua. Otorisasi selalu berjalan lebih dulu, sebelum validasi.

Lihat `docs/validasi.md` untuk pola lengkapnya.

## Auth & RBAC

Empat peran: `super_admin` (FurniTech sebagai SaaS owner, tanpa tenant),
`owner`, `admin_penjualan`, `tukang`.

- `/login` — email/password dan magic link.
- `/dashboard` — back-office pengrajin (owner, admin penjualan, tukang).
- `/admin` — panel platform, hanya super admin.

Otorisasi berlapis: `proxy.ts` hanya menolak request tanpa cookie auth
(penghematan kerja), keputusan role diambil di layout server dari database, dan
RLS menjadi lapisan terakhir.

## Multi-tenancy

Single database, isolasi lewat `tenant_id` + Supabase RLS.

Dua mode akses tenant, dipilih otomatis:

| Mode | Kapan | Cara akses |
|---|---|---|
| path-based | `NEXT_PUBLIC_ROOT_DOMAIN` kosong (kondisi sekarang) | `/t/<slug>` |
| host-based | root domain diisi | `slug.furnitech.id` atau custom domain terverifikasi |

- `proxy.ts` (Next 16: `middleware.ts` sudah deprecated) me-rewrite ke `/t/*`.
  Host dibaca dari `x-forwarded-host` → `host`, **bukan** `request.url`.
- Tenant di-resolve di page (bukan layout — `params` layout tidak menerima
  segmen anak), dibungkus React `cache()` agar satu query per request.
- `NEXT_PUBLIC_ROOT_DOMAIN` di-inline Next saat build: mengubahnya butuh
  `npm run build` ulang, bukan hanya restart.
- User postgres (dipakai Drizzle) **bypass** RLS, jadi setiap query server
  wajib memfilter `tenantId` secara eksplisit. RLS adalah lapisan kedua.

## Deployment

Vercel. Setiap domain tenant harus ditambahkan sebagai domain di project Vercel;
`proxy.ts` membaca `x-forwarded-host` yang diisi Vercel. Host `*.vercel.app`
selalu diperlakukan sebagai host platform.
