import { CourierQueue } from "@/components/courier-queue";
import { TenantShell } from "@/components/tenant-shell";
import { requireRoleForRead } from "@/lib/auth/guard";
import { loadCourierQueue } from "@/lib/courier-queue";
import { getTenantById } from "@/lib/tenants";

/**
 * Halaman pengiriman untuk kurir (Sprint 6, keputusan pemilik produk).
 *
 * Ini satu-satunya halaman yang boleh dibuka role `kurir`, dan satu-satunya
 * yang benar-benar dibutuhkan untuk menyelesaikan pengiriman. Bukan "menu
 * ringkas" — memang hanya satu halaman, dan sengaja tidak ada halaman
 * agg-nya.
 *
 * Otorisasi memakai `requireRoleForRead`, bukan `requireTenantWrite`. Kurir
 * tidak boleh MENULIS apa pun — ia hanya boleh membaca daftar yang ditugaskan
 * dan, pada langkah berikutnya, mengunggah bukti penerimaan. Memakai
 * `requireTenantWrite` untuk halaman baca akan menyiratkan bahwa ia bisa
 * menulis, dan itu akan propagasi ke mana saja yang menjadikannya pola.
 *
 * `PATH_ACCESS` di `permissions.ts` juga menutup `/kurir` dari role lain, jadi
 * kurir yang mengetik `/dashboard` langsung diarahkan ke sini, dan owner yang
 * mengetik `/kurir` mendapat 403 — bukan halaman kosong yang membuat orang
 * mengira aplikasinya rusak.
 */
export default async function CourierHome() {
  const session = await requireRoleForRead(["kurir"]);

  /*
   * `requireRoleForRead` mengembalikan `Session` yang `tenantId`-nya nullable
   * (super_admin tidak mungkin lolos role list, tapi tipenya tetap
   * nullable). Menolak null di sini membuat TypeScript berhenti menebak di
   * baris query — tanpa itu `tenantId` bisa `null` secara teoretis, dan
   * filter yang bergantung padanya tidak berdaya.
   */
  if (!session.tenantId) {
    return (
      <main id="konten-utama" className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-headline-md text-foreground">Tidak ada toko</h1>
        <p className="mt-2 text-body-md text-muted-foreground">
          Akun ini tidak terikat pada toko mana pun. Hubungi pemilik toko.
        </p>
      </main>
    );
  }

  const tenant = await getTenantById(session.tenantId);
  const items = await loadCourierQueue(session.tenantId, session.userId);

  return (
    <TenantShell
      name={tenant?.name ?? "Toko"}
      plan={tenant?.plan ?? "basic"}
      basePath={`/t/${tenant?.slug ?? ""}`}
      categories={[]}
    >
      <main id="konten-utama" className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <h1 className="text-headline-md text-foreground">Pengiriman</h1>
          <p className="mt-1 text-body-md text-muted-foreground">
            {items.length === 0
              ? "Belum ada kiriman yang ditugaskan kepada Anda."
              : `${items.length} kiriman menunggu Anda.`}
          </p>
        </header>
        <CourierQueue items={items} />
      </main>
    </TenantShell>
  );
}
