"use client";

import { useCallback, useState, useTransition } from "react";
import { MapPinIcon, PlusIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAddresses } from "@/lib/actions/storefront";
import { normalizePhone } from "@/lib/wa-link";

/**
 * Langkah alamat di checkout (Sprint 5 bagian 2).
 *
 * ALURNYA, sesuai requirement: pembeli WAJIB memilih alamat. Kalau belum punya,
 * form alamat lengkap terbuka untuk mereka. Tidak ada tombol "lewati" — alamat
 * tanpa tujuan tidak bisa dihitung ongkirnya, jadi checkout tidak mungkin
 * diteruskan tanpa itu.
 *
 * IDENTITAS PEMBELI ADALAH NOMOR HP, bukan sesi. Pembeli storefront tidak
 * punya akun, jadi "alamat saya" berarti "alamat untuk nomor ini". Formulir
 * meminta nomor HP lebih dulu, lalu:
 *   - kalau ada alamat tersimpan untuk (tenant, nomor itu) → ditampilkan
 *     sebagai pilihan
 *   - kalau tidak → form alamat lengkap langsung terbuka
 *
 * Konsekuensi yang diterima: siapa pun yang tahu nomor seseorang bisa memakai
 * alamat orang itu. Itu perilaku umum di marketplace, dan yang membuat ini
 * tidak berbahaya adalah form ini tidak pernah menampilkan apa pun selain
 * alamatnya sendiri — bukan riwayat pesanan, bukan total belanja.
 *
 * Daftar alamat DIMUAT DI SINI, lewat `listAddresses`, bukan dikirim dari
 * server halaman. Alasannya sederhana: server halaman tidak tahu nomor HP-nya
 * — pembeli yang belum mengetik tidak punya apa pun untuk dicari. Dipasrahkan
 * ke parent lewat `onAddressesChange` supaya langkah pembayaran bisa
 * menghitung ongkir dari alamat yang sedang dipilih.
 */

type SavedAddress = {
  id: string;
  recipientName: string;
  addressLine: string;
  cityName: string;
  postalCode: string | null;
  isDefault: boolean;
  regencyId: string | null;
};

export function CheckoutAddressStep({
  tenantSlug,
  onAddressesChange,
  onSelectAddress,
}: {
  tenantSlug: string;
  /** Melaporkan daftar alamat yang termuat ke parent (langkah pembayaran). */
  onAddressesChange?: (addresses: SavedAddress[]) => void;
  /** Melaporkan alamat yang sedang dipilih. */
  onSelectAddress?: (id: string | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const normalized = normalizePhone(phone);
  const validPhone = normalized !== null;

  const applyAddresses = useCallback(
    (rows: Awaited<ReturnType<typeof listAddresses>>) => {
      const mapped: SavedAddress[] = rows.map((row) => ({
        id: row.id,
        recipientName: row.recipientName,
        addressLine: row.addressLine,
        cityName: row.cityName,
        postalCode: row.postalCode,
        isDefault: row.isDefault,
        regencyId: row.regencyId,
      }));

      setAddresses(mapped);
      setLoaded(true);

      /*
       * Alamat bawaan jadi pilihan awal kalau ada; kalau tidak, baris
       * pertama. Kalau tidak ada alamat sama sekali, pilihannya `null` — dan
       * itu yang membuat tombol bayar di langkah pembayaran mati.
       */
      const next =
        mapped.find((a) => a.isDefault)?.id ?? mapped[0]?.id ?? null;
      setSelectedId(next);
      onAddressesChange?.(mapped);
      onSelectAddress?.(next);
    },
    [onAddressesChange, onSelectAddress],
  );

  const load = useCallback(() => {
    if (!normalized) return;
    startTransition(async () => {
      applyAddresses(await listAddresses(tenantSlug, normalized));
    });
  }, [applyAddresses, normalized, tenantSlug]);

  const select = (id: string) => {
    setSelectedId(id);
    onSelectAddress?.(id);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4">
          <h2 className="text-title-md text-foreground">1. Nomor WhatsApp</h2>
          <p className="text-body-sm text-muted-foreground">
            Dipakai untuk menemukan alamat yang pernah Anda simpan, dan untuk
            pembaruan status pesanan.
          </p>
          {/*
            Input biasa, bukan `TextField` dari rhf-fields.
            `TextField` meng-spread hasil `ctx.register()`, jadi ia HANYA bisa
            dipakai di dalam form react-hook-form. Versi pertama memakai
            konteks palsu untuk memaksanya di sini, dan `register()` palsu itu
            mengembalikan `name: ""` — yang menimpa atribut `name` yang sudah
            benar dan membuat inputnya tidak punya nama sama sekali.
            Alasan yang lebih mendasar: field ini memang bukan bagian form
            mana pun; ia state lokal yang berdiri sendiri.
          */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="checkout-phone"
                className="grid gap-1.5 text-label-lg text-foreground"
              >
                Nomor WhatsApp
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={phone && !validPhone ? true : undefined}
                  className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-body-md text-foreground aria-invalid:border-destructive"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="touch"
              disabled={!validPhone || pending}
              onClick={load}
            >
              {pending ? (
                <SpinnerGapIcon size={18} weight="light" aria-hidden />
              ) : null}
              Lihat alamat saya
            </Button>
          </div>
          {phone && !validPhone ? (
            <p className="text-body-sm text-destructive">
              Nomor belum valid. Contoh: 081234567890.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {loaded ? (
        <Card>
          <CardContent className="grid gap-4">
            <h2 className="text-title-md text-foreground">
              2. Alamat pengiriman
            </h2>

            {addresses.length > 0 ? (
              <>
                <ul className="grid gap-2">
                  {addresses.map((address) => (
                    <li key={address.id}>
                      <label
                        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                          selectedId === address.id
                            ? "border-primary bg-accent/40"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedId === address.id}
                          onChange={() => select(address.id)}
                          className="mt-1 size-4"
                        />
                        <span className="min-w-0 text-body-md">
                          <span className="block text-foreground">
                            {address.recipientName} — {address.addressLine}
                          </span>
                          {address.postalCode ? (
                            <span className="block text-body-sm text-muted-foreground">
                              {address.postalCode} {address.cityName}
                            </span>
                          ) : (
                            <span className="block text-body-sm text-muted-foreground">
                              {address.cityName}
                            </span>
                          )}
                          {address.isDefault ? (
                            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-label-sm text-muted-foreground">
                              Alamat bawaan
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  onClick={() => setShowForm(true)}
                >
                  <PlusIcon size={18} weight="light" aria-hidden />
                  Pakai alamat lain
                </Button>
              </>
            ) : (
              <>
                {/*
                  Tidak ada alamat tersimpan. Ini kondisi yang paling sering
                  terjadi — pembeli baru, atau pertama kali di toko ini.
                  Yang ditampilkan langsung formnya, dengan penjelasan kenapa
                  dia diminta mengetik, supaya tidak terasa seperti kesalahan.
                */}
                <p className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-body-sm text-muted-foreground">
                  <MapPinIcon
                    size={16}
                    weight="light"
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  Belum ada alamat untuk nomor ini. Isi alamat lengkap di
                  bawah — nama jalan, desa, dan RT/RW membantu kurir menemukan
                  lokasi, dan ongkir dihitung dari kabupaten/kota tujuan.
                </p>
                <AddressForm
                  tenantSlug={tenantSlug}
                  phone={normalized ?? ""}
                  onSaved={load}
                />
              </>
            )}

            {addresses.length > 0 && showForm ? (
              <AddressForm
                tenantSlug={tenantSlug}
                phone={normalized ?? ""}
                onSaved={() => {
                  setShowForm(false);
                  load();
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
