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
import {
  addProductionProgress,
  assignCarpenter,
  recordPayment,
  setTracking,
  transitionOrderStatus,
} from "@/lib/actions/orders";
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
import { Badge, Card, Field, Select, Textarea } from "@/components/ui";

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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/pesanan" className="text-amber-700 hover:underline">
          ← Kembali ke daftar pesanan
        </Link>
      </p>

      <header className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {order.orderCode}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {order.customerName} · {order.destinationCity} ·{" "}
            {formatDateID(order.createdAt)}
            {order.source === "manual" ? " · dicatat staf" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={ORDER_STATUS_TONES[current]}>
            {ORDER_STATUS_LABELS[current]}
          </Badge>
          <Badge tone={order.paymentStatus === "fully_paid" ? "settled" : "pending"}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card title="Rincian item">
            <ul className="grid gap-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-slate-900">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-slate-700">
                      {formatRupiah(item.price * item.quantity)}
                    </span>
                  </div>
                  {item.customSpecs ? (
                    <p className="mt-1 text-xs text-slate-600">
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

            <dl className="mt-4 grid gap-1 border-t border-slate-100 pt-3 text-sm">
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
          </Card>

          <Card
            title="Progres produksi"
            description="Unggah foto dari bengkel; status pesanan mengikuti tahap terakhir."
          >
            {progress.length === 0 ? (
              <p className="mb-4 text-sm text-slate-600">Belum ada progres.</p>
            ) : (
              <ol className="mb-4 grid gap-2">
                {progress.map((p) => (
                  <li
                    key={p.id}
                    className="flex gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
                      <p className="font-medium text-slate-900">
                        {PROGRESS_STAGE_LABELS[p.stage]}
                      </p>
                      <p className="text-xs text-slate-600">
                        {p.carpenterName} · {formatDateID(p.createdAt)}
                      </p>
                      {p.notes ? (
                        <p className="mt-1 text-sm text-slate-700">{p.notes}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <ActionForm
              action={addProductionProgress}
              hidden={{ orderId: order.id }}
              submitLabel="Simpan progres"
              encType="multipart/form-data"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Tahap"
                  name="stage"
                  options={PROGRESS_STAGE_ORDER.map((stage) => ({
                    value: stage,
                    label: PROGRESS_STAGE_LABELS[stage],
                  }))}
                  required
                />
                <Field
                  label="Foto bukti"
                  name="photo"
                  type="file"
                  required
                  hint="JPEG/PNG/WebP/AVIF, maksimal 5 MB."
                />
              </div>
              <Textarea label="Catatan" name="notes" rows={2} />
            </ActionForm>
          </Card>
        </div>

        <div className="grid gap-6">
          {nextStatuses.length > 0 ? (
            <Card
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
            </Card>
          ) : null}

          {isOwnerOrAdmin ? (
            <>
              <Card title="Tugaskan tukang">
                <ActionForm
                  action={assignCarpenter}
                  hidden={{ orderId: order.id }}
                  submitLabel="Simpan penugasan"
                >
                  <Select
                    label="Tukang produksi"
                    name="carpenterId"
                    defaultValue={order.assignedCarpenterId ?? ""}
                    options={[
                      { value: "", label: "— belum ditugaskan —" },
                      ...carpenters
                        .filter((c) => c.id !== order.assignedCarpenterId)
                        .map((c) => ({ value: c.id, label: c.fullName })),
                    ]}
                  />
                </ActionForm>
              </Card>

              <Card
                title="Catat pembayaran"
                description={`Sisa tagihan ${formatRupiah(remaining)}.`}
              >
                <ActionForm
                  action={recordPayment}
                  hidden={{ orderId: order.id }}
                  submitLabel="Catat pelunasan"
                >
                  <Field
                    label="Nominal pelunasan (Rp)"
                    name="amount"
                    type="number"
                    min="0"
                    defaultValue={remaining}
                    hint="Mencatat pelunasan akan menutup pesanan bila sudah penuh."
                  />
                  <input type="hidden" name="mode" value="dp" />
                </ActionForm>

                {remaining > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ActionForm
                      action={recordPayment}
                      hidden={{ orderId: order.id, mode: "lunas" }}
                      submitLabel={`Lunasi sisa ${formatRupiah(remaining)}`}
                      tone="ghost"
                      className="grid"
                    >
                      <p className="text-sm text-slate-700">
                        Mencatat pelunasan tidak mengubah status produksi.
                      </p>
                    </ActionForm>
                  </div>
                ) : null}
              </Card>
            </>
          ) : null}

          {isOwnerOrAdmin &&
          ["ready_to_ship", "shipped", "completed"].includes(current) ? (
            <Card title="Data pengiriman">
              <ActionForm
                action={setTracking}
                hidden={{ orderId: order.id }}
                submitLabel="Simpan resi"
              >
                <Field
                  label="Nama kargo"
                  name="cargoName"
                  defaultValue={order.cargoName ?? ""}
                  placeholder="Indah Logistik Kargo"
                />
                <Field
                  label="Nomor resi"
                  name="trackingNumber"
                  defaultValue={order.trackingNumber ?? ""}
                />
              </ActionForm>
            </Card>
          ) : null}

          <Card title="Alamat pengiriman">
            <p className="text-sm text-slate-700">{order.customerAddress}</p>
            <p className="mt-1 text-sm text-slate-700">
              {order.destinationCity}
            </p>
            <p className="mt-2 text-sm text-slate-600">{order.customerPhone}</p>
            {order.notes ? (
              <p className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-700">
                Catatan internal: {order.notes}
              </p>
            ) : null}
          </Card>
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
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>
        {label}
      </span>
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
