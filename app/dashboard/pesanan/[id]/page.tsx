import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  orderItems,
  orders,
  productionProgress,
  users,
} from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { recordPayment, transitionOrderStatus } from "@/lib/actions/orders";
import { ProgressForm } from "@/components/progress-form";
import {
  AssignCarpenterForm,
  RecordPaymentForm,
  TrackingForm,
} from "@/components/order-forms";
import { formatDateID, formatRupiah } from "@/lib/format";
import { createSignedUrls } from "@/lib/storage";
import { ALLOWED_TRANSITIONS, PROGRESS_STAGE_ORDER } from "@/lib/order-status";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PROGRESS_STAGE_LABELS,
  type OrderStatus,
} from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order || order.tenantId !== actor.tenantId) {
    notFound();
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  const progress = await db
    .select()
    .from(productionProgress)
    .where(eq(productionProgress.orderId, id))
    .orderBy(asc(productionProgress.createdAt));

  const carpenters = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.tenantId, actor.tenantId));

  const progressImageMap = await createSignedUrls(
    progress.map((p) => p.photoUrl),
  );

  const current = order.orderStatus as OrderStatus;
  const nextStatuses = ALLOWED_TRANSITIONS[current] ?? [];
  const isOwnerOrAdmin =
    actor.role === "owner" || actor.role === "admin_penjualan";
  const total = Number(order.totalAmount);
  const dp = Number(order.dpAmount);
  const remaining = Math.max(0, total - dp);

  return (
    <main id="konten-utama" className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/pesanan" className="text-accent-foreground hover:underline">
          ← Kembali ke daftar pesanan
        </Link>
      </p>

      <header className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {order.orderCode}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} · {order.destinationCity} ·{" "}
            {formatDateID(order.createdAt)}
            {order.source === "manual" ? " · dicatat staf" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ORDER_STATUS_TONES[current]}>
            {ORDER_STATUS_LABELS[current]}
          </Badge>
          <Badge variant={order.paymentStatus === "fully_paid" ? "settled" : "pending"}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <SectionCard title="Rincian item">
            <ul className="grid gap-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-border p-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-foreground">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-secondary">
                      {formatRupiah(item.price * item.quantity)}
                    </span>
                  </div>
                  {item.customSpecs ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        item.customSpecs.lengthCm && `P ${item.customSpecs.lengthCm} cm`,
                        item.customSpecs.widthCm && `L ${item.customSpecs.widthCm} cm`,
                        item.customSpecs.heightCm &&
                          `T ${item.customSpecs.heightCm} cm`,
                        item.customSpecs.woodType,
                        item.customSpecs.finishingType,
                        item.customSpecs.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>

            <dl className="mt-4 grid gap-1 border-t border-border pt-3 text-sm">
              <Row label="Subtotal" value={formatRupiah(order.itemsSubtotal)} />
              <Row label="Ongkir kargo" value={formatRupiah(order.shippingFee)} />
              <Row label="Total all-in" value={formatRupiah(total)} strong />
              <Row label="MDR Midtrans" value={`− ${formatRupiah(order.midtransMdrFee)}`} />
              <Row
                label="Fee platform"
                value={`− ${formatRupiah(order.platformServiceFee)}`}
              />
              <Row
                label="Saldo cair pengrajin"
                value={formatRupiah(order.netTenantAmount)}
                strong
              />
            </dl>
          </SectionCard>

          <SectionCard
            title="Progres produksi"
            description="Unggah foto dari bengkel; status pesanan mengikuti tahap terakhir."
          >
            {progress.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">Belum ada progres.</p>
            ) : (
              <ol className="mb-4 grid gap-2">
                {progress.map((p) => (
                  <li
                    key={p.id}
                    className="flex gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {progressImageMap[p.photoUrl] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={progressImageMap[p.photoUrl]}
                          alt={PROGRESS_STAGE_LABELS[p.stage]}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {PROGRESS_STAGE_LABELS[p.stage]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.carpenterName} · {formatDateID(p.createdAt)}
                      </p>
                      {p.notes ? (
                        <p className="mt-1 text-sm text-secondary">{p.notes}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <ProgressForm
              orderId={order.id}
              stageOptions={PROGRESS_STAGE_ORDER.map((stage) => ({
                value: stage,
                label: PROGRESS_STAGE_LABELS[stage],
              }))}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6">
          {nextStatuses.length > 0 ? (
            <SectionCard
              title="Ubah status"
              description="Transisi memakai aturan di src/lib/order-status.ts."
            >
              <div className="grid gap-3">
                {nextStatuses.map((target) => (
                  <ActionForm
                    key={target}
                    action={transitionOrderStatus}
                    hidden={{ orderId: order.id, target }}
                    submitLabel={`→ ${ORDER_STATUS_LABELS[target]}`}
                    tone={target === "cancelled" ? "danger" : "primary"}
                    className="grid"
                  />
                ))}
              </div>
            </SectionCard>
          ) : null}

          {isOwnerOrAdmin ? (
            <>
              <SectionCard title="Tugaskan tukang">
                <AssignCarpenterForm
                  orderId={order.id}
                  assignedTo={order.assignedCarpenterId}
                  carpenters={carpenters}
                />
              </SectionCard>

              <SectionCard
                title="Catat pembayaran"
                description={`Sisa tagihan ${formatRupiah(remaining)}.`}
              >
                <RecordPaymentForm orderId={order.id} remaining={remaining} />

                {remaining > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    {/* Aksi tanpa input -> tetap ActionForm, bukan ZodForm. */}
                    <ActionForm
                      action={recordPayment}
                      hidden={{ orderId: order.id, mode: "lunas" }}
                      submitLabel={`Lunasi sisa ${formatRupiah(remaining)}`}
                      tone="ghost"
                      className="grid"
                    >
                      <p className="text-sm text-secondary">
                        Mencatat pelunasan tidak mengubah status produksi.
                      </p>
                    </ActionForm>
                  </div>
                ) : null}
              </SectionCard>
            </>
          ) : null}

          {isOwnerOrAdmin &&
          ["ready_to_ship", "shipped", "completed"].includes(current) ? (
            <SectionCard title="Data pengiriman">
              <TrackingForm
                orderId={order.id}
                cargoName={order.cargoName}
                trackingNumber={order.trackingNumber}
              />
            </SectionCard>
          ) : null}

          <SectionCard title="Alamat pengiriman">
            <p className="text-sm text-secondary">{order.customerAddress}</p>
            <p className="mt-1 text-sm text-secondary">
              {order.destinationCity}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{order.customerPhone}</p>
            {order.notes ? (
              <p className="mt-3 border-t border-border pt-2 text-sm text-secondary">
                Catatan internal: {order.notes}
              </p>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-semibold text-foreground" : "text-secondary"}>
        {label}
      </span>
      <span className={strong ? "font-semibold text-foreground" : "text-secondary"}>
        {value}
      </span>
    </div>
  );
}
