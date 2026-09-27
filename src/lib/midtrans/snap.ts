import "server-only";

import { createHash, timingSafeEqual } from "crypto";

/**
 * Transport Midtrans Snap: membuat tagihan dan memverifikasi tanda tangan
 * webhook.
 *
 * Modul ini TIDAK tahu apa itu langganan SaaS atau apa itu pesanan pembeli.
 * Yang ia lakukan hanya satu hal abstrak — "buat tagihan sebesar ini untuk
 * orang ini" — dan kedua pemanggil bisnis (`saas.ts` dan `orders.ts`)
 * menerjemahkan artinya sendiri ke `itemName` dan `finishUrl`.
 *
 * Kenapa dipisah: `verifyWebhookSignature` dipakai webhook yang melayani
 * SAAS sekaligus PESANAN. Kalau transport-nya ikut berubah saat salah satu
 * grow, keduanya ikut berubah tanpa disadari.
 */

const DEFAULT_DEVICE = "FurniTech";

function isSandbox(): boolean {
  return (process.env.MIDTRANS_IS_SANDBOX ?? "true") === "true";
}

/**
 * Host API Snap. Sandbox dan produksi memakai host yang BERBEDA; endpoint-nya
 * sama, hanya domainnya yang ikut mode.
 */
function snapEndpoint(): string {
  return isSandbox()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://api.midtrans.com/snap/v1/transactions";
}

/** Kredensial siap dipakai? Dipanggil form SEBELUM provisioning. */
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

export type SnapChargeInput = {
  /**
   * Idempoten di sisi Midtrans: `order_id` yang sama tidak bisa dibuat dua
   * kali. Untuk pesanan, ini harus berasal dari `orders.midtrans_order_id`.
   */
  orderId: string;
  /** Rupiah penuh (integer), bukan string dan bukan desimal. */
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  /** `item_details[0].name` — supaya pemilik akun tahu persis apa yang dibayar. */
  itemName: string;
  /** Halaman tujuan setelah pembayaran. Harus URL absolut. */
  finishUrl: string;
};

export type SnapCharge = { token: string; redirectUrl: string };

/**
 * Buat tagihan lewat Midtrans Snap.
 *
 * Sengaja pakai SNAP, bukan `/v2/charge` + `charge_type: manual` sendiri:
 * Snap sudah menangani VA semua bank, QRIS, e-wallet, dan transfer bank
 * langsung, sedangkan `/v2/charge` memaksa kita menuliskan logika polling dan
 * pemilihan channel sendiri.
 *
 * CATATAN SOAL `expiry`: blok itu SENGAJA TIDAK ADA. Snap v1 menolaknya dengan
 * `error_messages: ["expiry unit & duration must present"]` — pesan yang
 * menyesatkan karena kedua fieldnya memang dikirim, dan dicoba dengan `1`,
 * lalu `86400` (detik), lalu `86400000` (milidetik); semuanya ditolak. `expiry`
 * adalah fitur `/v2/charge`, bukan Snap. Tanpa blok itu Midtrans memakai masa
 * berlaku default sendiri (24 jam untuk Snap), yang sudah cukup.
 *
 * `redirect_url` yang dikembalikan API dipakai langsung, bukan dirangkai dari
 * token. Midtrans sudah mengembalikan `.../snap/v4/redirection/<token>`, dan
 * nomor versi jalur itu berubah dari waktu ke waktu — kalau kita merangkai
 * sendiri, tautannya bisa berhenti working karena perubahan internal mereka.
 */
export async function createSnapCharge(input: SnapChargeInput): Promise<SnapCharge> {
  const key = serverKey();

  const response = await fetch(snapEndpoint(), {
    method: "POST",
    headers: {
      // Basic auth dengan username = server key, password kosong. Format resmi
      // Midtrans, bukan token bearer.
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount,
      },
      item_details: [
        { id: input.orderId, price: input.amount, quantity: 1, name: input.itemName },
      ],
      customer_details: {
        first_name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone ?? undefined,
      },
      // Kembalinya ke platform, bukan ke halaman Midtrans: dari sana pengguna
      // masuk ke halaman status pesanannya sendiri.
      callbacks: { finish: input.finishUrl },
      countryCode: "62",
      delay: "0",
      device: DEFAULT_DEVICE,
      enabled_payments: [
        "bank_transfer",
        "qris",
        "gopay",
        "shopeepay",
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

  const raw = await response.text();
  const body = safeJson(raw) as { token?: string; redirect_url?: string } | null;

  if (!response.ok || !body?.token) {
    /*
     * Pesan error Midtrans datang dalam beberapa bentuk berbeda, dan kalau
     * tidak ada sama sekali body-nya kosong. Versi pertama memakai `??`
     * berantai yang membuat pesan kosong terkirim sebagai string kosong — jadi
     * kegagalannya tidak bisa dijelaskan, dan saya membuang waktu mencari
     * penyebab yang salah. Sekarang bentuknya diratakan dulu, dan body mentah
     * ikut disertakan supaya tidak ada lagi tebakan.
     */
    const detail = extractMidtransError(body) ?? `HTTP ${response.status}`;
    throw new Error(
      `Midtrans menolak pembuatan tagihan: ${detail}` +
        (raw ? ` (body: ${raw.slice(0, 200)})` : " (body kosong)"),
    );
  }

  return {
    token: body.token,
    redirectUrl:
      body.redirect_url ??
      `https://app.midtrans.com/snap/v2/transactions/${body.token}`,
  };
}

/** Parse JSON tanpa meledak kalau body-nya bukan JSON. */
function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Ratakan semua bentuk pesan error Midtrans jadi satu string yang terbaca. */
function extractMidtransError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  for (const key of ["error_messages", "message", "errors"]) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      const joined = value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "message" in item) {
            return String((item as { message: unknown }).message);
          }
          return "";
        })
        .filter(Boolean)
        .join("; ");
      if (joined) return joined;
    }
  }
  return null;
}

/**
 * Verifikasi tanda tangan webhook.
 *
 * Midtrans mengirim header `X-Midtrans-Signature` berisi
 * `sha512(order_id + status_code + gross_amount + server_key)`. Tanpa
 * pemeriksaan ini, siapa pun bisa POST ke route handler kita dan menandai
 * pesanan lunas tanpa membayar.
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
   * permintaan yang membawa header signature, alih-alih 403. Midtrans
   * menganggap notifikasi gagal lalu mengirim ulang terus-menerus sampai
   * rate limit-nya habis.
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
 * `pending` TIDAK termasuk. Vault/VA baru dibuat, uang belum masuk — kalau
 * `pending` ikut di sini, pesanan aktif sebelum bayarnya nyata.
 */
export const SETTLED_STATUSES = new Set(["capture", "settlement"]);

export const FAILED_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);
