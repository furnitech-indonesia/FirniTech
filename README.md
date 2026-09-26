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
npm run db:seed       # tenant + produk + tarif contoh (idempoten)
```

Dua koneksi berbeda, dan itu disengaja:

- `DATABASE_URL` — transaction pooler, port **6543**. Dipakai query runtime.
  Wajib `prepare: false` karena pgbouncer tidak mendukung prepared statement.
- `DIRECT_URL` — session pooler, port **5432**. Dipakai `drizzle-kit migrate`
  karena drizzle-kit memakai `pg_advisory_lock` yang tidak didukung transaction
  mode. Memakai 6543 untuk migrasi akan gagal tanpa pesan error yang jelas.

## Multi-tenancy

Single database, isolasi lewat `tenant_id` + Supabase RLS.

- `proxy.ts` (Next 16: `middleware.ts` sudah deprecated) me-rewrite host tenant
  ke `/t/*`. Host dibaca dari `x-forwarded-host` → `host`, **bukan** `request.url`.
- `app/t/layout.tsx` resolve tenant: subdomain `slug.furnitech.id` atau custom
  domain yang sudah terverifikasi.
- User postgres (dipakai Drizzle) **bypass** RLS, jadi setiap query server
  wajib memfilter `tenantId` secara eksplisit. RLS adalah lapisan kedua.

## Deployment

Vercel. Setiap domain tenant harus ditambahkan sebagai domain di project Vercel;
`proxy.ts` membaca `x-forwarded-host` yang diisi Vercel.
