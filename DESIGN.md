DESIGN.md — Brand Identity & Design System
1. Brand Philosophy
FurniTech mengusung pendekatan Modern Tech & Minimalist. Antarmuka dirancang bersih, lapang, dan fungsional seperti platform SaaS kelas dunia, namun tetap mempertahankan aksen warna kayu alami untuk menegaskan identitas industri furnitur.
 * Clean & Professional: Mengutamakan ruang kosong (white space) dan kontras yang tinggi agar informasi inventaris, finansial, dan katalog produk mudah dipindai.
 * Accessible & Practical: Didesain khusus dalam format Light Mode penuh agar nyaman dibaca di layar HP/Tablet oleh tim tukang di bengkel kerja maupun oleh pemilik bisnis.
2. Color Palette (Tailwind CSS Mapped)
A. Primary / Tech Accent (Dominan SaaS & Trust)
 * Slate Navy (#0F172A / slate-900): Warna teks utama, header navigation, dan elemen brand dominan untuk memberikan kesan kokoh dan stabil.
 * Deep Steel (#334155 / slate-700): Warna teks sekunder, sub-header, dan ikon aktif.
B. Craft Accent (Aksen Kayu & Action CTA)
 * Warm Amber / Gold Oak (#D97706 / amber-600): Warna aksen utama untuk tombol penyeruan aksi (Primary CTA), highlight status penting, dan elemen brand khas mebel.
 * Hover Amber (#B45309 / amber-700): Status hover/aktif untuk tombol interaktif.
C. Background & Neutral Surface
 * App Background: #F8FAFC (slate-50) — Latar belakang aplikasi yang sangat bersih, profesional, dan lembut di mata.
 * Card & Container: #FFFFFF (white) — Latar belakang modul, panel tabel, dan kartu produk.
 * Border & Divider: #E2E8F0 (slate-200) — Pemisah visual yang subtle dan rapi.
 * Input Background: #F1F5F9 (slate-100) — Latar belakang form input dan kolom pencarian.
3. Status Indicators (Workflow & Progress Tracker)
Pewarnaan indikator untuk Visual Progress Tracker dan status pesanan:
 * Pending / Invoice Unpaid: #D97706 (amber-600) / BG: #FEF3C7 (amber-100)
   Catatan (2026-09-26): diubah dari yellow-600 (#CA8A04 / #FEF9C3) menjadi
   amber-600, mengikuti Stitch DESIGN.md §Production Pipeline. Alasannya
   substantif: dengan kuning, status "menunggu" terbaca seperti peringatan.
   Dengan amber ia memakai satu-satunya warna aksi di aplikasi, sehingga lima
   status terbaca sebagai satu sistem, bukan "peringatan vs info".
 * In Production (Tukang): #2563EB (blue-600) / BG: #DBEAFE (blue-100)
 * Quality Control / Finishing: #9333EA (purple-600) / BG: #F3E8FF (purple-100)
 * Ready to Ship / Settled: #16A34A (green-600) / BG: #DCFCE7 (green-100)
 * Cancelled / Failed: #DC2626 (red-600) / BG: #FEE2E2 (red-100)
4. Layout, Geometry & Radius (Soft Rounded)
Seluruh komponen UI menggunakan sudut melengkung halus (Soft Rounded) untuk memberikan kesan modern, ramah pengguna, dan estetik.
 * Border Radius System:
   * Buttons & Badges: rounded-xl (12\text{px})
   * Input Fields & Selects: rounded-xl (12\text{px})
   * Cards, Modals & Containers: rounded-2xl (16\text{px})
   * Pill Badges: rounded-full (9999\text{px})
 * Shadow System — "deliberately low shadow" (Stitch §Elevation & Depth):
   Sistem ini sengaja memakai bayangan nyaris tak terlihat; hierarki dibangun
   dari kontras border #E2E8F0, bukan dari bayangan. Karena itu nilai tailwind
   bawaan (shadow-sm = 0 1px 2px) tidak cukup memisahkan kartu dari latar
   #F8FAFC yang terang. Ketiga nilai ini memakai rgba slate-900 supaya
   bayangan menyatu dengan palet, bukan hitam generik.
   * Level 1 — Card Normal: shadow-card (0 1px 3px rgba(15,23,42,.05), 0 1px 2px -1px rgba(15,23,42,.05))
   * Level 2 — Card Hover: shadow-card-hover (0 4px 6px -1px rgba(15,23,42,.07), 0 2px 4px -2px rgba(15,23,42,.05))
   * Level 3 — Modal/Drawer/Overlay: shadow-overlay (0 20px 25px -5px rgba(15,23,42,.10), 0 8px 10px -6px rgba(15,23,42,.04)); backdrop rgba(15,23,42,.40)
   * Aturan nested: elemen interaktif di dalam wadah wajib radius lebih kecil
     dari induknya (input 12px di dalam card 16px).
5. Typography & Icons
  * Type Scale — Stitch §Typography, 12 peran dengan ukuran, bobot, line-height,
    dan letterSpacing tetap. Diterapkan lewat `text-display`, `text-headline-lg`,
    `text-headline-md`, `text-headline-sm`, `text-title-md`, `text-body-lg`,
    `text-body-md`, `text-body-sm`, `text-label-lg`, `text-label-md`,
    `text-label-sm`, dan `text-code-tabular`.
      - Yang menentukan rasa teks adalah RASIO ukuran terhadap line-height,
        bukan ukuran sendirian. Judul 40/48 (1,2) terasa tegas; 36/40 (1,11)
        yang sama warnanya terasa longgar dan sekolah.
      - `label-sm` (11px/600) khusus untuk meta label, header kolom tabel, dan
        label SKU, selalu dipakai dengan `uppercase` dan tracking 0.04em.
      - Tracking negatif pada heading (-0.025em s.d. -0.01em) menjaga
        ketegasan industrial tanpa kesan dekoratif.
  * Angka tabular: `font-feature-settings: "tnum" 1, "cv05" 1, "cv11" 1` aktif
    global. Tanpa ini digit "1" pada Rp1.500.000 lebarnya berbeda dari "8" pada
    Rp8.750.000, sehingga kolom rupiah terlihat zigzag dan sulit dibandingkan
    sekilas — dan membandingkan nominal adalah tugas utama di aplikasi ini.
    `cv05`/`cv11` mematikan serif pada digit 0 dan 1 agar tidak terbaca huruf O/I.
 * Font Family: Inter / System UI Font (font-sans) untuk keterbacaan data numerik, dimensi (P \times L \times T), dan teks teknis yang presisi. Di-host sendiri lewat next/font, bukan dari CDN.
 * Icon System: Phosphor Icons (inline SVG) dengan weight "light" agar garisnya tetap tipis dan konsisten dengan estetika minimalis.
 * Catatan Pergantian Icon (2026-09-26): sebelumnya menggunakan Google Material Symbols (icon font dari CDN). Diganti ke Phosphor karena tiga alasan teknis:
     1. Offline — icon font diambil dari jaringan setiap kali app dibuka. Saat luring ikon hilang kosong; saat lambat muncul kedipan (FOUT).
     2. Aksesibilitas — icon font berbasis ligature teks ("chair") bisa dibaca
        screen reader bila tanpa aria-hidden; SVG tidak.
     3. PWA & Native — aset SVG ter-bundle di dalam paket Capacitor, sehingga
        tidak ada permintaan jaringan sama.
 * Ketebalan thinning tetap terjaga lewat weight="light", jadi estetika garis tipis yang dikehendaki §5 tetap tercapai.
  * Catatan: desain Stitch menyebut Google Material Symbols. Keputusan di atas
    tetap berlaku — Phosphor, bukan Material Symbols. Stitch tidak
    memperhitungkan bundling native dan mode luring, sedangkan Material Symbols
    membutuhkannya.
6. Gerak & Aksesibilitas
 * Light mode penuh, tanpa dark mode. Mode gelap tidak menambah nilai untuk
   pengguna di bengkel pada siang hari, dan biaya pemeliharaan dua palet tidak
   sebanding dengan hasilnya.
 * `prefers-reduced-motion: reduce` dihormati di seluruh aplikasi. Transisi di
   sini memang singkat (150-300ms), tapi tetap ada pengguna dengan vestibular
   disorder yang tetap terganggu. Aturan ini mematikan SEMUA transisi, bukan
   hanya yang besar.
 * Skip-to-content wajib ada di setiap halaman (`#konten-utama`).
 * Target fokus keyboard harus terlihat; tidak boleh dihilangkan demi tampilan.
 * Tombol punya state hover, active (tekan), dan focus-visible. Melewatkan satu
   di antaranya membuat antarmuka terasa tidak hidup.
7. Tampilan Responsif & Target Sentuh
 * Tiga ukuran layar wajib didukung: mobile (375-767px), tablet (768-1023px), dan desktop (1024px ke atas). Sumber: PRD §3.1.
 * Data table berubah menjadi daftar kartu di bawah breakpoint md. Memaksa pengguna HP menggeser tabel horizontal adalah cara tercepat membuat halaman terasa sempit.
 * Target sentuh minimum 44 x 44px pada perangkat sentuh (pointer: coarse).
 * Tidak boleh ada informasi yang hanya tersedia lewat hover.
 * Padding aman iOS (notch & home indicator) memakai env(safe-area-inset-*), diterapkan lewat kelas .safe-top dan .safe-bottom. Penting saat aplikasi dibungkus Capacitor (Fase 2).
 * Zoom tidak dibatasi; membatasi zoom merusak aksesibilitas.
