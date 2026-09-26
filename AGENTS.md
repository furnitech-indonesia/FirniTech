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
```

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
- Midtrans (Core + IRIS), Cloudflare, Fonnte, dan Firebase **belum diisi**.

## Konvensi

- Dokumen produk berbahasa Indonesia; kode & identifier bahasa Inggris.
- Aturan bisnis yang mudah salah: tanpa free trial, platform fee 1.5%, MDR
  Midtrans dipotong sebelum saldo pengrajin, payout IRIS 06.00 & 18.00 WIB.
- Batas paket & slot payout: `src/lib/plans.ts` (sumber tunggal).
