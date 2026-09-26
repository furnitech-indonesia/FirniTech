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
 * Pending / Invoice Unpaid: #CA8A04 (yellow-600) / BG: #FEF9C3 (yellow-100)
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
 * Shadow System:
   * Card Normal: shadow-sm (0 1px 2px 0 rgb(0 0 0 / 0.05))
   * Card Hover / Modal: shadow-md (0 4px 6px -1px rgb(0 0 0 / 0.1))
5. Typography & Icons
 * Font Family: Inter / System UI Font (font-sans) untuk keterbacaan data numerik, dimensi (P \times L \times T), dan teks teknis yang presisi.
 * Icon System: Google Material Symbols (Outlined) — Menggunakan garis tipis yang konsisten dengan estetika minimalis.