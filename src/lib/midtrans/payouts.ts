import "server-only";

import { createHash } from "crypto";

import { FALLBACK_BANKS, type BankOption } from "@/lib/banks";

/**
 * Transport Midtrans Payouts (dulu IRIS).
 *
 * PERBEDAAN DARI CORE API YANG SERING TERLEWAT:
 * Payouts tidak memakai Server Key. Autentikasinya sepasang header:
 *
 *   iris-credential         = API key Payouts (MIDTRANS_IRIS_API_KEY)
 *   iris-idempotency-key    = kunci unik PER PERMINTAAN
 *
 * `iris-idempotency-key` adalah bagian yang paling menentukan. Tanpa itu,
 * atau dengan mengirim ulang nilai yang sama, permintaan itu dianggap RETRY
 * yang sah — bukan permintaan baru. Efeknya, payout ganda mustahil secara
 * struktural, bukan hanya karena kita menjaga idempotensi sendiri. Dan karena
 * itu kuncinya harus berasal dari isi permintaan yang sedang dikirim, bukan
 * dari `Date.now()`: kunci acak yang dibuat ulang tiap percobaan justru
 * MEMBATALIR jaminan tersebut.
 *
 * Bentuk respons di modul ini TIDAK diasumsikan aman. Semua pembacaan
 * defensif, dengan alasan yang tertulis di `docs/midtrans-fee.md` §11:
 * `MIDTRANS_IRIS_API_KEY` masih kosong, jadi belum ada satu pun respons
 * nyata yang pernah dilihat. Mengambil `body.data.account_name` tanpa
 * checking akan jadi bug yang baru ketahuan saat produksi — persis ketika
 * ada uang yang sedang dipindahkan.
 */

const PAYS_API_VERSION = "v2";

function isSandbox(): boolean {
  return (process.env.MIDTRANS_IS_SANDBOX ?? "true") === "true";
}

/** Host Payouts. Sandbox dan produksi memakai domain BERBEDA. */
function payoutsBaseUrl(): string {
  return isSandbox()
    ? `https://api.sandbox.midtrans.com/payouts/${PAYS_API_VERSION}`
    : `https://api.midtrans.com/payouts/${PAYS_API_VERSION}`;
}

/** Payouts sudah bisa dipanggil? Form yang memanggilnya wajib mengecek ini. */
export function isPayoutsConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_IRIS_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.MIDTRANS_IRIS_API_KEY?.trim();
  if (!key) {
    throw new PayoutsNotConfiguredError();
  }
  return key;
}

/**
 * "Payouts belum dikonfigurasi" adalah kondisi yang KNOWN, bukan error.
 *
 * Dipisah dari error biasa karena konsekuensinya berbeda total: kegagalan
 * saat memanggil API berarti rekening pengrajin mungkin salah dan harus
 * diperiksa, sedangkan key yang kosong berarti kita belum cascade berfungsi
 * sama sekali dan tidak ada yang perlu diperiksa. Menyamakan keduanya
 * membuat pesan "rekening Anda salah" muncul ke pengrajin padahal yang
 * salah konfigurasi server kita.
 */
export class PayoutsNotConfiguredError extends Error {
  constructor() {
    super(
      "Verifikasi rekening belum bisa dijalankan: kredensial Payouts FurniTech belum diisi.",
    );
    this.name = "PayoutsNotConfiguredError";
  }
}

export type PayoutsFailure = {
  ok: false;
  /**
   * Pesan untuk ditampilkan ke pengrajin, dalam bahasa manusia.
   *
   * Midtrans mengembalikan pesan dalam bahasa Inggris yang sering tidak
   * menjelaskan apa yang harus diperbaiki ("invalid account number").
   * `friendlyAccountError` menerjemahkan pola yang umum; sisanya
   * diteruskan apa adanya, karena pesan teknis yang tidak dip apprentices
   * lebih jujur daripada tebakan yang salah.
   */
  message: string;
  /** Kode dari layanan, untuk keperluan debugging. Boleh null. */
  serviceCode: string | null;
};

export type AccountValidationSuccess = {
  ok: true;
  /** Nama pemilik rekening SEPERTI TERTULIS DI BANK. */
  accountName: string;
  /** Nomor rekening yang mem-normalized, seperti yang kami kirim. */
  accountNumber: string;
};

export type AccountValidationResult =
  | AccountValidationSuccess
  | PayoutsFailure;

async function callPayouts<T>(
  path: string,
  body: unknown,
  /**
   * Idempotency key. WAJIB untuk setiap permintaan yang mengubah state
   * (validasi rekening, beneficiaries, payouts). Isi dari `path` +
   * `JSON.stringify(body)` supaya dua permintaan dengan isi sama dianggap
   * retry oleh layanan, bukan dua permintaan terpisah.
   */
  idempotencyKey: string,
): Promise<{ status: number; data: T | null; raw: string }> {
  const key = apiKey();

  const res = await fetch(`${payoutsBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      // Auth Payouts: BUKAN `Authorization`, dan BUKAN Server Key.
      Accept: "application/json",
      "Content-Type": "application/json",
      "iris-credential": key,
      "iris-idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await res.text();
  let data: T | null = null;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    // Bentuk respons tidak dijamin dan layanan memang bisa membalas HTML
    // saat konfigurasi salah. `raw` dikembalikan supaya pemanggil bisa
    // menyertakan konteksnya di log tanpa pernah menampilkannya ke user.
    data = null;
  }

  return { status: res.status, data, raw };
}

/**
 * Idempotency key dari isi permintaan.
 *
 * SHA-256, bukan `Math.random()` dan bukan `Date.now()`. Alasan yang sama
 * seperti di atas: kunci yang berubah pada setiap percobaan membuat
 * percobaan ulang menjadi permintaan BARU, yang persis hal yang harus
 * dicegah. Dan karena isi permintaan ikut masuk hash, dua permintaan dengan
 * isi berbeda tidak pernah saling menimpa.
 */
function idempotencyKeyFor(path: string, body: unknown): string {
  return createHash("sha256")
    .update(`${path}|${JSON.stringify(body)}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * `POST /account_validation` — apakah rekening ini ada dan siapa pemiliknya.
 *
 * Mengembalikan nama pemilik rekening, BUKAN boolean. Nama itu yang
 * dibandingkan dengan nama yang diketik pengrajin, dan membandingkan boolean
 * saja berarti kita tidak pernah tahu rekeningnya milik orang yang salah —
 * yang justru kesalahan yang paling mahal di sini, karena rekening itu akan
 * DITAMPILKAN ke pembeli.
 */
export async function validateBankAccount(input: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}): Promise<AccountValidationResult> {
  const body = {
    bank_code: input.bankCode,
    account_number: input.accountNumber,
    account_name: input.accountName,
  };

  const { status, data, raw } = await callPayouts(
    "/account_validation",
    body,
    idempotencyKeyFor("/account_validation", body),
  );

  if (status >= 400 || !data) {
    return {
      ok: false,
      message: friendlyAccountError(status, data as never, raw),
      serviceCode: extractServiceCode(data),
    };
  }

  /*
   * Bentuk respons BELUM pernah dilihat — `MIDTRANS_IRIS_API_KEY` masih kosong.
   * Jadi nama pemilik dibaca dari beberapa tempat sekaligus, dan kalau
   * semuanya kosong, hasilnya adalah KEGAGALAN, bukan "terverifikasi tanpa
   * nama".
   *
   * Itu perbedaan yang menentukan: menganggap rekening terverifikasi tanpa
   * nama pemilik berarti kita meloloskan rekening milik orang lain hanya
   * karena layanan tidak mengirim field yang kita kira ada.
   */
  const accountName = readAccountName(data);
  if (!accountName) {
    return {
      ok: false,
      message:
        "Layanan verifikasi membalas tanpa nama pemilik rekening. Rekening belum dianggap terverifikasi — coba lagi nanti.",
      serviceCode: extractServiceCode(data),
    };
  }

  return {
    ok: true,
    accountName,
    accountNumber: input.accountNumber,
  };
}

/**
 * Baca nama pemilik rekening dari respons, tanpa mengasumsikan satu bentuk.
 *
 * Bentuk yang dicoba, berurutan: `data.account_name`, lalu
 * `data.account_holders[0].name`, lalu `account_name` di level teratas.
 * Dua yang pertama mengikuti bentuk yang didokumentasikan, yang ketiga
 *ighbours biaya when layanan mengembalikan bentuk lain. Menebak satu path
 * saja akan jadi bug produksi yang tidak muncul di testing.
 */
function readAccountName(data: unknown): string | null {
  const root = asRecord(data);
  if (!root) return null;

  const inner = asRecord(root.data);
  const candidates = [
    inner?.account_name,
    Array.isArray(inner?.account_holders)
      ? asRecord((inner.account_holders as unknown[])[0])?.name
      : undefined,
    root.account_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim();
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function extractServiceCode(data: unknown): string | null {
  const root = asRecord(data);
  const code = root?.error_code ?? root?.code;
  return typeof code === "string" || typeof code === "number"
    ? String(code)
    : null;
}

/**
 * Terjemahkan kegagalan yang paling sering terjadi.
 *
 * Peta ini disengaja dan PENDUK. Midtrans mengembalikan pesan teknis yang
 * tidak selalu menyebut penyebabnya, jadi "account number is invalid" bisa
 * berarti nomor salah ATAU rekening tidak ada di bank itu. Kami tidak
 * menebak di antara keduanya — pesan di bawah menyebut keduanya, dan
 * penyesuaian dari pengrajin.
 *
 * Pola yang tidak ada di sini diteruskan apa adanya, utamakan pasif: pesan
 * teknis yang tidak diterjemahkan lebih jujur daripada penjelasan yang
 * mungkin salah.
 */
function friendlyAccountError(
  status: number,
  data: unknown,
  raw: string,
): string {
  const root = asRecord(data);
  const inner = asRecord(root?.data);
  const serviceMessage = [
    root?.error_message,
    inner?.error_message,
    root?.message,
  ].find((v): v is string => typeof v === "string");

  const haystack = (serviceMessage ?? raw).toLowerCase();

  if (status === 401 || status === 403) {
    return "Verifikasi rekening ditolak karena kredensial layanan. Hubungi FurniTech.";
  }
  if (haystack.includes("account number") || haystack.includes("account_number")) {
    return "Nomor rekening tidak dikenali bank. Periksa kembali nomor dan bank yang dipilih.";
  }
  if (haystack.includes("account name") || haystack.includes("account_name")) {
    return "Nama pemilik rekening tidak cocok dengan yang tercatat di bank.";
  }
  if (haystack.includes("bank code") || haystack.includes("bank_code")) {
    return "Bank tersebut belum didukung untuk pencairan. Pilih bank lain.";
  }
  if (status === 429) {
    return "Layanan sedang terlalu banyak permintaan. Coba lagi beberapa saat lagi.";
  }
  if (status >= 500) {
    return "Layanan verifikasi sedang gangguan. Rekening Anda tetap tersimpan — coba verifikasi lagi nanti.";
  }
  return serviceMessage ?? "Rekening tidak bisa diverifikasi. Coba lagi nanti.";
}

/**
 * `GET /beneficiary_banks` — daftar bank yang benar-benar didukung.
 *
 * Sengaja memakai fetch langsung dan bukan `callPayouts`, karena ini
 * endpoint yang hanya membaca dan TIDAK butuh idempotency key.
 */
export async function listBeneficiaryBanks(): Promise<BankOption[] | null> {
  if (!isPayoutsConfigured()) return null;

  const res = await fetch(`${payoutsBaseUrl()}/beneficiary_banks`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "iris-credential": apiKey(),
    },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const root = asRecord(parsed);
  const list = Array.isArray(root?.data)
    ? (root.data as unknown[])
    : Array.isArray(parsed)
      ? (parsed as unknown[])
      : [];

  const options: BankOption[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const code = row?.bank_code ?? row?.code;
    const name = row?.bank_name ?? row?.name;
    if (typeof code === "string" && typeof name === "string") {
      options.push({ code, label: name });
    }
  }
  return options.length > 0 ? options : null;
}

/**
 * Daftar bank untuk form: respons layanan kalau ada, daftar cadangan kalau
 * tidak.
 *
 * Tidak pernah melempar error. Form rekening harus tetap bisa dibuka kalau
 * Payouts sedang mati — justru karena pengrajin butuh melihat rekeningnya yang
 * sekarang untuk membandingkan dengan buku banknya, dan halaman yang gagal
 * dibuka tidak membantu apa pun.
 */
export async function loadBankOptions(): Promise<{
  options: readonly BankOption[];
  /** True kalau daftar ini berasal dari Midtrans, bukan dari cadangan. */
  fromService: boolean;
}> {
  try {
    const service = await listBeneficiaryBanks();
    if (service) return { options: service, fromService: true };
  } catch {
    // Lihat catatan di atas: halaman harus tetap terbuka.
  }
  return { options: FALLBACK_BANKS, fromService: false };
}

/**
 * Bandingkan daftar cadangan dengan daftar dari layanan.
 *
 * Hanya dipakai sekali, sebelum produksi, sebagai langkah verifikasi yang
 * tertulis di catatan `src/lib/banks.ts`. Sengaja berupa fungsi, bukan
 * bagian dari alur runtime: yang perlu di sini adalah laporan, bukan
 * pemeriksaan yang diam-diam mengganti daftar di tengah aplikasi
 * berjalan.
 */
export function verifyBankCodesAgainstMidtrans(
  serviceOptions: readonly BankOption[],
): { missing: string[]; unknown: string[] } {
  const serviceCodes = new Set(serviceOptions.map((o) => o.code.toLowerCase()));
  return {
    missing: [...serviceCodes].filter(
      (code) => !FALLBACK_BANKS.some((b) => b.code === code),
    ),
    unknown: FALLBACK_BANKS.filter((b) => !serviceCodes.has(b.code)).map(
      (b) => b.code,
    ),
  };
}
