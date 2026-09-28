import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  deliveryProofs,
  orders,
  payoutItems,
  payoutLogs,
  tenantBankAccounts,
} from "@/db/schema";
import { FEE_PENCAIRAN, craftsmanCreditForWithRate } from "@/lib/fees";
import { effectivePlatformFeeRate } from "@/lib/platform-settings";
import {
  isPayoutsConfigured,
  PayoutsNotConfiguredError,
  sendPayout,
} from "@/lib/midtrans/payouts";

/**
 * Mesin pencairan (Sprint 6).
 *
 * ATURAN YANG TIDAK BISA DIBAHAS: satu pesanan hanya boleh masuk payout
 * SATU KALI, selamanya. Yang menjaganya bukan kode di sini, tapi UNIQUE pada
 * `payout_items.order_id` — jadi `runPayout` tetap aman meski dipanggil dua
 * kali bersamaan, dan aman meski dipanggil dari cron, webhook, dan klik
 * tombol di saat yang sama.
 *
 * MENGAPA PESANAN DIKUMPULKAN, BUKAN DICAIRKAN SATU PER SATU:
 * fee pencairan Rp 5.550 dibebankan per PENERIMA, jadi menggabungkan sepuluh
 * pesanan jadi satu payout memotong sepuluh fee jadi satu. Pengrajin yang
 * menanggung fee itu, jadi FurniTech tidak berbohong saat mengambil keputusan itu.
 *
 * KAPAN DIPANGGIL: dua tempat, dan keduanya ke fungsi yang sama —
 *   1. otomatis, setelah bukti penerimaan tersimpan;
 *   2. manual oleh owner dari halaman pencairan, untuk mencoba ulang yang
 *      gagal atau yang diblokir.
 * Tidak ada jalan ketiga, dan tidak ada parameter dari klien yang bisa
 * memengaruhi perhitungan.
 */

/** Alasan pencairan tidak dikirim. Masing-masing butuh tindakan berbeda. */
export type PayoutBlockReason =
  | "no_bank_account"
  | "bank_account_unverified"
  | "nothing_to_payout"
  | "balance_below_fee"
  | "payouts_not_configured";

export const PAYOUT_BLOCK_MESSAGES: Record<PayoutBlockReason, string> = {
  no_bank_account:
    "Rekening pencairan belum diisi. Isi di Pengaturan → Rekening pencairan.",
  bank_account_unverified:
    "Rekening pencairan belum terverifikasi. Verifikasi dulu di Pengaturan → Rekening pencairan.",
  nothing_to_payout:
    "Tidak ada pesanan lunas yang sudah diterima barangnya dan belum dicairkan.",
  balance_below_fee:
    "Saldo belum cukup untuk menutup fee pencairan Rp 5.550, jadi tidak ada yang bisa dikirim.",
  payouts_not_configured:
    "Layanan pencairan FurniTech belum dikonfigurasi, jadi pencairan belum bisa dijalankan.",
};

export type PayoutCandidate = {
  orderId: string;
  orderCode: string;
  /** Kredit ke saldo untuk pesanan ini, SEBELUM fee pencairan. */
  credit: number;
  deliveryProofId: string | null;
};

export type PayoutPreview = {
  candidates: PayoutCandidate[];
  /** Jumlah kredit, sebelum fee. */
  gross: number;
  /** Fee pencairan, satu kali per penerima. */
  fee: number;
  /** Yang benar-benar ditransfer. */
  net: number;
};

export type PayoutOutcome =
  | { ok: true; payoutId: string; amount: number; orderCount: number; alreadySent: boolean }
  | { ok: false; reason: PayoutBlockReason }
  | { ok: false; reason: "service_error"; message: string; payoutId: string | null };

/**
 * Pesanan yang layak dicairkan untuk satu tenant.
 *
 * EMPAT SYARAT, dan semuanya wajib:
 *
 *  1. `payment_method = 'va'`. Pesanan COD TIDAK PERNAH ikut payout — uangnya
 *     sudah diterima kurir atau ditransfer langsung ke rekening pengrajin,
 *     jadi membayarnya lagi berarti membayar dua kali.
 *  2. `payment_status = 'fully_paid'`. Bukan `dp_paid`: uang yang baru DP
 *     belum sampai. `net_tenant_amount` sengaja tidak dipakai sebagai
 *     gantinya, supaya keadaan yang tercatat (apakah uang benar-benar masuk)
 *     yang menentukan, bukan angka hasil hitungan.
 *  3. Punya bukti penerimaan. Ini pemicunya, dan dicek lewat
 *     `EXISTS` — bukan lewat `order_status = 'completed'`, karena status itu
 *     bisa diubah manual oleh owner lewat UI transisi biasa, sedangkan bukti
 *     tidak bisa diubah siapa pun.
 *  4. Belum masuk payout manapun. Dicek `NOT EXISTS` terhadap `payout_items`,
 *     bukan lewat status pesanan — supaya pesanan yang payout-nya gagal
 *     tidak ikut tercairkan dua kali.
 */
async function findCandidates(tenantId: string): Promise<PayoutCandidate[]> {
  /*
   * Tarifnya dibaca SEKALI per panggilan, bukan per pesanan.
   *
   * `effectivePlatformFeeRate()` melakukan satu query, dan mengulanginya di dalam
   * loop berarti N query untuk hasil yang sama — dan, lebih buruk,
   * kalau tarifnya diubah di tengah iterasi, pesanan dalam satu payout bisa
   * dapat tarif yang berbeda. Satu batch, satu tarif.
   */
  const rate = await effectivePlatformFeeRate();

  const rows = await db
    .select({
      orderId: orders.id,
      orderCode: orders.orderCode,
      totalAmount: orders.totalAmount,
      deliveryProofId: deliveryProofs.id,
    })
    .from(orders)
    .innerJoin(deliveryProofs, eq(deliveryProofs.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.paymentMethod, "va"),
        eq(orders.paymentStatus, "fully_paid"),
        // NOT EXISTS (payout_items) ditulis sebagai subquery, bukan
        // `leftJoin(deliveryProofs, isNull(payoutItems.id))`.
        //
        // Bentuk join itu setara secara hasil, tapi tidak secara kesalahan:
        // ia mudah ditulis dengan filter yang salah — `and(isNull(...))` vs
        // `or(isNull(...))` — dan salah di situ berarti pencairan ganda.
        // Subquery tidak punya ambiguitas itu, jadi yang ditulis di sini
        // persis yang dimaksud.
        sql`not exists (select 1 from payout_items pi where pi.order_id = ${orders.id})`,
      ),
    )
    .orderBy(orders.createdAt);

  return rows.map((row) => ({
    orderId: row.orderId,
    orderCode: row.orderCode,
    credit: craftsmanCreditForWithRate(Number(row.totalAmount), rate),
    deliveryProofId: row.deliveryProofId,
  }));
}

/**
 * Hitung apa yang akan dikirim, tanpa mengirim apa pun.
 *
 * Terpisah dari `runPayout` supaya halaman owner bisa menampilkan angkanya
 * sebelum ada tombol ditekan, dan supaya test bisa memeriksa aritmetikanya
 * tanpa memanggil layanan.
 */
export async function previewPayout(tenantId: string): Promise<PayoutPreview> {
  const candidates = await findCandidates(tenantId);
  const gross = candidates.reduce((sum, c) => sum + c.credit, 0);
  const fee = candidates.length > 0 ? FEE_PENCAIRAN : 0;
  return { candidates, gross, fee, net: gross - fee };
}

/**
 * Jalankan pencairan untuk satu tenant.
 *
 * URUTANNYA PENTING dan tidak boleh diubah:
 *   1. cek rekening terverifikasi,
 *   2. kumpulkan kandidat,
 *   3. tulis `payout_logs` + `payout_items` (status `queued`),
 *   4. baru panggil Payouts,
 *   5. perbarui statusnya.
 *
 * Baris dibuat SEBELUM panggilan, bukan sesudah. Kalau urutannya dibalik
 * dan prosesnya mati di tengah, tidak ada jejak bahwa pencairan pernah
 * dicoba — dan hari berikutnya pesanan yang sama akan dicoba lagi tanpa
 * ada yang menyadarinya sudah pernah dikirim Separuh jalan.
 *
 * `payout_items` ditulis DULUAN, sebelum `POST /payouts`. Itu yang membuat
 * UNIQUE(order_id) bekerja sebagai pengaman: kalau proses mati setelah item
 * ditulis tapi sebelum panggilan, percobaan berikutnya tidak akan
 * mengambil item itu lagi.
 */
export async function runPayout(tenantId: string): Promise<PayoutOutcome> {
  const [bank] = await db
    .select()
    .from(tenantBankAccounts)
    .where(eq(tenantBankAccounts.tenantId, tenantId))
    .limit(1);

  if (!bank) return { ok: false, reason: "no_bank_account" };

  /*
   * Rekening WAJIB terverifikasi, bukan sekadar ada.
   *
   * Verifikasi bukan formalitas administratif: nomor rekening ini juga DITAMPILKAN ke
   * pembeli pada COD transfer bank, dan payout memakai nomor yang sama. Jadi
   * kalau rekeningnya salah, kerugiannya ada di dua tempat sekaligus — dan
   * keduanya baru ketahuan jauh setelah uangnya salah tempat.
   */
  if (bank.status !== "verified") {
    return { ok: false, reason: "bank_account_unverified" };
  }

  const preview = await previewPayout(tenantId);
  if (preview.candidates.length === 0) {
    return { ok: false, reason: "nothing_to_payout" };
  }

  /*
   * Saldo harus lebih besar dari fee, BUKAN lebih besar dari nol.
   *
   * Tanpa cek ini, `net` bisa negatif dan `POST /payouts` akan menolak
   * permintaannya dengan pesan yang tidak menjelaskan apa pun. Yang lebih
   * penting: satu pesanan murah tidak bisa menghasilkan pencairan negatif
   * yang berarti pengrajin owes FurniTech, dan `payout_amount_matches_items`
   * akan menolaknya dengan error constraint — bukan dengan pesan yang bisa
   * dibaca.
   */
  if (preview.net <= 0) {
    return { ok: false, reason: "balance_below_fee" };
  }

  /*
   * Pengecekan konfigurasi Payouts dilakukan DI SINI, bukan di paling atas.
   *
   * Alasannya urutan: dari lima alasan penolakan, empat di antaranya adalah
   * fakta tentang TOKO INI yang tidak akan berubah karena kita menghidrasi
   * kredensial. Kalau "belum dikonfigurasi" dicek lebih dulu, maka selama
   * `MIDTRANS_IRIS_API_KEY` kosong setiap penolakan akan dilaporkan sebagai
   * "layanan belum dikonfigurasi" — termasuk yang sebenarnya "saldo belum
   * cukup" atau "rekening belum terverifikasi". Owner akan menyelesaikan
   * masalah yang salah, dan `balance_below_fee` hanya akan hidup sebagai
   * kode yang tidak pernah dieksekusi.
   */
  if (!isPayoutsConfigured()) {
    return { ok: false, reason: "payouts_not_configured" };
  }

  // 3. Catat dulu, panggil setelahnya.
  const [payout] = await db
    .insert(payoutLogs)
    .values({
      tenantId,
      amount: preview.net,
      feeAmount: preview.fee,
      orderCount: preview.candidates.length,
      bankCode: bank.bankCode,
      bankName: bank.bankName,
      bankAccountNumber: bank.accountNumber,
      bankAccountName: bank.accountName,
      status: "queued",
    })
    .returning({ id: payoutLogs.id });

  if (!payout) {
    return { ok: false, reason: "nothing_to_payout" };
  }

  try {
    await db.insert(payoutItems).values(
      preview.candidates.map((c) => ({
        payoutId: payout.id,
        orderId: c.orderId,
        deliveryProofId: c.deliveryProofId,
        amount: c.credit,
      })),
    );
  } catch (err) {
    /*
     * Pelanggaran UNIQUE berarti pesanan ini sudah masuk payout lain —
     * kemungkinan besar karena dua `runPayout` berjalan bersamaan. Yang
     * benar di sini JANGAN memaksa: memaksa berarti satu pesanan dibayar
     * dua kali. Log-nya dibuang dan percobaan dianggap gagal.
     */
    await db.delete(payoutLogs).where(eq(payoutLogs.id, payout.id));
    console.error("Pencairan gagal: item sudah terpakai", err);
    return {
      ok: false,
      reason: "service_error",
      message:
        "Ada pesanan lain yang sedang diproses pencairannya. Coba lagi sebentar.",
      payoutId: null,
    };
  }

  // 4. Panggil layanan.
  await db
    .update(payoutLogs)
    .set({ status: "processing", executedAt: new Date() })
    .where(eq(payoutLogs.id, payout.id));

  try {
    const result = await sendPayout({
      bankCode: bank.bankCode,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      amount: preview.net,
      // Kunci idempotensi diturunkan dari ISI payout, bukan dari waktu.
      // Payout yang sama yang dikirim dua kali harus dianggap retry oleh
      // layanan, bukan dua transfer.
      idempotencySeed: {
        tenantId,
        payoutId: payout.id,
        amount: preview.net,
        orders: preview.candidates.map((c) => c.orderId).sort(),
      },
    });

    if (!result.ok) {
      await db
        .update(payoutLogs)
        .set({ status: "failed", errorMessage: result.message })
        .where(eq(payoutLogs.id, payout.id));
      return {
        ok: false,
        reason: "service_error",
        message: result.message,
        payoutId: payout.id,
      };
    }

    // 5. Berhasil.
    await db
      .update(payoutLogs)
      .set({
        status: "success",
        irisReferenceId: result.referenceId,
        resolvedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(payoutLogs.id, payout.id));

    return {
      ok: true,
      payoutId: payout.id,
      amount: preview.net,
      orderCount: preview.candidates.length,
      alreadySent: result.alreadySent,
    };
  } catch (err) {
    if (err instanceof PayoutsNotConfiguredError) {
      // Kredensial hilang di tengah jalan (deploy, misal). Statusnya
      // `blocked`, bukan `failed`: ini bukan masalah bank.
      await db
        .update(payoutLogs)
        .set({ status: "blocked", errorMessage: err.message })
        .where(eq(payoutLogs.id, payout.id));
      return { ok: false, reason: "payouts_not_configured" };
    }
    const message = err instanceof Error ? err.message : "Kesalahan tidak diketahui.";
    await db
      .update(payoutLogs)
      .set({ status: "failed", errorMessage: message })
      .where(eq(payoutLogs.id, payout.id));
    return {
      ok: false,
      reason: "service_error",
      message,
      payoutId: payout.id,
    };
  }
}

/**
 * Ambil payout milik satu tenant, terbaru dulu.
 *
 * `tenantId` SELALU dari argumen yang memanggilnya, dan pemanggilnya selalu
 * dapatkannya dari guard — tidak pernah dari query string.
 */
export async function listPayouts(tenantId: string, limit = 20) {
  return db
    .select({
      id: payoutLogs.id,
      amount: payoutLogs.amount,
      feeAmount: payoutLogs.feeAmount,
      orderCount: payoutLogs.orderCount,
      bankName: payoutLogs.bankName,
      bankAccountNumber: payoutLogs.bankAccountNumber,
      status: payoutLogs.status,
      errorMessage: payoutLogs.errorMessage,
      irisReferenceId: payoutLogs.irisReferenceId,
      createdAt: payoutLogs.createdAt,
      resolvedAt: payoutLogs.resolvedAt,
    })
    .from(payoutLogs)
    .where(eq(payoutLogs.tenantId, tenantId))
    .orderBy(sql`${payoutLogs.createdAt} desc`)
    .limit(limit);
}
