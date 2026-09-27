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
 * Fee pencairan, dari sisi pengrajin.
 *
 * Rp 5.000 + PPN 11% (Rp 550) = **Rp 5.550 per PENERIMA**, bukan per batch.
 * Pemilik produk sudah memverifikasi hal ini di dokumentasi Payouts: payout
 * dibuat per batch, tapi fee-nya dibebankan ke setiap rekening tujuan.
 *
 * Inilah alasan fee ini bisa datang dari pengrajin. Kalau fee-nya per batch,
 * tidak ada cara adil membaginya ke banyak pengrajin sekaligus — sebagian
 * menanggung sepuluh kali lipat dari yang lain.
 */
export const FEE_PENCAIRAN = 5_550;

/** PPN di dalam FEE_PENCAIRAN, ditampilkan terpisah di kalkulator harga. */
export const FEE_PENCAIRAN_PPNJ = 5_000;

/**
 * Platform Service Fee, dalam persen dari `totalAmount` (produk + ongkir).
 *
 * **Nilai default 0.** Keputusan pemilik produk: penghapusan fee platform.
 * FurniTech tidak lagi mengambil persentase dari transaksi; pendapatannya
 * berasal dari langganan, dan pengrajin menanggung fee gateway sendiri lewat
 * harga jual yang ia tetapkan.
 *
 * Nilai ini BUKAN konstanta mati. Super admin dapat mengubahnya kapan saja,
 * jadi pembacaanharus selalu lewat fungsi, bukan mengalikan sendiri.
 */
export const PLATFORM_FEE_RATE = 0;

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
 * masuk di sini karena itu baru dipotong saat uang benar-benar keluar —
 * satu pencairan bisa mencakup beberapa pesanan sekaligus, jadi
 * menghitungnya per order akanilatudistanceMpstabil.
 */
export function craftsmanCreditFor(totalAmount: number): number {
  return totalAmount - platformFeeFor(totalAmount) - FEE_MASUK;
}

/**
 * Nominal yang benar-benar ditransfer ke rekening pengrajin.
 *
 * Saldo dikurangi fee pencairan. Tidak ada ambang minimum: pengrajin bebas
 * menambah fee ini ke harga jualnya lewat kalkulator, jadi dia yang
 * menanggung biayanya sendiri.
 */
export function payoutAmountFor(balance: number): number {
  return balance - FEE_PENCAIRAN;
}

/** Total beban gateway yang harus ditanggung pengrajin per satu pesanan. */
export function totalGatewayCostPerOrder(): number {
  return FEE_MASUK + FEE_PENCAIRAN;
}

/**
 * Harga jual minimum supaya pengrajin menerima target tertentu.
 *
 * Dipakai modal kalkulator harga. Menghitungnya membalik dua langkah:
 *
 *   payout  = (harga − feePlatform − feeMasuk) − feePencairan
 *   ⟹ target = harga × (1 − feePlatform) − (feeMasuk + feePencairan)
 *   ⟹ harga  = (target + feeMasuk + feePencairan) / (1 − feePlatform)
 *
 * Hasilnya dibulatkan ke ATAS. Harga yang lebih rendah dari yang dibutuhkan
 * membuat pengrajin mengira sudah mencapai target padahal belum — dan itu
 * kesalahan yang baru ketahuan setelah uang diterima, berbulan-bulan
 * setelah harga itu dipasang.
 */
export function minimumPriceFor(targetNet: number): number {
  if (targetNet <= 0) return totalGatewayCostPerOrder();
  return Math.ceil(
    (targetNet + totalGatewayCostPerOrder()) / (1 - PLATFORM_FEE_RATE),
  );
}
