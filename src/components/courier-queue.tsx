import { CourierDeliveryCard } from "@/components/courier-delivery-card";
import { EmptyState } from "@/components/panels";
import type { CourierDelivery } from "@/lib/courier-queue";

/**
 * Daftar pengiriman untuk kurir.
 *
 * Server Component: daftar dan Nominal TIDAK di sini, dan bukan karena
 * disembunyikan — `loadCourierQueue` memang tidak mengambilnya, jadi tidak
 * ada yang perlu disembunyikan. `test:kurir` mengunci itu lewat kunci, bukan
 * lewat nilai, karena angka margin bisa kebetulan sama dengan total yang
 * memang boleh tampil.
 *
 * Yang ditampilkan persis yang dibutuhkan untuk menyelesaikan pengiriman:
 * ke mana, untuk siapa, dan nomor yang perlu dicocokkan.
 */
export function CourierQueue({ items }: { items: CourierDelivery[] }) {
  if (items.length === 0) {
    return (
      <EmptyState message="Tidak ada pengiriman untuk Anda saat ini. Minta pemilik toko menugaskan Anda pada pesanan yang sudah siap." />
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <CourierDeliveryCard item={item} />
        </li>
      ))}
    </ul>
  );
}
