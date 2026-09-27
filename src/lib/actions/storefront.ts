"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { customerAddresses } from "@/db/schema";
import { parseForm } from "@/lib/schemas/primitives";
import {
  addressFormSchema,
  composeAddressLine,
} from "@/lib/schemas/address-form";
import { getTenantBySlug } from "@/lib/tenants";
import { normalizePhone } from "@/lib/wa-link";
import type { FormState } from "@/components/form-state";

/**
 * Alamat pengiriman pembeli storefront (Sprint 5 bagian 2).
 *
 * SOAL TENANT: action ini dipanggil pembeli yang tidak punya sesi, jadi tidak
 * bisa memakai `requireTenantWrite`. Yang dipakai adalah `tenantSlug` dari
 * form, lalu di-resolve dengan `getTenantBySlug()`.
 *
 * Kenapa ini aman: slug adalah identitas publik store — sudah tertulis di URL
 * dan di setiap tautan. `getTenantBySlug()` sudah memfilter `isActive`, jadi
 * satu-satunya tenant yang bisa ditunjuk adalah tenant aktif yang benar-benar
 * ada. `tenantId` SELALU dari hasil resolusi itu, TIDAK PERNAH dari
 * FormData — inilah penjaga satu-satunya yang mencegah satu tenant menulis ke
 * tenant lain.
 *
 * Yang BELUM ditangani di sini (bukan bug, belum ada fiturnya): pembatasan
 * laju permintaan. Action ini publik, jadi siapa pun bisa memanggilnya
 * berulang kali. Rate limiting masuk Sprint 6 bersama PWA.
 *
 * Pembeli tidak punya akun, jadi alamatnya di-key per nomor HP yang dia
 * ketik. Konsekuensinya siapa pun yang tahu nomor seseorang bisa melihat dan
 * memakai alamat orang itu — diterima untuk alamat pengiriman, dan alasan
 * form ini tidak boleh menampilkan apa pun selain alamatnya sendiri.
 */

export type StorefrontActionState = FormState & {
  /** Id alamat yang tersimpan, supaya form bisa menampilkan ringkasannya. */
  savedId?: string;
  /**
   * URL tujuan setelah berhasil. Server Action yang dipanggil dari Client
   * Component tidak bisa memanggil `redirect()` — pemanggilnya fetch, bukan
   * navigasi server. Jadi navigasi dikembalikan ke klien.
   */
  redirectTo?: string;
};

/** Alamat milik (tenant, nomor HP) tertentu. */
export async function listAddresses(tenantSlug: string, phone: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return [];

  const normalized = normalizePhone(phone);
  if (!normalized) return [];

  return db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.tenantId, tenant.id),
        // Dibandingkan dengan nomor ternormalisasi, karena data bisa tersimpan
        // dalam beberapa format dan pembeli mengetik format yang berbeda lagi
        // di visit berikutnya.
        eq(customerAddresses.customerPhone, normalized),
      ),
    )
    .orderBy(customerAddresses.updatedAt);
}

/**
 * Simpan alamat baru.
 *
 * `makeDefault` menandai alamat ini sebagai alamat bawaan untuk nomor tersebut
 * dan membuang status default dari alamat lama — dalam satu transaksi. Kalau
 * tidak, `address_default_per_phone_uniq` (partial unique index) akan menolak
 * insert kedua, dan pembelinya akan mendapat "gagal menyimpan" untuk sesuatu
 * yang sebenarnya berhasil.
 */
export async function saveAddress(
  _prev: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  // 1. Otorisasi/validasi tenant lebih dulu.
  const tenantSlug = formData.get("tenantSlug");
  if (typeof tenantSlug !== "string" || !tenantSlug) {
    return { error: "Toko tidak dikenali. Muat ulang halaman." };
  }
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { error: "Toko tidak tersedia." };
  }

  // 2. Validasi skema. Nomor HP ikut di sini dan tidak boleh kosong: tanpa
  //    nomor tidak ada cara mengaitkan alamat ke pembelinya.
  const parsed = parseForm(addressFormSchema, formData);
  if (!parsed.success) {
    return {
      error: "Periksa kembali isian alamat Anda.",
      fieldErrors: parsed.fieldErrors,
    };
  }
  const input = parsed.data;

  const phoneRaw = formData.get("phone");
  if (typeof phoneRaw !== "string") {
    return { error: "Nomor WhatsApp wajib diisi.", fieldErrors: { phone: "Wajib diisi." } };
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return {
      error: "Nomor WhatsApp tidak valid.",
      fieldErrors: { phone: "Nomor tidak valid." },
    };
  }

  /*
   * `cityName` diisi dari `regencyId` bila ada, kalau tidak dari isian manual.
   * Dipakai sebagai label tampilan di halaman daftar alamat. Pencocokan tarif
   * ongkir TIDAK memakai kolom ini — itu memakai `regencyId` (lihat catatan
   * "jebakan integrasi ongkir" di ROADMAP.md Sprint 5 bagian 3).
   */
  const cityName = input.cityName.trim() || input.regencyName.trim() || "";

  /*
   * Koordinat dikirim sebagai STRING, bukan number.
   *
   * Kolom `numeric` di Drizzle bertipe string — sama seperti uang di repo ini
   * (lihat AGENTS.md: "Uang masuk form sebagai string"). Mengirim number
   * ditolak saat typecheck, dan mengirim string sudah benar karena Postgres
   * yang melakukan konversi ke numeric(10,7).
   *
   * Skema sudah memvalidasi formatnya (`^-?\d{1,3}(\.\d{1,7})?$`), jadi
   * tidak ada jalur yang bisa menghasilkan "NaN" sampai ke sini.
   */
  const toCoord = (value: string | undefined) => (value ? value : null);

  const makeDefault = formData.get("makeDefault") === "on";

  try {
    const [saved] = await db.transaction(async (tx) => {
      if (makeDefault) {
        await tx
          .update(customerAddresses)
          .set({ isDefault: false })
          .where(
            and(
              eq(customerAddresses.tenantId, tenant.id),
              eq(customerAddresses.customerPhone, phone),
            ),
          );
      }

      const payload: typeof customerAddresses.$inferInsert = {
          tenantId: tenant.id,
          customerPhone: phone,
          // Nama penerima belum ada di form ini (pembeli hanya mengisi alamat),
          // jadi sementara memakai nomornya. Field ini ditimpa saat form
          // nama penerima ditambahkan.
          recipientName: phone,
          streetName: input.streetName,
          houseNumber: input.houseNumber,
          rt: input.rt || null,
          rw: input.rw || null,
          provinceId: input.provinceId || null,
          regencyId: input.regencyId || null,
          districtId: input.districtId || null,
          villageId: input.villageId || null,
          villageName: input.villageName,
          districtName: input.districtName,
          regencyName: input.regencyName,
          provinceName: input.provinceName,
          cityName,
          postalCode: input.postalCode || null,
          latitude: toCoord(input.latitude),
          longitude: toCoord(input.longitude),
          addressLine: composeAddressLine(input),
          isDefault: makeDefault,
        };

      return await tx
        .insert(customerAddresses)
        .values(payload)
        .returning({ id: customerAddresses.id });
    });

    return { savedId: saved.id };
  } catch (error) {
    console.error("Gagal menyimpan alamat:", error);
    return {
      error:
        "Alamat gagal disimpan. Periksa koneksi lalu coba lagi.",
    };
  }
}
