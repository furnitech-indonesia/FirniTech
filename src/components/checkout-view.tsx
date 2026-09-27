import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { CheckoutAddressStep } from "@/components/checkout-address-step";
/**
 * Halaman checkout (Sprint 5 bagian 2 & 3).
 *
 * Saat ini baru sampai LANGKAH ALAMAT. Langkah pembayaran belum ada dan
 * tidak dibuat palsu: tombol yang belum berfungsi lebih buruk daripada tidak
 * ada, karena pengguna menekan lalu merasa aplikasinya rusak.
 *
 * Keranjang masih kosong dan subtotal 0 karena belum ada session toko di sisi
 * pembeli. Angka itu ditampilkan apa adanya, bukan disembunyikan, supaya tidak
 * ada yang mengira checkout sudah terhubung ke keranjang sungguhan.
 */
export async function CheckoutView({
  tenantSlug,
  tenantId,
  basePath,
}: {
  tenantSlug: string;
  tenantId: string;
  basePath: string;
}) {
  void tenantId;

  return (
    <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`${basePath}/produk`}
        className="inline-flex min-h-11 items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeftIcon size={16} weight="light" aria-hidden />
        Kembali ke katalog
      </Link>

      <h1 className="mt-4 text-headline-md text-foreground">Checkout</h1>
      <p className="mt-1 text-body-md text-muted-foreground">
        Alamat pengiriman wajib dipilih sebelum ongkir bisa dihitung.
      </p>

      <div className="mt-8">
        <CheckoutAddressStep
          tenantSlug={tenantSlug}
          savedAddresses={[]}
          itemsSubtotal={0}
          itemCount={0}
        />
      </div>
    </main>
  );
}
