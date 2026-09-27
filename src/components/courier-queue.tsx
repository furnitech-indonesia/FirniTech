import { PackageIcon, PhoneIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateID } from "@/lib/format";
import { PROGRESS_STAGE_LABELS } from "@/lib/labels";
import type { CourierDelivery } from "@/lib/courier-queue";

/**
 * Daftar pengiriman untuk kurir.
 *
 * Tampilan ini sengaja sangat sedikit isinya. Kurir ada di jalan, satu
 * tangan memegang paket, dan tidak ada gunanya baginya melihat nominal
 * pesanan, margin toko, atau pesanan milik kurir lain. Yang ditampilkan di
 * sini persis yang dibutuhkan untuk menyelesaikan pengiriman: ke mana,
 * untuk siapa, dan nomor yang perlu ditagih kalau gagal.
 *
 * Tanpa nominal absolut — bukan karena disembunyikan, karena tidak ada di
 * query-nya sama sekali. `test:kurir` mengunci itu.
 */
export function CourierQueue({ items }: { items: CourierDelivery[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        message="Tidak ada pengiriman untuk Anda saat ini. Minta pemilik toko menugaskan Anda pada pesanan yang sudah siap."
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id}>
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
                    {PROGRESS_STAGE_LABELS[item.lastStage] ?? item.lastStage}
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
                    Hanya empat digit terakhir. Kurir butuh
                    mencocokkan kiriman, bukan menelepon pembeli — dan
                    nomor penuh adalah data pribadi yang tidak perlu
                    berada di layar yang bisa dibuka orang lain di
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
                      {item.trackingNumber
                        ? ` · ${item.trackingNumber}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">Dipesan</dt>
                  <dd className="text-foreground">{formatDateID(item.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
