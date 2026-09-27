/**
 * Uji mesin payout (Sprint 6).
 *
 * Yang diuji di sini BUKAN panggilan ke Payouts — `MIDTRANS_IRIS_API_KEY`
 * masih kosong, jadi tidak ada respons nyata yang pernah dilihat. Yang diuji
 * adalah bagian yang menentukan dan bisa diuji tanpa layanan:
 *
 *  1. **SYARAT KELAYAKAN.** Pesanan mana yang boleh dicairkan. Ini yang
 *     menentukan apakah uang_DOUBLE masuk ke rekening pengrajin.
 *  2. **ARITMETIKA FEE.** Satu fee per penerima, bukan per pesanan, dan
 *     `sum(items) - fee == payout.amount` harus benar.
 *  3. **PENGECUALIAN YANG MENAH.** Rekening belum terverifikasi, saldo di
 *     bawah fee, tidak ada yang siap, Payouts belum dikonfigurasi.
 *  4. **KEUNIKAN.** `payout_items.order_id` UNIQUE — satu-satunya hal yang
 *     benar-benar mencegah uang dibayar dua kali, dan tidak ada kode
 *     aplikasi yang bisa menggantinya.
 *
 * Jalankan: npm run test:payout
 */
import "dotenv/config";

import { and, eq, inArray } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  deliveryProofs,
  orders,
  payoutItems,
  payoutLogs,
  tenantBankAccounts,
  tenants,
  users,
} from "../src/db/schema";
import { FEE_PENCAIRAN, craftsmanCreditFor } from "../src/lib/fees";
import {
  PAYOUT_BLOCK_MESSAGES,
  previewPayout,
  runPayout,
} from "../src/lib/payouts";

const SUFFIX = Date.now();

/**
 * Semua tenant yang dibuat skrip ini, untuk dibersihkan di `finally`.
 *
 * `finally` itu WAJIB di sini, bukan untuk aesthetics: tanpa itu, satu
 * pemeriksaan yang gagal di tengah menyisakan fikstur yang membuat
 * menjalankan skrip berikutnya gagal dengan pelanggaran `tenant_slug_idx` —
 * jadi test yang gagal dua kali akan terasa seperti test yang rusak, bukan seperti
 * test yang menemukan masalah.
 */
const createdTenantIds: string[] = [];

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

/** Slug unik per panggilan: satu skrip membuat lima tenant uji. */
let tenantSeq = 0;

async function makeTenant(): Promise<string> {
  tenantSeq += 1;
  const slug = `uji-payout-${SUFFIX}-${tenantSeq}`;
  const [t] = await db
    .insert(tenants)
    .values({
      name: `Uji Payout ${SUFFIX} #${tenantSeq}`,
      slug,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!t) throw new Error("gagal membuat tenant");
  createdTenantIds.push(t.id);
  return t.id;
}

/**
 * Akun kurir milik tenant uji.
 *
 * `delivery_proofs.courier_id` punya foreign key ke `users`, jadi tenant uji
 * harus punya user — kalau tidak, `makeProof` gagal dengan pelanggaran FK dan
 * pesan yang tidak menjelaskan apa pun tentang apa yang sebenarnya salah.
 * User-nya dibuat sekali per tenant, bukan per bukti.
 */
const courierIds = new Map<string, string>();

async function ensureCourier(tenantId: string): Promise<string> {
  const cached = courierIds.get(tenantId);
  if (cached) return cached;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .limit(1);
  if (existing) {
    courierIds.set(tenantId, existing.id);
    return existing.id;
  }

  // `users.id` TIDAK punya default: kolom itu adalah `auth.uid()`, yang
  // selalu diisi dari JWT. Di luar Auth (seed dan skrip test) kita harus
  // menyisipkan UUID sendiri, persis seperti `provisionOwner` melakukan.
  const [u] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      email: `kurir.payout.${tenantId.slice(0, 8)}@uji.test`,
      fullName: "Kurir Uji Payout",
      phone: "6281234567890",
      role: "kurir",
    })
    .returning({ id: users.id });
  if (!u) throw new Error("gagal membuat kurir uji");
  courierIds.set(tenantId, u.id);
  return u.id;
}

async function makeOrder(
  tenantId: string,
  label: string,
  overrides: Partial<typeof orders.$inferInsert> = {},
): Promise<string> {
  const [o] = await db
    .insert(orders)
    .values({
      tenantId,
      orderCode: `PAY-${label}-${SUFFIX}`,
      customerName: "Pembeli Uji",
      customerPhone: "6281234567890",
      customerAddress: "Jl. Uji 1",
      destinationCity: "Kabupaten Bandung",
      itemsSubtotal: 1_000_000,
      shippingFee: 20_000,
      totalAmount: 1_020_000,
      orderStatus: "completed",
      paymentStatus: "fully_paid",
      paidAt: new Date(),
      ...overrides,
    })
    .returning({ id: orders.id });
  if (!o) throw new Error("gagal membuat pesanan");
  return o.id;
}

async function makeProof(orderId: string, tenantId: string): Promise<string> {
  const [p] = await db
    .insert(deliveryProofs)
    .values({
      orderId,
      tenantId,
      courierId: await ensureCourier(tenantId),
      photoPath: "p",
      signaturePath: "s",
      signerName: "Penerima Uji",
      receivedAt: new Date(),
    })
    .returning({ id: deliveryProofs.id });
  if (!p) throw new Error("gagal membuat bukti");
  return p.id;
}

async function ready(
  tenantId: string,
  label: string,
  overrides: Partial<typeof orders.$inferInsert> = {},
): Promise<string> {
  const id = await makeOrder(tenantId, label, overrides);
  await makeProof(id, tenantId);
  return id;
}

async function setBank(tenantId: string, status: "verified" | "unverified" | "failed") {
  await db
    .insert(tenantBankAccounts)
    .values({
      tenantId,
      bankCode: "bca",
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "1234567890",
      accountName: "PT Uji Payout",
      status,
      verifiedAt: status === "verified" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: tenantBankAccounts.tenantId,
      set: {
        status,
        verifiedAt: status === "verified" ? new Date() : null,
      },
    });
}

async function main() {
  const tenantId = await makeTenant();

  /* ==============================================================
   * 1. SYARAT KELAYAKAN
   * ============================================================== */

  const ok1 = await ready(tenantId, "SIAP");

  // Belum lunas.
  const belumLunas = await ready(tenantId, "DP", {
    paymentStatus: "dp_paid",
    paidAt: new Date(),
  });
  // Belum ada bukti.
  const tanpaBukti = await makeOrder(tenantId, "BUKTI", {
    orderStatus: "completed",
    paymentStatus: "fully_paid",
    paidAt: new Date(),
  });
  // COD: lunas, ada bukti, tapi uangnya sudah diterima di tempat.
  const cod = await ready(tenantId, "COD", {
    paymentMethod: "cod",
    paymentStatus: "fully_paid",
  });
  // Tenant lain, untuk memastikan batas tenant benar-benar berlaku.
  const otherTenantId = await makeTenant();
  const tenantLain = await ready(otherTenantId, "LAIN");

  const preview = await previewPayout(tenantId);
  const ids = preview.candidates.map((c) => c.orderId).sort();

  check(
    "hanya pesanan lunas + ada bukti + metode VA yang layak",
    ids.length === 1 && ids[0] === ok1,
    `${ids.length} kandidat`,
  );
  check(
    "pesanan DP belum lunas TIDAK layak",
    !ids.includes(belumLunas),
    belumLunas,
  );
  check(
    "pesanan tanpa bukti TIDAK layak",
    !ids.includes(tanpaBukti),
    tanpaBukti,
  );
  check(
    "pesanan COD TIDAK PERNAH layak payout (uang sudah diterima di tempat)",
    !ids.includes(cod),
    cod,
  );
  check(
    "pesanan tenant lain TIDAK masuk",
    !ids.includes(tenantLain),
    tenantLain,
  );

  // Status `completed` yang diubah MANUAL tidak boleh cukup jadi pemicu.
  // Bukti yang jadi syaratnya, bukan status.
  const statusDoe = await makeOrder(tenantId, "STATUS", {
    orderStatus: "completed",
    paymentStatus: "fully_paid",
    paidAt: new Date(),
  });
  const preview2 = await previewPayout(tenantId);
  check(
    "status completed tanpa bukti TIDAK cukup (bukti yang jadi syarat)",
    !preview2.candidates.some((c) => c.orderId === statusDoe),
    "ditolak",
  );

  /* ==============================================================
   * 2. ARITMETIKA FEE
   * ============================================================== */

  await ready(tenantId, "SIAP2", { totalAmount: 500_000, itemsSubtotal: 480_000 });
  await ready(tenantId, "SIAP3", { totalAmount: 3_000_000, itemsSubtotal: 2_980_000 });
  const preview3 = await previewPayout(tenantId);

  const expectedGross = [1_020_000, 500_000, 3_000_000].reduce(
    (sum, t) => sum + craftsmanCreditFor(t),
    0,
  );
  check(
    "fee pencairan dihitung SATU KALI per penerima, bukan per pesanan",
    preview3.fee === FEE_PENCAIRAN && preview3.candidates.length === 3,
    `${preview3.candidates.length} pesanan, fee ${preview3.fee}`,
  );
  check(
    "kredit per pesanan = totalAmount − fee masuk (fee platform 0)",
    preview3.gross === expectedGross,
    `${preview3.gross} = ${expectedGross}`,
  );
  check(
    "net = jumlah kredit − fee pencairan",
    preview3.net === preview3.gross - FEE_PENCAIRAN,
    `${preview3.net} = ${preview3.gross} − ${FEE_PENCAIRAN}`,
  );

  // Penghematan dari penggabungan: kalau dicair satu per satu, fee-nya 3x.
  const separate = 3 * FEE_PENCAIRAN;
  check(
    "menggabungkan 3 pesanan menghemat 2 fee pencairan untuk pengrajin",
    separate - preview3.fee === 2 * FEE_PENCAIRAN,
    `${separate} → ${preview3.fee} (hemat ${separate - preview3.fee})`,
  );

  /* ==============================================================
   * 3. PENGECUALIAN YANG MENAH
   * ============================================================== */

  // 3a. Rekening belum ada sama sekali.
  const noBankTenant = await makeTenant();
  await ready(noBankTenant, "NB");
  const noBank = await runPayout(noBankTenant);
  check(
    "tanpa rekening: ditolak dengan alasan yang bisa dibaca",
    !noBank.ok && noBank.reason === "no_bank_account",
    noBank.ok ? "LOLOS" : noBank.reason,
  );
  check(
    "setiap alasan penolakan punya pesan yang bisa dibaca",
    Object.values(PAYOUT_BLOCK_MESSAGES).every((m) => m.length > 20) &&
      !Object.values(PAYOUT_BLOCK_MESSAGES).some((m) =>
        m.includes("undefined") || m.includes("[object"),
      ),
    `${Object.keys(PAYOUT_BLOCK_MESSAGES).length} alasan`,
  );

  // 3b. Rekening ada tapi belum terverifikasi.
  await setBank(tenantId, "unverified");
  const unverified = await runPayout(tenantId);
  check(
    "rekening belum terverifikasi: pencairan DITAHAN",
    !unverified.ok && unverified.reason === "bank_account_unverified",
    unverified.ok ? "LOLOS" : unverified.reason,
  );

  // 3c. Rekening ditolak bank.
  await setBank(tenantId, "failed");
  const failedBank = await runPayout(tenantId);
  check(
    "rekening ditolak bank: pencairan juga DITAHAN",
    !failedBank.ok && failedBank.reason === "bank_account_unverified",
    failedBank.ok ? "LOLOS" : failedBank.reason,
  );

  // 3d. Saldo di bawah fee. Satu pesanan Rp5.000 saja: kreditnya Rp4.556,
  //     fee Rp5.550, jadi net-nya negatif.
  const kecilTenant = await makeTenant();
  await setBank(kecilTenant, "verified");
  await ready(kecilTenant, "KECIL", {
    totalAmount: 5_000,
    itemsSubtotal: 0,
    shippingFee: 5_000,
  });
  const kecil = await runPayout(kecilTenant);
  check(
    "saldo di bawah fee pencairan: DITOLAK, tidak jadi nominal negatif",
    !kecil.ok && kecil.reason === "balance_below_fee",
    kecil.ok ? `LOLOS ${kecil.amount}` : kecil.reason,
  );

  // 3e. Tidak ada yang siap.
  const kosongTenant = await makeTenant();
  await setBank(kosongTenant, "verified");
  const kosong = await runPayout(kosongTenant);
  check(
    "tidak ada pesanan siap: ditolak, bukan payout kosong",
    !kosong.ok && kosong.reason === "nothing_to_payout",
    kosong.ok ? "LOLOS" : kosong.reason,
  );

  // 3f. Tidak ada payout log yang tercipta untuk kasus yang ditolak.
  //     Menolak tanpa menulis apa pun penting supaya riwayat owner tidak
  //     penuh baris "ditahan" untuk hal yang memang belum pernah mencoba.
  const blockedLogs = await db
    .select()
    .from(payoutLogs)
    .where(inArray(payoutLogs.tenantId, [kecilTenant, kosongTenant]));
  check(
    "penolakan tidak menulis payout log",
    blockedLogs.length === 0,
    `${blockedLogs.length} baris`,
  );

  /* ==============================================================
   * 4. KEUNIKAN — pengaman terakhir terhadap uang dobel
   * ============================================================== */

  await setBank(tenantId, "verified");

  // Sisipkan item untuk satu pesanan secara manual, lalu coba lagi.
  const [forced] = await db
    .insert(payoutLogs)
    .values({
      tenantId,
      amount: 1000,
      feeAmount: FEE_PENCAIRAN,
      orderCount: 1,
      bankCode: "bca",
      bankName: "Bank Central Asia (BCA)",
      bankAccountNumber: "1234567890",
      bankAccountName: "PT Uji Payout",
      status: "failed",
    })
    .returning({ id: payoutLogs.id });

  await db.insert(payoutItems).values({
    payoutId: forced.id,
    orderId: ok1,
    amount: craftsmanCreditFor(1_020_000),
  });

  const afterClaim = await previewPayout(tenantId);
  check(
    "pesanan yang sudah ada di payout_items TIDAK lagi jadi kandidat",
    !afterClaim.candidates.some((c) => c.orderId === ok1),
    ok1,
  );

  // Dan UNIQUE-nya benar-benar menolak.
  let uniqueBlocked = false;
  try {
    await db.insert(payoutItems).values({
      payoutId: forced.id,
      orderId: ok1,
      amount: 1,
    });
  } catch (err) {
    // Drizzle membungkus error postgres.js di dalam `cause`, jadi
    // `err.code` di level atas sering `undefined`. Hanya membaca `err.code`
    // membuat tes ini melaporkan "tidak ditolak" untuk pelanggaran unique
    // yang benar-benar terjadi — persis jenis tes yang hijau sambil salah.
    const outer = err as { code?: string; cause?: { code?: string } };
    uniqueBlocked =
      outer.code === "23505" || outer.cause?.code === "23505";
  }
  check(
    "UNIQUE payout_items.order_id menolak pesanan yang sama dua kali",
    uniqueBlocked,
    uniqueBlocked ? "23505" : "tidak ditolak",
  );

  /* ==============================================================
   * 5. PANGGILAN LAYANAN YANG TIDAK DIKONFIGURASI
   * ============================================================== */

  const notConfigured = await runPayout(tenantId);
  check(
    "Payouts belum dikonfigurasi: ditolak, TIDAK melempar error",
    !notConfigured.ok,
    notConfigured.ok
      ? "LOLOS"
      : notConfigured.reason === "service_error"
        ? `service_error: ${notConfigured.message.slice(0, 50)}`
        : notConfigured.reason,
  );
  check(
    "Payouts belum dikonfigurasi: alasan menyebut konfigurasi, bukan bank",
    !notConfigured.ok && notConfigured.reason === "payouts_not_configured",
    notConfigured.ok ? "LOLOS" : notConfigured.reason,
  );

  // Tidak boleh ada payout log sukses yang padahal tidak ada yang dikirim.
  const successLogs = await db
    .select()
    .from(payoutLogs)
    .where(and(eq(payoutLogs.tenantId, tenantId), eq(payoutLogs.status, "success")));
  check(
    "TIDAK ada payout berstatus success padahal layanan tidak terkonfigurasi",
    successLogs.length === 0,
    `${successLogs.length} baris`,
  );

  console.log(
    failures === 0
      ? "\nsemua pemeriksaan payout lulus.\n"
      : `\n${failures} pemeriksaan gagal.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

async function cleanup(tenantIds: string[]) {
  await sqlClient`delete from integration_audit_logs where tenant_id in ${sqlClient(tenantIds)}`;
  // `payout_items` cascade dari `payout_logs`, jadi menghapus log saja
  // sudah cukup — dan menuliskan penghapusan item secara manual hanya
  // menambah tempat yang bisa salah.
  await db.delete(payoutLogs).where(inArray(payoutLogs.tenantId, tenantIds));
  await db.delete(orders).where(inArray(orders.tenantId, tenantIds));
  await db.delete(users).where(inArray(users.tenantId, tenantIds));
  await db.delete(tenantBankAccounts).where(
    inArray(tenantBankAccounts.tenantId, tenantIds),
  );
  await db.delete(tenants).where(inArray(tenants.id, tenantIds));
  await sqlClient.end();
}

main()
  .catch((err) => {
    console.error("Uji payout gagal:", err);
    failures += 1;
  })
  .finally(async () => {
    if (createdTenantIds.length > 0) await cleanup(createdTenantIds);
    process.exit(failures === 0 ? 0 : 1);
  });
