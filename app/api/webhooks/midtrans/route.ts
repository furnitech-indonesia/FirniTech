import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { integrationAuditLogs, saasInvoices, tenants } from "@/db/schema";
import {
  FAILED_STATUSES,
  SETTLED_STATUSES,
  verifyWebhookSignature,
} from "@/lib/midtrans/saas";

/**
 * Webhook Midtrans — satu-satunya jalan yang mengaktifkan tenant.
 *
 * Kenapa ini Route Handler dan bukan Server Action: Midtrans memanggilnya
 * lewat HTTP dari luar, tanpa sesi, tanpa cookie, dan tanpa header browser.
 * Server Action tidak cocok untuk itu — pemanggilnya harus bisa membawa
 * request POST kosong ke endpoint yang tidak dia browsing.
 *
 * TIGA aturan yang tidak boleh dilanggar di sini:
 *
 * 1. Signature WAJIB diverifikasi lebih dulu. Tanpa itu, siapa pun bisa
 *    POST body `{"transaction_status":"settlement"}` dan mengaktifkan
 *    tenant tanpa membayar. `X-Midtrans-Signature` =
 *    sha512(order_id + status_code + gross_amount + server_key).
 *
 * 2. `pending` BUKAN berarti sukses. Status itu berarti VA atau QR sudah
 *    dibuat tapi uang belum masuk. Mengaktifkannya di sini membuat seluruh
 *    prinsip "tanpa free trial" jadi tidak berarti: orang bisa mengambil
 *    invoice, tidak pernah membayar, lalu langsung masuk back-office.
 *
 * 3. WAJIB idempoten. Midtrans mengirim notifikasi yang sama berulang kali
 *    (retry saat responsnya lambat, atau saat tombol "cek status" ditekan
 *    pengguna). Handler ini boleh dijalankan berkali-kali dengan hasil sama.
 */

export const runtime = "nodejs";
/** Route Handler tidak boleh di-cache sama sekali. */
export const dynamic = "force-dynamic";

type MidtransNotification = {
  order_id?: string;
  transaction_status?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_id?: string;
  fraud_status?: string;
};

export async function POST(request: Request) {
  let body: MidtransNotification;
  try {
    body = (await request.json()) as MidtransNotification;
  } catch {
    // Body bukan JSON. Midtrans tidak akan mengirim begini, jadi ini bukan
    // error server kita — 400 cukup, jangan catat sebagai audit.
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const orderId = body.order_id ?? "";
  const statusCode = body.status_code ?? "";
  const grossAmount = body.gross_amount ?? "";

  // 1. Signature, sebelum APA PUN yang lain.
  const valid = verifyWebhookSignature({
    orderId,
    statusCode,
    grossAmount,
    signature: request.headers.get("x-midtrans-signature"),
  });

  if (!valid) {
    // 403, dan TANPA memberi tahu apakah order_id-nya ada. Membalas
    // "invoice tidak ditemukan" untuk request bertanda tangan tidak sah
    // adalah enumeration gratis.
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const status = body.transaction_status ?? "";
  const settled = SETTLED_STATUSES.has(status);
  const failed = FAILED_STATUSES.has(status);

  // Dicocokkan lewat order_id; nominal diperiksa terpisah di bawah. Kalau
  // kedua syaratnya digabung dalam satu query, kita tidak bisa membedakan
  // "order ini bukan milik kita" dari "nominalnya dipalsukan", dan audit log
  // untuk kasus kedua justru yang paling perlu disimpan.
  const [invoice] = await db
    .select()
    .from(saasInvoices)
    .where(eq(saasInvoices.midtransOrderId, orderId))
    .limit(1);

  if (!invoice) {
    // Signature valid tapi invoice tidak ada: order_id yang tidak kita buat.
    // Catat agar terlihat di audit, lalu jawab 200 — kalau 404, Midtrans
    // akan retry terus-menerus untuk order yang memang tidak milik kita.
    console.warn("Webhook Midtrans untuk order_id yang tidak dikenal:", orderId);
    return NextResponse.json({ ok: true });
  }

  if (Number.isNaN(Number(grossAmount)) || Number(grossAmount) !== invoice.amount) {
    await db.insert(integrationAuditLogs).values({
      tenantId: invoice.tenantId,
      service: "midtrans",
      action: "notification",
      status: "failed",
      requestMeta: { orderId, status, grossAmount },
      errorMessage: "Nominal pada notifikasi tidak sama dengan tagihan.",
    });
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  // 3. Idempoten: sudah lunas, tidak ada yang perlu diubah.
  if (invoice.status === "paid" && settled) {
    return NextResponse.json({ ok: true, already: true });
  }

  if (settled) {
    // `periodEnd` sudah dihitung saat pendaftaran. Memakainya kembali membuat
    // tagihan yang dibayar terlambat tidak mempanaskan langganan lebih lama
    // dari yang sudah dibayar.
    const [updated] = await db
      .update(saasInvoices)
      .set({
        status: "paid",
        transactionId: body.transaction_id ?? null,
        paidAt: new Date(),
      })
      .where(eq(saasInvoices.midtransOrderId, orderId))
      .returning({ tenantId: saasInvoices.tenantId });

    if (updated) {
      await db
        .update(tenants)
        .set({
          subscriptionStatus: "active",
          // Satu-satunya tempat `isActive` dinyalakan untuk tenant baru.
          isActive: true,
          subscriptionExpiresAt: new Date(
            `${invoice.periodEnd}T00:00:00.000Z`,
          ),
        })
        .where(eq(tenants.id, updated.tenantId));
    }
  } else if (failed) {
    // Gagal bayar TIDAK menghapus tenant: tagihannya masih bisa dicoba lagi,
    // dan menghapusnya akan membuang riwayat di `saas_invoices` yang justru
    // dibutuhkan untuk MRR.
    await db
      .update(saasInvoices)
      .set({ status: "failed" })
      .where(eq(saasInvoices.midtransOrderId, orderId));
  }

  await db.insert(integrationAuditLogs).values({
    tenantId: invoice.tenantId,
    service: "midtrans",
    action: "saas_payment_notification",
    status: settled || failed ? "success" : "failed",
    requestMeta: { orderId, status, transactionId: body.transaction_id ?? null },
  });

  // Selalu 200 setelah signature lolos. Status non-2xx membuat Midtrans
  // mengirim ulang notifikasi yang sama berulang kali.
  return NextResponse.json({ ok: true });
}
