"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, productionProgress, users } from "@/db/schema";
import type { OrderStatus, ProgressStage } from "@/lib/order-status";
import {
  STAGE_TO_ORDER_STATUS,
  canTransition,
} from "@/lib/order-status";
import { PLATFORM_FEE_RATE } from "@/lib/fees";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseForm } from "@/lib/schemas/primitives";
import {
  addProgressSchema,
  assignCarpenterSchema,
  customOrderSchema,
  recordPaymentSchema,
  setTrackingSchema,
  transitionStatusSchema,
} from "@/lib/schemas/order";
import { uploadProductImage } from "@/lib/storage";

/**
 * Pesanan: transisi status, penugasan tukang, Custom Order Builder, pembayaran,
 * resi, dan progres produksi.
 *
 * Transisi status memakai `canTransition` dari src/lib/order-status.ts — satu
 * sumber kebenaran, bukan daftar if/else yang tersebar.
 */

const WRITE_ROLES = ["owner", "admin_penjualan"] as const;

/**
 * Status mana yang boleh di-set tiap role.
 * Tukang boleh melaporkan progres produksi, TIDAK boleh menandai barang sudah
 * dikirim atau pelunasan — itu keputusan operasional pemilik.
 */
const ROLE_ALLOWED_TARGETS: Record<string, readonly OrderStatus[]> = {
  owner: [
    "in_production",
    "quality_control",
    "ready_to_ship",
    "shipped",
    "completed",
    "cancelled",
  ],
  admin_penjualan: [
    "in_production",
    "quality_control",
    "ready_to_ship",
    "shipped",
    "completed",
    "cancelled",
  ],
  tukang: ["in_production", "quality_control"],
};

export type OrderFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Kode pesanan unik tanpa sequence: prefix + timestamp base36 + acak. */
function generateOrderCode(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `ORD-${stamp}${rand}`;
}

export async function createCustomOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(customOrderSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const data = parsed.data;

      const itemsSubtotal = data.price * data.quantity;
      const totalAmount = itemsSubtotal + data.shippingFee;

      // Fee platform 1.5% dari total all-in. Untuk pesanan manual (bayar di
      // luar Midtrans) MDR dianggap nol; MDR baru diisi saat pembayaran lewat
      // Midtrans tercatat.
      const platformServiceFee = Math.round(totalAmount * PLATFORM_FEE_RATE);
      const midtransMdrFee = 0;
      const netTenantAmount = totalAmount - midtransMdrFee - platformServiceFee;

      if (data.dpAmount > totalAmount) {
        return {
          error: "DP tidak boleh melebihi total pesanan.",
          fieldErrors: { dpAmount: "DP lebih besar dari total pesanan." },
        };
      }

      const paymentStatus =
        data.dpAmount === 0
          ? "unpaid"
          : data.dpAmount >= totalAmount
            ? "fully_paid"
            : "dp_paid";

      const created = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            orderCode: generateOrderCode(),
            tenantId: actor.tenantId,
            source: "manual",
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerAddress: data.customerAddress,
            destinationCity: data.destinationCity,
            itemsSubtotal,
            shippingFee: data.shippingFee,
            totalAmount,
            midtransMdrFee,
            platformServiceFee,
            netTenantAmount,
            dpAmount: data.dpAmount,
            paymentStatus,
            orderStatus: "pending_dp",
            notes: data.notes,
          })
          .returning();

        await tx.insert(orderItems).values({
          orderId: order!.id,
          // productId sengaja null: pesanan ini di luar katalog standar.
          productName: data.itemName,
          customSpecs: {
            ...(data.lengthCm ? { lengthCm: data.lengthCm } : {}),
            ...(data.widthCm ? { widthCm: data.widthCm } : {}),
            ...(data.heightCm ? { heightCm: data.heightCm } : {}),
            ...(data.woodType ? { woodType: data.woodType } : {}),
            ...(data.finishingType ? { finishingType: data.finishingType } : {}),
            ...(data.specNotes ? { notes: data.specNotes } : {}),
          },
          price: data.price,
          quantity: data.quantity,
        });

        return order!;
      });

      revalidatePath("/dashboard/pesanan");
      revalidatePath(`/dashboard/pesanan/${created.id}`);
      return { message: `Pesanan ${created.orderCode} tercatat.` };
    },
    (error) => ({ error }),
  );
}

export async function transitionOrderStatus(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite([
        "owner",
        "admin_penjualan",
        "tukang",
      ]);

      const parsed = parseForm(transitionStatusSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, target } = parsed.data;

      const [order] = await db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          orderStatus: orders.orderStatus,
        })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);

      if (!order) return { error: "Pesanan tidak ditemukan." };

      if (!canTransition(order.orderStatus as OrderStatus, target)) {
        return {
          error: `Status ${order.orderStatus} tidak bisa langsung menjadi ${target}.`,
        };
      }

      const allowed = ROLE_ALLOWED_TARGETS[actor.role] ?? [];
      if (!allowed.includes(target)) {
        return { error: "Peran Anda tidak berwenang mengubah ke status itu." };
      }

      await db
        .update(orders)
        .set({ orderStatus: target })
        .where(eq(orders.id, orderId));

      revalidatePath(`/dashboard/pesanan/${orderId}`);
      revalidatePath("/dashboard/pesanan");
      return { message: `Status ${order.orderCode} → ${target}.` };
    },
    (error) => ({ error }),
  );
}

export async function assignCarpenter(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(assignCarpenterSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, carpenterId } = parsed.data;

      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!order) return { error: "Pesanan tidak ditemukan." };

      if (!carpenterId) {
        await db
          .update(orders)
          .set({ assignedCarpenterId: null })
          .where(eq(orders.id, orderId));
        revalidatePath(`/dashboard/pesanan/${orderId}`);
        return { message: "Tukang dilepas dari pesanan." };
      }

      // Tukang yang ditugaskan WAJIB dari tenant yang sama dan berstatus aktif.
      const [carpenter] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, carpenterId),
            eq(users.tenantId, actor.tenantId),
            eq(users.role, "tukang"),
            eq(users.isActive, true),
          ),
        )
        .limit(1);
      if (!carpenter) return { error: "Tukang tidak ditemukan di toko ini." };

      await db
        .update(orders)
        .set({ assignedCarpenterId: carpenterId })
        .where(eq(orders.id, orderId));

      revalidatePath(`/dashboard/pesanan/${orderId}`);
      return { message: "Tukang ditugaskan." };
    },
    (error) => ({ error }),
  );
}

export async function recordPayment(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(recordPaymentSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, mode, amount } = parsed.data;

      const [order] = await db
        .select({
          id: orders.id,
          totalAmount: orders.totalAmount,
          dpAmount: orders.dpAmount,
          paymentStatus: orders.paymentStatus,
        })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!order) return { error: "Pesanan tidak ditemukan." };

      if (order.paymentStatus === "refunded") {
        return { error: "Pesanan yang sudah refund tidak bisa dicatat bayar." };
      }

      const total = Number(order.totalAmount);
      const dp = Number(order.dpAmount);

      // Pelunasan = total − DP yang sudah tercatat, bukan total penuh.
      const value = mode === "lunas" ? total - dp : amount;
      if (value <= 0) {
        return {
          error: "Nominal tidak valid.",
          fieldErrors: { amount: "Nominal harus lebih dari nol." },
        };
      }

      const nextDp = dp + value;
      const nextStatus = nextDp >= total ? "fully_paid" : "dp_paid";

      await db
        .update(orders)
        .set({
          dpAmount: nextDp,
          paymentStatus: nextStatus,
          paidAt: nextStatus === "fully_paid" ? new Date() : null,
        })
        .where(eq(orders.id, orderId));

      revalidatePath(`/dashboard/pesanan/${orderId}`);
      revalidatePath("/dashboard/pesanan");
      return {
        message:
          nextStatus === "fully_paid"
            ? "Pesanan lunas."
            : `DP tercatat. Sisa tagihan ${total - nextDp}.`,
      };
    },
    (error) => ({ error }),
  );
}

export async function setTracking(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite(WRITE_ROLES);

      const parsed = parseForm(setTrackingSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, cargoName, trackingNumber } = parsed.data;

      const [order] = await db
        .select({ id: orders.id, orderStatus: orders.orderStatus })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!order) return { error: "Pesanan tidak ditemukan." };

      // Resi hanya relevan setelah barang siap dikirim.
      if (
        !(["ready_to_ship", "shipped", "completed"] as string[]).includes(
          order.orderStatus,
        )
      ) {
        return { error: "Resi hanya bisa diisi saat pesanan siap dikirim." };
      }

      await db
        .update(orders)
        .set({ cargoName, trackingNumber })
        .where(eq(orders.id, orderId));

      revalidatePath(`/dashboard/pesanan/${orderId}`);
      return { message: "Data pengiriman disimpan." };
    },
    (error) => ({ error }),
  );
}

export async function addProductionProgress(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  return guard<OrderFormState>(
    async () => {
      const actor = await requireTenantWrite([
        "owner",
        "admin_penjualan",
        "tukang",
      ]);

      const parsed = parseForm(addProgressSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { orderId, stage, notes } = parsed.data;

      const [order] = await db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          orderStatus: orders.orderStatus,
        })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!order) return { error: "Pesanan tidak ditemukan." };

      // Foto wajib; MIME & ukuran divalidasi di src/lib/storage.ts.
      const file = formData.get("photo");
      let photoUrl = parsed.data.photoUrl ?? "";
      if (file instanceof File && file.size > 0) {
        photoUrl = await uploadProductImage({
          tenantId: actor.tenantId,
          productSlug: `order-${order.orderCode}`,
          file,
        });
      }
      if (!photoUrl) {
        return {
          error: "Foto progres wajib diunggah.",
          fieldErrors: { photo: "Pilih foto bukti." },
        };
      }

      await db.insert(productionProgress).values({
        orderId,
        carpenterId: actor.role === "tukang" ? actor.userId : null,
        carpenterName: actor.fullName,
        stage: stage as ProgressStage,
        photoUrl,
        notes,
      });

      // Status pesanan mengikuti tahap yang baru diunggah. Aturan transisinya
      // tetap milik src/lib/order-status.ts, bukan diulang di sini.
      const target = STAGE_TO_ORDER_STATUS[stage as ProgressStage];
      if (canTransition(order.orderStatus as OrderStatus, target)) {
        await db
          .update(orders)
          .set({ orderStatus: target })
          .where(eq(orders.id, orderId));
      }

      revalidatePath(`/dashboard/pesanan/${orderId}`);
      return { message: "Progres produksi tersimpan." };
    },
    (error) => ({ error }),
  );
}
