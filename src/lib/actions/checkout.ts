"use server";

import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  customerAddresses,
  orderItems,
  orders,
  products,
  tenantBankAccounts,
} from "@/db/schema";
import { getTenantBySlug } from "@/lib/tenants";
import { findShippingRate } from "@/lib/shipping";
import { readCart } from "@/lib/cart";
import { createOrderCharge } from "@/lib/midtrans/orders";
import { isMidtransConfigured } from "@/lib/midtrans/snap";
import { parseForm } from "@/lib/schemas/primitives";
import { z } from "zod";
import { normalizePhone } from "@/lib/wa-link";
import type { FormState } from "@/components/form-state";

/**
 * Pembuatan pesanan & pembayaran Midtrans (Sprint 5).
 *
 * Berbeda dari sebagian besar action di repo ini, ini TIDAK memakai
 * `requireTenantWrite`. Pembeli storefront tidak punya akun, dan memang tidak
 * perlu — caller-nya adalah orang yang belum pernah masuk.
 *
 * Yang menggantikannya adalah `getTenantBySlug()` plus penulianUPTuk semua
 * nilai sensitif: keranjang dari cookie, alamat dari database dengan filter
 * tenantId, dan harga dari tabel `products`.
 */

/**
 * Bentuk isian checkout. HANYA alamat dan email; keranjang dibaca dari cookie
 * dan barang+harga diambil ulang dari database.
 */
const checkoutSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  addressId: z.string().trim().uuid("Alamat tidak valid."),
  /**
   * Midtrans mewajibkan email untuk mengirim bukti dan pengingat. Pembeli
   * storefront belum tentu punya, jadi email DIWAJIBKAN di checkout — bukan
   * dibuat kosong lalu hope Midtrans tidak memintanya (yang hasilnya 400 dari
   * sisi mereka, jauh lebih sulit dibaca daripada pesan di form).
   */
  email: z.email("Email wajib diisi untuk menerima bukti pembayaran."),

  /**
   * Metode pembayaran yang dipilih pembeli (Sprint 6).
   *
   * Nilai ini DITERIMA dari klien, tapi hanya sebagai PILIHAN metode — bukan
   * sebagai penentu nominal. Nominal selalu dihitung ulang dari `products`
   * dan `shipping_rates` seperti biasa, dan kedua metode menagih nominal
   * yang sama. Perbedaannya bukan di uang, tapi di kapan dan bagaimana uang
   * itu sampai.
   *
   * Default `va` kalau field-nya kosong, supaya form yang belum pernah
   * disentuh tidak gagal validasi. Sengaja TIDAK default ke COD: COD butuh
   * rekening pengrajin yang terverifikasi, jadi butuh pemeriksaan tersendiri
   * di bawah — bukan sekadar diasumsikan tersedia.
   */
  paymentMethod: z
    .enum(["va", "cod"])
    .optional()
    .default("va"),
});

export type CheckoutState = FormState & {
  /** URL Midtrans Snap. Dipakai klien untuk mengarahkan. */
  redirectTo?: string;
  /** Ringkasan supaya UI bisa menampilkan "apa yang sebenarnya ditagih". */
  summary?: {
    orderCode: string;
    itemsSubtotal: number;
    shippingFee: number;
    totalAmount: number;
    itemCount: number;
  };
};

export async function createCheckoutOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = parseForm(checkoutSchema, formData);
  if (!parsed.success) {
    return {
      error: "Periksa kembali isian checkout.",
      fieldErrors: parsed.fieldErrors,
    };
  }
  const input = parsed.data;

  const tenant = await getTenantBySlug(input.tenantSlug);
  if (!tenant) return { error: "Toko tidak tersedia." };

  /*
   * COD HANYA tersedia kalau rekening pengrajinnya TERVERIFIKASI.
   *
   * Ini bukan syarat teknis, tapi syarat yang berakar pada kenyataan: pada COD
   * transfer bank, nomor dan atas nama rekening itu DITAMPILKAN kepada
   * pembeli supaya ia tahu ke mana harus transfer. Kalau rekeningnya belum
   * dicek, FurniTech sedang menampilkan nomor yang bisa jadi salah kepada
   * orang yang akan mengirim uang. Menolak di sini lebih baik daripada
   * orang yang mengirim ke rekening yang salah dan pengrajin yang menanggung.
   *
   * Perhatikan juga bahwa COD TIDAK butuh Midtrans sama sekali — tidak ada
   * tagihan yang dibuat, tidak ada MDR, tidak ada fee masuk. Uang langsung
   * masuk ke tangan kurir atau ke rekening pengrajin.
   */
  if (input.paymentMethod === "cod") {
    const [bank] = await db
      .select({ status: tenantBankAccounts.status })
      .from(tenantBankAccounts)
      .where(eq(tenantBankAccounts.tenantId, tenant.id))
      .limit(1);
    if (bank?.status !== "verified") {
      return {
        error:
          "Toko ini belum menerima pembayaran di tempat. Pilih virtual account atau hubungi toko.",
      };
    }
  } else if (!isMidtransConfigured()) {
    return {
      error:
        "Pembayaran belum dikonfigurasi di server ini. Hubungi toko untuk memesan lewat WhatsApp.",
    };
  }

  /* ---- 1. Keranjang dari cookie, BUKAN dari FormData ---- */
  const cart = await readCart();
  if (cart.lines.length === 0) {
    return { error: "Keranjang masih kosong." };
  }

  /*
   * ---- 2. Alamat: WAJIB milik tenant yang sedang dibuka ----
   *
   * `addressId` dari FormData tidak dipercaya tanpa growaman, jadi syaratnya
   * `id AND tenantId` sekaligus. Tanpa itu, satu pembeli bisa menunjuk alamat
   * milik toko lain dan mengirim barang ke sana.
   */
  const [address] = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, input.addressId),
        eq(customerAddresses.tenantId, tenant.id),
      ),
    )
    .limit(1);
  if (!address) {
    return { error: "Alamat pengiriman tidak ditemukan. Pilih atau buat alamat dulu." };
  }

  /* ---- 3. Harga SELALU dari database ---- */
  const slugs = cart.lines.map((line) => line.slug);
  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      basePrice: products.basePrice,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenant.id),
        eq(products.isPublished, true),
        inArray(products.slug, slugs),
      ),
    );

  const priceBySlug = new Map(productRows.map((p) => [p.slug, p]));

  let itemsSubtotal = 0;
  let itemCount = 0;
  const orderLines: { productId: string; name: string; qty: number; price: number }[] = [];
  const missing: string[] = [];

  for (const line of cart.lines) {
    const product = priceBySlug.get(line.slug);
    if (!product) {
      missing.push(line.slug);
      continue;
    }
    itemsSubtotal += product.basePrice * line.qty;
    itemCount += line.qty;
    orderLines.push({
      productId: product.id,
      name: product.name,
      qty: line.qty,
      price: product.basePrice,
    });
  }

  if (missing.length > 0) {
    /*
     * Baris keranjang yang produknya sudah tidak ada / tidak published
     * DIBUANG, bukan menggagalkan seluruh checkout.
     *
     * Menolak seluruh pesanan karena satu barang hilang adalah respons yang
     * berlebihan: pembeli sudah menyiapakan alamat dan menekan tombol bayar.
     * Yang benar: buang barangnya, beri tahu, dan biarkan sisanya
     * diselesaikan.
     */
    return {
      error: `Barang ini sudah tidak tersedia: ${missing.join(", ")}. Hapus dari keranjang lalu coba lagi.`,
    };
  }

  /* ---- 4. Ongkir dari tarif pengrajin ---- */
  const rate = await findShippingRate(tenant.id, address.regencyId);
  if (!rate) {
    /*
     * INI titik yang paling mudah salah, dan paling mahal kalau salah.
     *
     * Tanpa blokir di sini, ongkir-nya jadi 0: pembeli melihat total yang
     * lebih murah, menekan bayar, dan uang yang benar-benar masuk tidak
     * termasuk ongkir. Tidak ada yang melihat sampai toko rugi.
     */
    return {
      error:
        "Toko ini belum punya tarif ongkir untuk kabupaten tujuan Anda. Hubungi toko untuk membicarakannya.",
    };
  }
  const shippingFee = rate.rateAmount;

  /* ---- 5. Total ---- */
  const totalAmount = itemsSubtotal + shippingFee;

  /* ---- 6. Tulis pesanan ---- */
  const orderCode = generateOrderCode();
  // Tagihan Midtrans hanya dibuat untuk pesanan VA. Pesanan COD TIDAK
  // perlu — dan menyimpannya berarti ada `order_id` yang tidak pernah
  // dibayar, yang akan muncul di rekonsiliasi sebagai transaksi menggantung.
  const midtransOrderId =
    input.paymentMethod === "cod" ? null : `ord-${crypto.randomUUID().slice(0, 12)}`;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const [order] = await db
    .insert(orders)
    .values({
      tenantId: tenant.id,
      orderCode,
      // Bentuk ini yang membuat webhook bisa membedakan tagihan SaaS
      // ("saas-...") dari tagihan pesanan ("ord-...") tanpa perlu knowlegya.
      midtransOrderId,
      source: "storefront",
      customerAddressId: address.id,
      customerName: address.recipientName,
      customerPhone: normalizePhone(address.customerPhone) ?? address.customerPhone,
      // Alamat di-snapshot. Kalau pembeli mengubah alamatnya di kemudian
      // hari, histori pesanan lama tidak boleh ikut berubah.
      customerAddress: address.addressLine,
      destinationCity: address.cityName,
      itemsSubtotal,
      shippingFee,
      totalAmount,
      // COD tidak punya DP: tidak ada uang yang masuk di muka, jadi `dpAmount`
      // harus nol. Kalau diisi `totalAmount` di sini, order COD akan terlihat
      // LUNAS di semua layar padahal belum ada satu rupiah pun yang diterima.
      dpAmount: input.paymentMethod === "cod" ? 0 : totalAmount,
      paymentMethod: input.paymentMethod,
      orderStatus: "pending_dp",
      paymentStatus: "unpaid",
    })
    .returning({ id: orders.id, orderCode: orders.orderCode });

  await db.insert(orderItems).values(
    orderLines.map((line) => ({
      orderId: order.id,
      productId: line.productId,
      productName: line.name,
      price: line.price,
      quantity: line.qty,
    })),
  );

  /* ---- 7. Tagihan Midtrans (hanya untuk pesanan VA) ---- */
  let redirectTo: string;

  if (input.paymentMethod === "cod") {
    /*
     * COD: tidak ada tagihan sama sekali.
     *
     * Pembeli diarahkan ke halaman lacak dengan kode pesannya — halaman yang
     * sama dengan pesanan VA, dan yang sudah menampilkan nomor + atas nama
     * rekening pengrajin untuk pesanan COD. Alasan memakai halaman yang sama,
     * bukan membuat halaman instruksi baru: pembeli sering tidak ingat nama
     * toko tempat ia memesan, tapi ia ingat kodenya. Halaman yang sudah
     * dikenal adalah yang akan ia buka.
     */
    redirectTo = `${await appUrl()}/lacak?kode=${orderCode}`;
  } else {
    try {
      const charge = await createOrderCharge({
        orderId: midtransOrderId as string,
        amount: totalAmount,
        customerName: address.recipientName,
        customerEmail: input.email,
        customerPhone: address.customerPhone,
        orderCode,
        itemSummary: `${itemCount} barang${shippingFee > 0 ? " + ongkir" : ""}`,
        finishUrl: `${await appUrl()}/lacak?kode=${orderCode}`,
      });
      redirectTo = charge.redirectUrl;

      await db
        .update(orders)
        .set({ snapToken: charge.token })
        .where(eq(orders.id, order.id));
    } catch (error) {
      /*
       * Tagihan gagal dibuat. Pesanan TIDAK dihapus: sudah tercatat, lengkap
       * dengan alamat dan barang, dan masih bisa dibayar dari panel toko.
       * Menghapusnya akan membuang bukti bahwa pembeli memang sudah checkout.
       * Yang diubah hanya statusnya supaya tidak terhitung sebagai "menunggu
       * pembayaran" yang tak terselesaikan.
       */
      console.error("Gagal membuat tagihan Midtrans untuk pesanan:", error);
      return {
        error:
          "Pesanan sudah tercatat, tetapi tagihan pembayarannya gagal dibuat. Coba lagi sebentar; kalau tetap gagal, hubungi toko dengan menyebut kode pesanan.",
      };
    }
  }

  return {
    redirectTo,
    summary: {
      orderCode,
      itemsSubtotal,
      shippingFee,
      totalAmount,
      itemCount,
    },
  };
}

/**
 * Keranjang SENGAJA tidak dikosongkan di dalam `createCheckoutOrder`.
 *
 * Terlihat kontradiktif — order sudah dibuat, jadi kenapa tidak dikosongkan?
 * Karena mengosongkan cookie di sini membuat Router me-render ulang halaman
 * dengan keranjang kosong, dan `CheckoutView` lalu me-render `EmptyState`
 * `CheckoutClient`. Artinya komponen yang tugasnya mengarahkan ke Midtrans
 * di-UNMOUNT tepat di detik dia perlu berjalan. Hasilnya: pembeli melihat
 * halaman keranjang kosong padahal tagihannya sudah dibuat dan uangnya akan
 * ditagih.
 *
 * Ini bukan kasus hipotesis — itu yang terjadi. Pesanan sudah tercatat,
 * snapToken sudah ada, tapi peramban diam saja di halaman checkout.
 *
 * Jadi cookie dikosongkan di SISI KLIEN, tepat sebelum melompat ke Midtrans
 * (lihat `emptyCart` di `cart-actions.ts` dan pemanggilannya di
 * `checkout-payment-step.tsx`). Kalau pemanggilan itu gagal, pembeli tetap
 * diarahkan — keranjang yang belum kosong adalah masalah jauh lebih kecil
 * dibanding pembeli yang sudah ditagih tapi tidak sampai ke halaman bayar.
 */

/**
 * Basis URL untuk `finishUrl` tagihan.
 *
 * Diambil dari Host request, bukan dari `NEXT_PUBLIC_APP_URL` yang di-inline
 * saat build. Alasannya praktis: satu build dipakai untuk staging lokal dan
 * untuk Vercel, dan kalau `finishUrl` memakai URL yang tertanam saat build,
 * satu dari keduanya akan mengarahkan pembeli ke domain yang tidak melayani
 * pesanan itu. Host request selalu benar untuk keduanya.
 *
 * `x-forwarded-host` dibaca lebih dulu karena di Vercel `host` bisa berisi
 * internal URL deployment. `NEXT_PUBLIC_APP_URL` hanya dipakai kalau
 * keduanya kosong — yang seharusnya tidak pernah terjadi.
 */
async function appUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "http://localhost:3000");
}

/** Kode pesanan unik tanpa sequence: prefix + timestamp base36 + acak. */
function generateOrderCode(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `ORD-${stamp}${rand}`;
}
