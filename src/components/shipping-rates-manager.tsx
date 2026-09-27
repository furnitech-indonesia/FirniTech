"use client";

import { useState } from "react";
import {
  PencilSimpleIcon,
  PlusIcon,
  TruckIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { ShippingRateForm } from "@/components/shipping-rate-form";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteShippingRate } from "@/lib/actions/shipping";
import { formatRupiah } from "@/lib/format";
import type { ShippingRateRow } from "@/lib/shipping";

/**
 * CRUD tarif ongkir (Sprint 5 bagian 3).
 *
 * Daftar dipisah menjadi "khusus" dan "cadangan" karena keduanya berbeda
 * sifat: yang khusus berlaku hanya untuk satu kabupaten, yang cadangan berlaku
 * untuk semua wilayah yang tidak punya tarif sendiri. Kalau keduanya
 * dicampur dalam satu daftar, pengrajin tidak akan bisa melihat apakah
 * jangkauan tokonya sudah benar.
 */
export function ShippingRatesManager({ rates }: { rates: ShippingRateRow[] }) {
  const [editing, setEditing] = useState<ShippingRateRow | null>(null);
  const [creating, setCreating] = useState(false);

  const fallback = rates.filter((r) => r.isDefault);
  const specific = rates.filter((r) => !r.isDefault);

  return (
    <div className="grid gap-6">
      {creating || editing ? (
        <Card>
          <CardContent className="grid gap-4">
            <h2 className="text-title-md text-foreground">
              {editing ? "Ubah tarif" : "Tambah tarif"}
            </h2>
            <ShippingRateForm
              existing={editing}
              onDone={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="touch"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Batal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          size="touch"
          onClick={() => setCreating(true)}
          className="justify-start px-4"
        >
          <PlusIcon size={18} weight="light" aria-hidden />
          Tambah tarif
        </Button>
      )}

      <RateGroup
        title="Tarif cadangan"
        hint="Dipakai untuk semua kabupaten yang tidak punya tarif khusus. Hanya boleh satu per toko."
        icon={<TruckIcon size={18} weight="light" aria-hidden />}
        rows={fallback}
        onEdit={setEditing}
      />

      <RateGroup
        title="Tarif khusus kabupaten"
        hint="Berlaku hanya untuk kabupaten yang dipilih."
        rows={specific}
        onEdit={setEditing}
        emptyMessage="Belum ada tarif khusus. Semua pembeli memakai tarif cadangan."
      />
    </div>
  );
}

function RateGroup({
  title,
  hint,
  icon,
  rows,
  onEdit,
  emptyMessage,
}: {
  title: string;
  hint: string;
  icon?: React.ReactNode;
  rows: ShippingRateRow[];
  onEdit: (row: ShippingRateRow) => void;
  emptyMessage?: string;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-title-md text-foreground">
        {icon}
        {title}
      </h2>
      <p className="mt-1 text-body-sm text-muted-foreground">{hint}</p>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-body-md text-muted-foreground">
          {emptyMessage ?? "Belum ada tarif cadangan — pembeli dari luar daftar tidak bisa checkout."}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-body-md text-foreground">
                  {row.cityName}
                  {row.isDefault ? (
                    <Badge variant="pending">Cadangan</Badge>
                  ) : !row.regencyId ? (
                    <Badge variant="pending">Belum dipilih</Badge>
                  ) : null}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  {row.provinceName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-code-tabular text-title-md text-foreground">
                  {formatRupiah(row.rateAmount)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(row)}
                  aria-label={`Ubah tarif ${row.cityName}`}
                >
                  <PencilSimpleIcon size={16} weight="bold" aria-hidden />
                </Button>

                {/*
                  `ActionForm` dipakai di sini karena ini aksi TANPA input —
                  persis syarat penggunaannya di repo ini. Form input (nama
                  kabupaten, nominal) tidak boleh memakainya.
                */}
                {/*
                  `submitLabel` dibiarkan kosong supaya `ActionForm` tidak
                  merender tombolnya sendiri — pemicunya adalah `Button` ikon
                  di bawah. Kalau tidak, baris ini punya dua tombol: satu
                  kosong dari ActionForm, satu ikon dari sini.
                */}
                <ActionForm
                  action={deleteShippingRate}
                  hidden={{ id: row.id }}
                  className="contents"
                >
                  <Button
                    type="submit"
                    variant="destructive"
                    size="icon"
                    aria-label={`Hapus tarif ${row.cityName}`}
                  >
                    <TrashIcon size={16} weight="bold" aria-hidden />
                  </Button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
