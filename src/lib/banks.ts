/**
 * Daftar bank untuk dropdown rekening pengrajin.
 *
 * PENTING — DAFTAR INI BELUM PERNAH DIVERIFIKASI DARI MIDTRANS.
 *
 * Kode yang benar ada di `GET /beneficiary_banks`, dan
 * `loadBankOptions()` memakai respons itu begitu `MIDTRANS_IRIS_API_KEY` diisi.
 * Daftar di bawah hanya cadangan, supaya formulir tetap bisa diisi sebelum
 * kredensial tersedia dan supaya halaman tidak kosong saat layanan sedang
 * tidak bisa dihubungi.
 *
 * Kenapa daftar cadangan ini cukup aman untuk dipasang sekarang:
 *
 *  1. **Kode yang salah akan DITOLAK, bukan salah transfer.** Midtrans
 *     menolak `bank_code` yang tidak dikenal. Yang paling buruk yang bisa
 *     terjadi adalah verifikasi gagal dengan pesan yang bisa dibaca — bukan
 *     dana masuk ke bank yang salah. Yang benar-benar berbahaya adalah
 *     daftar yang "kelihatan benar tapi kodetya tertukar", jadi setiap
 *     kode di sini WAJIB dibandingkan dengan respons `/beneficiary_banks`
 *     sebelum produksi, dan `verifyBankCodesAgainstMidtrans()` ada
 *     persis untuk dipakai saat itu.
 *
 *  2. **Kode tidak pernah ditampilkan ke siapa pun.** Yang tampil ke
 *     pengrajin adalah `label`, dan yang tampil ke pembeli pada COD
 *     transfer bank juga `label` — bukan kode. Jadi kalau kodenya ternyata
 *     keliru, yang salah pengrajin tidak pernah melihat dan tidak bisa
 *     complaint soal kode yang salah.
 *
 *  3. **Daftarnya sengaja pendek.** Hanya bank yang proyek ini sudah
 *     pakai di jalur lain (kanal virtual account), dan sisanya
 *     ditambahkan setelah kredensial Payouts terisi. Daftar panjang hasil
 *     tebakan terlihat seperti sudah lengkap dan menyesatkan: pengrajin
 *     memilih bank yang ternyata tidak didukung, lalu gagal di langkah
 *     terakhir.
 */
export type BankOption = {
  /** Kode yang dikirim ke Midtrans, mis. "bca". */
  code: string;
  /** Nama untuk ditampilkan, mis. "Bank Central Asia (BCA)". */
  label: string;
};

/**
 * Daftar cadangan. Lihat catatan di atas SEBELUM menambah atau mengubah.
 *
 * Enam bank ini sama dengan kanal virtual account yang sudah dipakai
 * checkout (`ALLOWED_PAYMENT_CHANNELS` di `src/lib/midtrans/snap.ts`),
 * jadi tidak ada bank yang muncul tiba-tiba di satu modul tapi tidak di
 * modul lain.
 */
export const FALLBACK_BANKS: readonly BankOption[] = [
  { code: "bca", label: "Bank Central Asia (BCA)" },
  { code: "bni", label: "Bank Negara Indonesia (BNI)" },
  { code: "bri", label: "Bank Rakyat Indonesia (BRI)" },
  { code: "bsi", label: "Bank Syariah Indonesia (BSI)" },
  { code: "danamon", label: "Bank Danamon" },
  { code: "permata", label: "Bank Permata" },
] as const;

/** Cari bank berdasarkan kodenya. Null kalau tidak ada di daftar. */
export function findBankOption(
  code: string | null | undefined,
): BankOption | null {
  if (!code) return null;
  const needle = code.trim().toLowerCase();
  return FALLBACK_BANKS.find((b) => b.code === needle) ?? null;
}

/**
 * Normalisasi nomor rekening.
 *
 * Menghapus semua yang bukan angka. Nomor rekening Indonesia tidak pernah
 * mengandung spati atau tanda hubung, tapi orang mengetiknya dengan
 * keduanya — dan tanpa ini rekening yang sama bisa tersimpan dalam dua
 * bentuk berbeda tergantung cara pengrajin mengetik, sehingga verifikasi
 * mengirim bentuk berbeda dari yang tercatat di buku.
 *
 * Panjang maksimum 20 digit: nomor rekening Indonesia terpanjang adalah 20
 * (BCA). Lebih dari itu pasti salah ketik, dan mengirim angka 40 digit ke
 * API hanya menghasilkan pesan error yang tidak menjelaskan masalahnya.
 */
export function normalizeBankAccount(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 20);
}
