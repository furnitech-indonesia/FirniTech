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
npm run test:responsive # 9 pemeriksaan struktural responsif & token
npm run test:sprint3  # 16 uji halaman & pembatasan role Sprint 3
npm run db:seed:sprint3  # bahan, variasi, pesanan kustom, percakapan contoh
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

- **Token satu arah: `DESIGN.md` → `:root` → `@theme inline`.** Nilai warna
  ada di `app/globals.css` bagian `:root`, lalu dipetakan ke utilitas Tailwind.
  JANGAN menulis utilitas warna langsung di markup — `test:responsive` akan
  gagal. `DESIGN.md` tetap sumber kebenaran.
- Token status (pending/production/quality/settled/failed) dipakai lewat
  `bg-status-*` / `text-status-*`, bukan `bg-yellow-100` langsung.
- **Komponen shadcn/ui ada di `src/components/ui/`** (Base UI, bukan Radix).
  Primitif itu milik kita sekarang; jangan diedit manual tanpa alasan.
  Primitif buatan sendiri (Card/Field/Badge/Alert/EmptyState) masih di
  `src/components/ui.tsx` dan memakai token semantik.
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
- Midtrans (Core + IRIS), Cloudflare, Fonnte, dan Firebase **belum diisi**.

## Konvensi

- Dokumen produk berbahasa Indonesia; kode & identifier bahasa Inggris.
- Aturan bisnis yang mudah salah: tanpa free trial, platform fee 1.5%, MDR
  Midtrans dipotong sebelum saldo pengrajin, payout IRIS 06.00 & 18.00 WIB.
- Batas paket & slot payout: `src/lib/plans.ts` (sumber tunggal).
