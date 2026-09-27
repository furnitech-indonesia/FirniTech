import "server-only";

import { cookies } from "next/headers";

/**
 * Keranjang pembeli storefront (Sprint 5).
 *
 * Disimpan di COOKIE, bukan di database dan bukan di session. Alasannya:
 * pembeli storefront tidak punya akun, dan database akan tumbuhnya baris yang
 * tidak pernah dibaca. Cookie juga tidak butuh migrasi.
 *
 * KEAMANAN — DAN YANG PENTING DI SINI:
 *
 * Cookie ini TIDAK ditandatangani dan TIDAK dienkripsi. Artinya orang boleh
 * mengeditnya sesuka hati. Itu **tidak** menjadi masalah, karena tidak ada satu
 * pun nilai yang dipercaya dari cookie:
 *
 *   - Harga SELALU diambil ulang dari tabel `products`.
 *   - Ongkir SELALU dihitung ulang dari `shipping_rates` lewat
 *     `findShippingRate()`.
 *   - `tenantId` SELALU dari resolusi tenant, bukan dari cookie.
 *
 * Yang bisa dilakukan orang dengan mengedit cookie hanya salah pilih barang
 * atau salah jumlah — dan itu akan terhitung dengan benar. Menulis `price: 1`
 * di dalam cookie tidak menghasilkan apa pun, karena tidak ada kolom harga
 * yang dibaca dari sana.
 *
 * Batas isinya: 20 baris dan jumlah 1–99 per baris. Bukan untuk membatasi
 * kesabaran penggunanya, tapi supaya cookie tidak melewati batas 4 KB per
 * domain yang hampir semua browser punya — dan cookie yang menabrak batas itu
 * DIHAPUS diam-diam oleh browser, yang akan membuat keranjang ikut hilang.
 */

const COOKIE = "furni_cart";
const MAX_LINES = 20;
const MAX_QTY = 99;

export type CartLine = { slug: string; qty: number };

export type Cart = { lines: CartLine[] };

/**
 * Keranjang kosong.
 *
 * WAJIB mengembalikan objek BARU setiap dipanggil, dan tidak boleh ada konstanta
 * modul yang dikembalikan di sini.
 *
 * Ini bukan detail kecil. Versi pertama mengekspor `EMPTY_CART` sebagai
 * objek modul dan mengembalikannya apa adanya untuk permintaan tanpa cookie.
 * Lalu `addToCartLine()` memakai `cart.lines.push(...)` pada objek itu — jadi
 * setiap pengunjung yang keranjangnya KOSONG ikut memutasi objek yang sama
 * dengan modul. Akibatnya, satu proses Next yang melayani banyak pengunjung
 * mengumpulkan keranjang semua orang tanpa cookie ke dalam satu objek
 * tunggal: pengunjung berikutnya menerima keranjang milik orang lain,
 * termasuk barang dari toko lain.
 *
 * Gejalanya baru terlihat saat menguji: keranjang di peramban yang
 * benar-benar kosong tiba-tiba berisi tiga barang dari dua toko berbeda, dan
 * server tampak "mengingat" isi cookie yang memang tidak pernah dikirim.
 * Sumbernya bukan cookie — semuanya terjadi di memori proses.
 */
export function emptyCart(): Cart {
  return { lines: [] };
}

/** Parse cookie jadi keranjang. Cookie rusak = keranjang kosong, bukan error. */
export async function readCart(): Promise<Cart> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return emptyCart();

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyCart();
    const lines = (parsed as { lines?: unknown }).lines;
    if (!Array.isArray(lines)) return emptyCart();

    const clean: CartLine[] = [];
    for (const line of lines) {
      if (!line || typeof line !== "object") continue;
      const { slug, qty } = line as { slug?: unknown; qty?: unknown };
      if (typeof slug !== "string" || slug === "") continue;

      const quantity = typeof qty === "number" ? Math.round(qty) : 1;
      if (!Number.isFinite(quantity)) continue;

      clean.push({ slug: slug.slice(0, 80), qty: Math.min(MAX_QTY, Math.max(1, quantity)) });
    }

    return { lines: clean.slice(0, MAX_LINES) };
  } catch {
    return emptyCart();
  }
}

export async function writeCart(cart: Cart): Promise<void> {
  const jar = await cookies();
  const lines = cart.lines
    .filter((line) => line.slug && line.qty > 0)
    .slice(0, MAX_LINES);

  if (lines.length === 0) {
    jar.delete(COOKIE);
    return;
  }

  jar.set(COOKIE, encodeURIComponent(JSON.stringify({ lines })), {
    // 7 hari. Barang mebel tidak dibeli impulsif, dan cookie yang kedaluwarsa
    // esok pagi akan membuat pembeli mengulang checkout yang sudah setengah
    // jalan.
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    // `httpOnly` dipasang: cookie ini hanya dibaca server lewat `readCart`,
    // jadi tidak ada satu pun yang perlu membacanya dari JavaScript.
    httpOnly: true,
    sameSite: "lax",
    // Secure sengaja TIDAK dipasang, supaya `npm run start` di http://localhost
    // masih punya keranjang. Di Vercel (https) browser akan mengirimnya tetap
    // aman; kalau nanti dipasang `secure: true` bersyarat, periksa dulu
    // pengujiannya.
  });
}

export async function clearCart(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * Tambah satu barang, atau naikkan jumlahnya kalau sudah ada.
 *
 * Merging dilakukan di sini, bukan di pemanggil, supaya tidak ada dua tempat
 * yang memutuskan "sekali ini satu barang atau dijumlahkan".
 *
 * Tidak pernah memutasi hasil `readCart()`. `readCart()` sudah mengembalikan
 * objek baru setiap kali, tapi \'mutasi\` di sini adalah Dependent dari hal itu
 * — begitu `readCart()` di某一 titik mengembalikan objek yang di共享, barang
 * yang ditambahkan akan bocor ke permintaan lain. Versi immutable lebih mahal
 * satu baris dan tidak bergantung pada hal yang tidak terlihat.
 */
export async function addToCartLine(slug: string, qty: number): Promise<Cart> {
  const cart = await readCart();
  const quantity = Math.min(MAX_QTY, Math.max(1, Math.round(qty) || 1));

  const lines = cart.lines.some((line) => line.slug === slug)
    ? cart.lines.map((line) =>
        line.slug === slug
          ? { ...line, qty: Math.min(MAX_QTY, line.qty + quantity) }
          : line,
      )
    : [...cart.lines, { slug, qty: quantity }];

  const next: Cart = { lines: lines.slice(0, MAX_LINES) };
  await writeCart(next);
  return next;
}

export async function setCartLineQty(slug: string, qty: number): Promise<Cart> {
  const cart = await readCart();
  const lines =
    qty <= 0
      ? cart.lines.filter((line) => line.slug !== slug)
      : cart.lines.map((line) =>
          line.slug === slug
            ? { ...line, qty: Math.min(MAX_QTY, Math.round(qty)) }
            : line,
        );

  const next: Cart = { lines };
  await writeCart(next);
  return next;
}
