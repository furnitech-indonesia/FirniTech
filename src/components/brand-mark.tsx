import { cn } from "@/lib/utils";

/**
 * Logo FurniTech untuk dipakai DI DALAM APLIKASI — header situs publik,
 * halaman masuk, dan back-office.
 *
 * BERBEDA dari ikon PWA, dan itu disengaja: yang di sini tampil sebagai
 * lempeng 32px di sebelah teks, sementara ikon PWA berdiri sendiri di layar
 * utama. Menggabungkan keduanya akan menghasilkan dua proporsi yang berbeda
 * untuk logo yang sama.
 *
 * SUMBERNYA SAMA: keduanya dihasilkan oleh `npm run make:icons` dari
 * `public/icon.svg`. Tidak ada salinan kedua yang bisa melenceng sendiri —
 * dan itulah alasan komponen ini ada, bukan sekadar pembungkus `<img>`: sebelum
 * ini tiap tempat menulis markup sendiri, jadi penulisan ulang di satu tempat
 * berarti ada tempat lain yang lupa diperbarui.
 *
 * `<img>` biasa, bukan `next/image`. Alasannya bukan malas: ukurannya tetap
 * 32px logis dengan sumber 128px (4x), jadi `next/image` hanya menambah
 * optimizer dan placeholder tanpa mengubah ketajaman yang bisa dilihat.
 * Yang lebih penting, `next/image` dari `public/` tidak menambah
 * cache-busting, dan di sinilah justru dibutuhkan: nama file-nya tetap, jadi
 * tanpa itu logo di header ikut basi diam-diam setelah logo diperbarui.
 *
 * TANPA `alt`. Logo di sebelah teks "FurniTech" adalah dekoratif — untuk
 * pembaca layar screen reader, mengulang "FurniTech logo FurniTech" hanya
 * menambah kata yang tidak membawa informasi. Jadi `alt=""` plus
 * `aria-hidden`, bukan alt yang isinya nama brand.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand-mark.png"
      alt=""
      aria-hidden
      width={32}
      height={32}
      decoding="async"
      // TANPA `border`, TANPA `rounded-*`, TANPA `bg-*`.
      //
      // Ketiganya pernah dipasang di sini, dan ketiganya salah: `brand-mark.png`
      // sudah punya sudut membulat sendiri (dirender `rx: 0.18` oleh
      // `make-icons`), jadi `rounded-xl` di atasnya tidak menambah apa pun —
      // hanya membuat logo terlihat seperti lingkaran. Dan `border border-border`
      // menggambar garis abu-abu di sekeliling lempeng yang sebenarnya sudah
      // bersih, karena yangFarthing dibutuhkan: logonya sudah berkonten sendiri.
      //
      // Latar putih di dalam PNG juga tidak perlu dipaksa agar terlihat: di
      // header terang, putih menyatu dengan putih dan yang tersisa hanya
      // mark-nya — yang persis seperti logo pada umumnya terlihat.
      //
      // `object-contain`, bukan `object-cover`: gambar dan kotaknya sama-sama
      // persegi, jadi sekarang tidak ada yang terpotong, tapi `cover` akan
      // memotong begitu `brand-mark.png` diperbarui dengan rasio berbeda.
      className={cn("size-8 shrink-0 object-contain", className)}
    />
  );
}
