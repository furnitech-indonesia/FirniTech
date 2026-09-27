import "server-only";

import { createHash, timingSafeEqual } from "crypto";

/**
 * Integrasi Midtrans Core untuk tagihan langganan SaaS (ROADMAP Sprint 2,
 * dikerjakan di Sprint 10 Fase D langkah 4).
 *
 * Dipakai untuk DUA hal yang terpisah dan tidak boleh dicampur:
 *   1. `createSaasCharge()` — membuat tagihan pertama saat pendaftaran.
 *   2. `verifyWebhookSignature()` — route handler memverifikasi callback
 *      dari Midtrans sebelum menaikkan status tenant.
 *
 * PENTING soal kredensial:
 * - Server key hanya boleh dipakai di server. File ini `server-only`.
 * - Client key tidak dipakai sama sekali untuk alur ini. Kita mengarahkan
 *   pengguna ke halaman Snap milik Midtrans, jadi popup Snap JS tidak perlu.
 *   Jangan menambahkan `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` hanya karena ada di
 *   PRD — menambah kunci publishable yang tidak dipakai justru memperluas
 *   permukaan kebocoran.
 * - Kredensial BELUM diisi di repo ini (`MIDTRANS_SERVER_KEY` kosong), jadi
 *   `isMidtransConfigured()` mengembalikan false dan wizard pendaftaran
 *   berhenti sebelum menulis apa pun ke database. Begitu kredensial asli
 *   diisi, tidak ada perubahan kode lagi yang perlu.
 */

function isSandbox(): boolean {
  return (process.env.MIDTRANS_IS_SANDBOX ?? "true") === "true";
}

/** Host API Snap: production di api.midtrans.com, sandbox di app.midtrans.com. */
function snapEndpoint(): string {
  return isSandbox()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://api.midtrans.com/snap/v1/transactions";
}

/**
 * Halaman pembayaran. Sama untuk sandbox dan production — `app.midtrans.com`
 * melayani keduanya, hanya API pembuatan tagihan yang berbeda host.
 */
function snapRedirectUrl(token: string): string {
  return `https://app.midtrans.com/snap/v2/transactions/${token}`;
}

/** Kredensial siap dipakai? Dipanggil wizard SEBELUM provisioning. */
export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY?.trim());
}

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum diset. Isi .env terlebih dahulu sebelum mengaktifkan pembayaran.",
    );
  }
  return key;
}

export type SaasChargeInput = {
  /** Idempoten di sisi Midtrans: order_id yang sama tidak bisa dibuat dua kali. */
  orderId: string;
  /** Rupiah penuh (integer), bukan string dan bukan desimal. */
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  /** Dipakai sebagai `item_details[0].name` supaya pemilik akun tahu apa yang dibayar. */
  itemName: string;
  /** URL tenant setelah pembayaran sukses; Midtrans mengembalikannya ke sini. */
  finishUrl: string;
};

export type SaasCharge = {
  token: string;
  redirectUrl: string;
};

/**
 * Buat tagihan langganan dan kembalikan URL halaman pembayaran.
 *
 * Sengaja pakai SNAP, bukan `/v2/charge` + `charge_type: manual` sendiri:
 * Snap sudah menangani VA semua bank, QRIS, e-wallet, dan transfer bank
 * langsung, sedangkan `/v2/charge` memaksa kita menuliskan logika expiry,
 * polling, dan pemilihan channel sendiri. Yang kita butuhkan dari pembayaran
 * Yang kita butuhkan dari pembayaran langganan hanyalah satu tombol "Bayar"
 * yang setelahnya akun aktif — Snap memberi itu dengan satu POST.
 */
export async function createSaasCharge(
  input: SaasChargeInput,
): Promise<SaasCharge> {
  const key = serverKey();

  const response = await fetch(snapEndpoint(), {
    method: "POST",
    headers: {
      // Basic auth dengan username = server key, password kosong. Ini format
      // resmi Midtrans, bukan token bearer.
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        // Midtransegy perlu angka, dan dalam rupiah penuh tanpa desimal.
        gross_amount: input.amount,
      },
      item_details: [
        {
          id: input.orderId,
          price: input.amount,
          quantity: 1,
          name: input.itemName,
        },
      ],
      customer_details: {
        first_name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone ?? undefined,
      },
      // Kembalinya ke platform, bukan ke halaman Midtrans: dari sana pengguna
      // masuk ke back-office tenant-nya.
      callbacks: {
        finish: input.finishUrl,
      },
      // Masa berlaku tagihan. Tanpa ini, tagihan menggantung di status
      // `pending` selamanya dan tidak pernah masuk ke audit pembayaran gagal.
      expiry: {
        unit: "day",
        expiry_duration: 1,
      },
      // Tanpa free trial (PRD §2.A), jadi tidak ada `start_duration` yang
      // menunda penagihan berikutnya.
      enabled_payments: [
        "bank_transfer",
        "qris",
        "gopay",
        "shopeepay",
        "ova",
        "credit_card",
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "cimb_va",
      ],
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as {
    token?: string;
    message?: string | string[];
    error_messages?: { code: string; message: string }[];
  } | null;

  if (!response.ok || !body?.token) {
    const detail =
      body?.error_messages?.map((e) => e.message).join("; ") ??
      (Array.isArray(body?.message) ? body?.message.join("; ") : body?.message) ??
      `HTTP ${response.status}`;
    throw new Error(`Midtrans menolak pembuatan tagihan: ${detail}`);
  }

  return { token: body.token, redirectUrl: snapRedirectUrl(body.token) };
}

/**
 * Verifikasi tanda tangan webhook.
 *
 * Midtrans mengirim header `X-Midtrans-Signature` berisi
 * `sha512(order_id + status_code + gross_amount + server_key)`. Tanpa
 * pemeriksaan ini, siapa pun bisa POST ke route handler kita dan
 * mengaktifkan tenant tanpa membayar.
 *
 * Perbandingan memakai `timingSafeEqual` — `===` membocorkan selisih byte
 * pertama, dan itu cukup untuk menebak signature satu per satu.
 */
export function verifyWebhookSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signature: string | null;
}): boolean {
  if (!params.signature) return false;

  /*
   * Server key kosong berarti verifikasi TIDAK BISA dilakukan, dan itu sama
   * dengan gagal.
   *
   * Fungsi ini sengaja tidak melempar error. `serverKey()` melempar, dan itu
   * benar untuk jalur pembuatan tagihan, tapi untuk webhook hal yang terjadi
   * adalah: server yang kredensialnya belum diisi membalas 500 ke setiap
   * permintaan yang membawa header signature, alih-alih 403. Dua akibat:
   *   - Row handler-nya crash, bukan menolak.
   *   - Midtrans menganggap notifikasi gagal dan mengirim ulang terus
   *     sampai rate limit-nya habis.
   * Memverifikasi tanpa kunci sama sekali tidak mungkin, jadi `false` adalah
   * satu-satunya jawaban yang benar.
   */
  if (!process.env.MIDTRANS_SERVER_KEY?.trim()) {
    console.error(
      "Webhook Midtrans diterima padahal MIDTRANS_SERVER_KEY belum diset — verifikasi dilewati.",
    );
    return false;
  }

  const expected = createHash("sha512")
    .update(
      `${params.orderId}${params.statusCode}${params.grossAmount}${serverKey()}`,
    )
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * Status transaksi yang berarti uang sudah benar-benar masuk.
 *
 * `pending` sengaja TIDAK termasuk. Vault atau VA baru dibuat, uang belum
 * masuk — kalau `pending` ikut di sini, tenant aktif sebelum bayarnya masuk,
 * dan prinsip "tanpa free trial" jadi tidak berarti.
 */
export const SETTLED_STATUSES = new Set(["capture", "settlement"]);

export const FAILED_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);
