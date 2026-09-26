"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, productionProgress, users } from "@/db/schema";
import type { OrderStatus, ProgressStage } from "@/lib/order-status";
import {
  PROGRESS_STAGE_ORDER,
  STAGE_TO_ORDER_STATUS,
  canTransition,
} from "@/lib/order-status";
import { PLATFORM_FEE_RATE } from "@/lib/plans";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseInt10, parseRupiah, requiredStr, str } from "@/lib/parse";
import { uploadProductImage } from "@/lib/storage";

/**
 * Pesanan: transisi status, penugasan tukang, dan Custom Order Builder.
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

export type OrderFormState = { error?: string; message?: string };

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

      const itemName = requiredStr(formData, "itemName");
      const price = parseRupiah(formData.get("price"));
      const quantity = parseInt10(formData.get("quantity"), { min: 1, fallback: 1 });
      const shippingFee = parseRupiah(formData.get("shippingFee"));

      if (price <= 0) return { error: "Harga item harus lebih dari nol." };

      const itemsSubtotal = price * quantity;
      const totalAmount = itemsSubtotal + shippingFee;

      // Fee platform 1.5% dari total all-in. Untuk pesanan manual (bayar di
      // luar Midtrans) MDR dianggap nol; MDR baru diisi saat pembayaran lewat
      // Midtrans tercatat.
      const platformServiceFee = Math.round(totalAmount * PLATFORM_FEE_RATE);
      const midtransMdrFee = 0;
      const netTenantAmount = totalAmount - midtransMdrFee - platformServiceFee;

      const dpAmount = parseRupiah(formData.get("dpAmount"));
      if (dpAmount > totalAmount) {
        return { error: "DP tidak boleh melebihi total pesanan." };
      }
      const paymentStatus =
        dpAmount === 0
          ? "unpaid"
          : dpAmount >= totalAmount
            ? "fully_paid"
            : "dp_paid";

      const lengthCm = parseInt10(formData.get("lengthCm"), { min: 0 });
      const widthCm = parseInt10(formData.get("widthCm"), { min: 0 });
      const heightCm = parseInt10(formData.get("heightCm"), { min: 0 });

      const created = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            orderCode: generateOrderCode(),
            tenantId: actor.tenantId,
            source: "manual",
            customerName: requiredStr(formData, "customerName"),
            customerPhone: requiredStr(formData, "customerPhone"),
            customerAddress: requiredStr(formData, "customerAddress"),
            destinationCity: requiredStr(formData, "destinationCity"),
            itemsSubtotal,
            shippingFee,
            totalAmount,
            midtransMdrFee,
            platformServiceFee,
            netTenantAmount,
            dpAmount,
            paymentStatus,
            orderStatus: "pending_dp",
            notes: str(formData, "notes") || null,
          })
          .returning();

        await tx.insert(orderItems).values({
          orderId: order!.id,
          // productId sengaja null: pesanan ini di luar katalog standar.
          productName: itemName,
          customSpecs: {
            ...(lengthCm ? { lengthCm } : {}),
            ...(widthCm ? { widthCm } : {}),
            ...(heightCm ? { heightCm } : {}),
            ...(str(formData, "woodType") ? { woodType: str(formData, "woodType") } : {}),
            ...(str(formData, "finishingType")
              ? { finishingType: str(formData, "finishingType") }
              : {}),
            ...(str(formData, "specNotes") ? { notes: str(formData, "specNotes") } : {}),
          },
          price,
          quantity,
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
      const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);
      const orderId = requiredStr(formData, "orderId");
      const target = requiredStr(formData, "target") as OrderStatus;

      const [order] = await db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          orderStatus: orders.orderStatus,
          tenantId: orders.tenantId,
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
      const orderId = requiredStr(formData, "orderId");
      const carpenterId = str(formData, "carpenterId");

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

      // Tukang yang ditugaskan WAJIB dari tenant yang sama.
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
      const orderId = requiredStr(formData, "orderId");
      const mode = requiredStr(formData, "mode"); // "dp" | "lunas"

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
      const amount = mode === "lunas" ? total - dp : parseRupiah(formData.get("amount"));
      if (amount <= 0) return { error: "Nominal tidak valid." };

      const nextDp = dp + amount;
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
      const orderId = requiredStr(formData, "orderId");

      const [order] = await db
        .select({ id: orders.id, orderStatus: orders.orderStatus })
        .from(orders)
        .where(
          and(eq(orders.id, orderId), eq(orders.tenantId, actor.tenantId)),
        )
        .limit(1);
      if (!order) return { error: "Pesanan tidak ditemukan." };

      // Resi hanya relevan setelah barang siap dikirim.
      if (!(["ready_to_ship", "shipped", "completed"] as string[]).includes(order.orderStatus)) {
        return { error: "Resi hanya bisa diisi saat pesanan siap dikirim." };
      }

      await db
        .update(orders)
        .set({
          cargoName: str(formData, "cargoName") || null,
          trackingNumber: str(formData, "trackingNumber") || null,
        })
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
      const orderId = requiredStr(formData, "orderId");
      const stage = requiredStr(formData, "stage") as ProgressStage;
      const file = formData.get("photo");

      if (!(PROGRESS_STAGE_ORDER as readonly string[]).includes(stage)) {
        return { error: "Tahap produksi tidak valid." };
      }

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

      let photoUrl = str(formData, "photoUrl");
      if (file instanceof File && file.size > 0) {
        photoUrl = await uploadProductImage({
          tenantId: actor.tenantId,
          productSlug: `order-${order.orderCode}`,
          file,
        });
      }
      if (!photoUrl) return { error: "Foto progres wajib diunggah." };

      await db.insert(productionProgress).values({
        orderId,
        carpenterId: actor.role === "tukang" ? actor.userId : null,
        carpenterName: actor.fullName,
        stage,
        photoUrl,
        notes: str(formData, "notes") || null,
      });

      // Status pesanan mengikuti tahap yang baru diunggah. Aturan transisinya
      // tetap milik src/lib/order-status.ts, bukan diulang di sini.
      const target = STAGE_TO_ORDER_STATUS[stage];
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
