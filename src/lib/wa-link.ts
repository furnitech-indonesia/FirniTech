/**
 * Tautan WhatsApp (`wa.me`) untuk tukang mengirim foto progres ke pembeli.
 *
 * Kenapa TIDAK ada gateway WhatsApp pihak ketiga (Fonnte, Wablas, dll.):
 *
 * 1. **Fotonya tidak bisa dikirim otomatis.** Foto progres disimpan di bucket
 *    privat dan hanya dilayani lewat signed URL yang kedaluwarsa satu jam
 *    (lihat `src/lib/storage.ts`). Gateway WA bisa mengirim teks dan satu
 *    tautan, tidak bisa melampirkan foto. Kalau otomatis, yang sampai ke
 *    pembeli cuma "produksi Anda sudah di tahap Finishing" — tanpa satu pun
 *    bukti pekerjaan.
 *
 * 2. **Yang dibutuhkan justru orangnya.** Di bengkel, tukang sudah memegang
 *    HP-nya dan sedang memotret mejanya. Berhenti sebentar untuk menekan
 *    "kirim", melampirkan foto, lalu menekan kirim di WhatsApp jauh lebih
 *    sedikit gesekan daripada mengisi form dan mengunggah berkas.
 *
 * 3. **Percakapan dua arah.** Pembeli hampir selalu membalas — "warna yang
 *    terang bisa?", "kapan selesai?". Notifikasi searah tidak bisa menjawab
 *    itu, dan tidak ada tugas yang lebih penting bagi tukang daripada
 *    menjawab pembeli.
 *
 * 4. **Tanpa pihak ketiga, tanpa biaya per pesan, tanpa status yang bisa mati.**
 *    Tidak ada kredensial yang bisa kedaluwarsa, tidak ada kuota yang perlu
 *    dihitung, dan tidak ada layanan yang bisa menolak pengirimannya.
 *
 * Yang hilang, dan itu keputusan sadar: percakapan terjadi di WhatsApp, bukan
 * di FurniTech. FurniTech tidak tahu pesan terkirim atau dibaca, dan timeline
 * pesanan tidak mencatat "pembeli sudah diberi tahu". Untuk tahap produk ini
 * itu trade-off yang benar — yang Matters adalah bukti fotonya sampai.
 */

/**
 * Normalisasi nomor Indonesia ke format yang dipakai `wa.me`: `628xxxxxxxxx`.
 *
 * Aturannya sama seperti saat gateway WA dulu, jadi fungsi ini tidak berubah —
 * hanya tempat pakainya yang pindah ke tautan.
 *
 * Data bisa datang dari mana saja — form back-office memakai `08xx`, import
 * lama mungkin sudah `628xx` atau `+62 812-3456-7890` — dan `wa.me`
 * menolak nomor yang diawali `0`.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  // Nomor lokal tanpa 0 di depan, mis. "81234567890" yang salah diisi.
  if (digits.startsWith("8")) return `62${digits}`;

  return null;
}

/**
 * Susun tautan `wa.me` yang membuka percakapan baru.
 *
 * Returns `null` kalau nomor tidak bisa dinormalisasi. Pemanggil wajib
 * menanganinya: menampilkan tombol yang menuju `wa.me/?text=` tanpa nomor
 * berarti membuka WhatsApp tanpa tujuan, dan pengguna baru sadar setelah
 * menekan kirim — pesan yang terkirim ke orang yang salah.
 */
export function buildWhatsAppLink(params: {
  to: string;
  message: string;
}): string | null {
  const phone = normalizePhone(params.to);
  if (!phone) return null;

  return `https://wa.me/${phone}?text=${encodeURIComponent(params.message)}`;
}

/** Pesan pembuka untuk baris antrean tukang. */
export function progressMessageFor(params: {
  customerName: string;
  orderCode: string;
  workshopName?: string | null;
}): string {
  return [
    `Halo ${params.customerName},`,
    "",
    `Ini foto progres untuk pesanan ${params.orderCode}${
      params.workshopName ? ` dari ${params.workshopName}` : ""
    }.`,
  ].join("\n");
}
