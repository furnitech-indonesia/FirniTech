"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  PackageIcon,
  PhoneIcon,
  TruckIcon,
} from "@phosphor-icons/react";

import { DeliveryProofForm } from "@/components/delivery-proof-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateID } from "@/lib/format";
import { PROGRESS_STAGE_LABELS, type ProgressStage } from "@/lib/labels";
import type { CourierDelivery } from "@/lib/courier-queue";

/**
 * Satu kiriman di daftar kurir, dengan panel bukti yang bisa dibuka.
 *
 * Panelnya inline, bukan dialog atau halaman terpisah, dan itu pilihan
 * mobile yang disengaja: kurir sedang berdiri di depan pintu dengan paket di
 * satu tangan. Setiap perpindahan halaman berarti menutup dan membuka ulang
 * aplikasi, dan peluangnya melakukan itu di tengah pengiriman jauh lebih besar
 * daripada sekarang, saat formnya sudah terbuka dan tinggal diisi.
 *
 * abrir/tutup disimpan di state lokal, bukan di URL: berpindah ke `/kurir?`
 * untuk satu panel membuat browser bisa "kembali" ke panel yang sudah menutup,
 * dan tidak ada alasan untuk menyimpan state itu di URL.
 */
export function CourierDeliveryCard({ item }: { item: CourierDelivery }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-code-tabular text-body-sm text-muted-foreground">
              {item.orderCode}
            </p>
            <p className="truncate text-title-md text-foreground">
              {item.customerName}
            </p>
          </div>
          {item.lastStage ? (
            <Badge variant="production">
              {PROGRESS_STAGE_LABELS[item.lastStage as ProgressStage] ??
                item.lastStage}
            </Badge>
          ) : null}
        </div>

        <p className="flex items-start gap-2 text-body-md text-muted-foreground">
          <PackageIcon
            size={16}
            weight="light"
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <span className="min-w-0">{item.destinationLine}</span>
        </p>

        <dl className="grid gap-1 text-body-sm">
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <PhoneIcon size={16} weight="light" aria-hidden />
              Nomor
            </dt>
            {/*
              Hanya empat digit terakhir. Kurir butuh mencocokkan kiriman,
              bukan menelepon pembeli — dan nomor penuh adalah data pribadi
              yang tidak perlu berada di layar yang bisa dibuka orang lain di
              sekitar.
            */}
            <dd className="text-code-tabular text-foreground">
              …{item.customerPhoneLast4}
            </dd>
          </div>
          {item.cargoName ? (
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">Kargo</dt>
              <dd className="text-foreground">
                {item.cargoName}
                {item.trackingNumber ? ` · ${item.trackingNumber}` : ""}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Dipesan</dt>
            <dd className="text-foreground">{formatDateID(item.createdAt)}</dd>
          </div>
        </dl>

        {item.hasProof ? (
          <p className="flex items-center gap-2 rounded-xl bg-status-settled-bg px-3 py-2 text-body-sm text-status-settled">
            <CheckCircleIcon size={16} weight="fill" aria-hidden />
            Bukti sudah terkirim, pencairan sudah dipicu.
          </p>
        ) : open ? (
          <DeliveryProofForm
            orderId={item.id}
            isCod={item.isCod}
            remaining={item.remaining}
            onDone={() => setOpen(false)}
          />
        ) : (
          <Button type="button" size="touch" onClick={() => setOpen(true)}>
            <TruckIcon size={18} weight="bold" aria-hidden />
            Catat barang diterima
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
