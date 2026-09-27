/**
 * Konstanta biaya Midtrans untuk FurniTech.
 *
 * Modul ini TIDAK boleh mengimpor `server-only` dan tidak menyentuh
 * environment, supaya bisa dipakai dari Client Component (modal kalkulator
 * harga di modul produk) maupun dari server tanpa menarik graf modul yang
 * tidak perlu.
 *
 * SEMUA ANGKA DI SINI WAJIB DIBACA BERSAMA `docs/midtrans-fee.md`.
 * Nilai saat ini skema belum dikonfirmasi ke Midtrans, dan itu terlihat di sini:
 * disengaja: setiap konstanta punya asal yang jelas, dan tidak ada nilai
 * turunan yang dihitung diam-diam di dalam modul ini.
 */

/**
 * Fee masuk per transaksi, dari sisi pengrajin.
 *
 * Rp 4.000 (Virtual Account) + PPN 11% (Rp 440) = Rp 4.440.
 *
 * Angka ini dipotong dari saldo pengrajin setiap kali ada pesanan yang
 * lunas, bukan disMarkup ke harga produk. Pembeli membayar harga apa adanya.
 *
 * CATATAN: PPN 11% TIDAK berlaku untuk QRIS, GoPay, dan ShopeePay. Karena
 * ketiga kanal itu tidak dipakai (lihat `ALLOWED_PAYMENT_CHANNELS`), satu
 * blok PPN untuk semua channel benar. Kalau suatu saat kanal persen diaktifkan
 * kembali, PPN harus jadi per-channel — jangan pakai `FEE_MASUK` yang sama.
 */
export const FEE_MASUK = 4_440;

/** PPN di dalam FEE_MASUK, ditampilkan terpisah di kalkulator harga. */
export const PPN_RATE = 0.11;

/** Angka dasar fee Midtrans sebelum PPN, hanya untuk tampilan. */
export const FEE_MASUK_PPNJ = 4_000;

/**
 * Fee pencairan, dari sisi platform.
 *
 * Rp 5.000 per EKSEKUSI pencairan, bukan per penerima dan bukan per order.
 * Satu panggilan Payouts yang membayar sepuluh pengrajin tetap Rp 5.000.
 * Dengan dua slot per hari, bebannya tetap Rp 10.000 per hari.
 *
 * Asumsi "per batch" INI BELUM DIKONFIRMASI Midtrans. Kalau ternyata
 * per-penerima, angka ini tidak boleh dipakai untuk menghitung biaya
 * platform — dan biaya platform tumbuh bersama jumlah pengrajin.
 */
export const FEE_PENCAIRAN_PER_BATCH = 5_000;

/** Dua slot pencairan per hari, WIB. */
export const SLOT_PENCAIRAN = ["06:00", "18:00"] as const;

/**
 * Platform Service Fee, dalam persen dari `totalAmount` (produk + ongkir).
 *
 * Fee ini TIDAK dipotong apa pun, dan TIDAK lagi dipakai untuk menutup fee
 * Midtrans. Pendapatan platform adalah nilai penuh dari fee ini.
 */
export const PLATFORM_FEE_RATE = 0.015;

/** Kanal pembayaran yang boleh diaktifkan. Hanya Virtual Account, hanya ini. */
export const ALLOWED_PAYMENT_CHANNELS = [
  "bca_va",
  "bni_va",
  "bri_va",
  "bsi_va",
  "danamon_va",
  "permata_va",
] as const;

export type AllowedPaymentChannel = (typeof ALLOWED_PAYMENT_CHANNELS)[number];

/**
 * Kanal yang sengaja TIDAK diaktifkan, beserta alasannya.
 *
 * Daftar ini penting untuk diuji, bukan cuma untuk dibaca: kanal yang
 * dibuang karena batas maksimum yang terlalu kecil akan membuat checkout
 * gagal untuk pesanan yang wajar, dan pembeli tidak mengulang dua kali.
 *
 *  - `qris`, `gopay`, `shopeepay`, `dana`, `ovo`, `linkaja`: MDR persen
 *    tanpa PPN. Model fee FurniTech mengasumsikan fee datar, jadi kanal
 *    persen tidak bisa dipakai tanpa menghitung ulang seluruh dokumen.
 *  - `credit_card`: MDR 2,9% + Rp 2.000. Kanal kredit untuk mebel custom
 *    tidak relevan, dan risikonya (chargeback) tidak sepadan.
 *  - `cimb_va`: maksimum Rp 250.000.000.
 *  - `seabank`: maksimum Rp 100.000.000.
 *  - `bank_transfer` catch-all: sengaja TIDAK dipakai. Woo ini mencakup
 *    semua VA sekaligus, karena persis itulah yang membuat batas maksimum
 *    per bank tidak bisa dipatuhi. Memilih kode VA secara eksplisit
 *    membuat keputusan "hanya yang batasnya cukup" bisa ditulis di kode.
 *  - `echannel` / Mandiri Bill: maksimum Rp 50 miliar (cukup), tapi alur
 *    pembayarannya lewat echannel dengan langkah panjang, dan fee datar
 *    Rp 4.440 tidak sebanding dengan pengalaman bayar yang merepotkan.
 */
export const REJECTED_PAYMENT_CHANNELS: Record<string, string> = {
  qris: "MDR persen tanpa PPN — model fee FurniTech mengasumsikan fee datar.",
  gopay: "MDR persen tanpa PPN — model fee FurniTech mengasumsikan fee datar.",
  shopeepay: "MDR persen tanpa PPN — model fee FurniTech mengasumsikan fee datar.",
  credit_card: "MDR 2,9% + Rp 2.000, dan membawa risiko chargeback.",
  cimb_va: "Maksimum Rp 250 juta — terlalu kecil untuk pesanan mebel.",
  seabank: "Maksimum Rp 100 juta — terlalu kecil untuk pesanan mebel.",
  bank_transfer:
    "Catch-all semua VA; memilih kode VA eksplisit agar batas maksimum per bank bisa dipatuhi.",
  echannel: "Alur echannel panjang, dan fee datarnya tidak sebanding.",
};

/**
 * Fee platform untuk satu total pesanan, rupiah penuh.
 *
 * Pembulatan ke bawah (floor) disengaja: kalau 1,5% dibulatkan ke atas,
 * platform dapat sedikit lebih dari 1,5% GMV dalam ribuan transaksi kecil,
 * dan selisihnya terlihat sebagai.platform yang mengambil keuntungan
 * pengrajin di rincian biaya.
 */
export function platformFeeFor(totalAmount: number): number {
  return Math.floor(totalAmount * PLATFORM_FEE_RATE);
}

/**
 * Saldo pengrajin yang bertambah untuk satu pesanan yang lunas.
 *
 * `totalAmount` dikurangi fee platform dan fee masuk. Fee pencairan TIDAK
 * masuk di sini karena itu ditanggung platform dan dihitung per batch, bukan
 * per order.
 */
export function craftsmanCreditFor(totalAmount: number): number {
  return totalAmount - platformFeeFor(totalAmount) - FEE_MASUK;
}

/**
 * Harga jual minimum supaya pengrajin menerima target tertentu.
 *
 * Dipakai modal kalkulator harga. Rumusnya berasal dari definisi
 * `craftsmanCreditFor`, dibalik:
 *
 *   target = harga − 1,5% × harga − Rp4.440
 *   ⟹ harga × (1 − 1,5%) = target + Rp4.440
 *   ⟹ harga = (target + Rp4.440) / 0,985
 *
 * Hasilnya dibulatkan ke ATAS, karena harga yang lebih rendah dari yang
 * dibutuhkan membuat pengrajin mengira sudah mencapai target padahal belum —
 * dan itu kesalahan yang baru ketahuan setelah uang diterima.
 */
export function minimumPriceFor(targetNet: number): number {
  if (targetNet <= 0) return FEE_MASUK;
  return Math.ceil((targetNet + FEE_MASUK) / (1 - PLATFORM_FEE_RATE));
}
