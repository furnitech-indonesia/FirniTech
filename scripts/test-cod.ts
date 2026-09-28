/**
 * Uji COD (Sprint 6): apa yang boleh terlihat pembeli, dan apa yang tidak.
 *
 * COD menambah satu hal ke halaman lacak yang tidak ada di metode lain:
 * **nomor rekening pengrajin**. Itu satu-satunya data rekening yang boleh
 * keluar ke halaman publik, dan hanya karena pembeli harus tahu ke mana
 * transfer. Tapi "hanya karena perlu" adalah awal dari alasan yang salah —
 * jadi di sini diuji SEMUA batasnya, bukan hanya kasus yang diharapkan muncul:
 *
 *   - COD yang belum lunas  → rekening tampil
 *   - COD yang sudah lunas   → rekening TIDAH tampil
 *   - VA                    → rekening TIDAK tampil, sama sekali
 *   - rekening belum terverifikasi → rekening TIDAK tampil
 *   - tenant lain           → tidak ada efek apa pun
 *
 * Jalankan: npm run test:cod
 */
import "dotenv/config";

import { inArray } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import {
  orders,
  tenantBankAccounts,
  tenants,
} from "../src/db/schema";
import { findOrderForTracking } from "../src/lib/orders-public";

const SUFFIX = Date.now();
const PHONE = "6281234567890";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

const createdTenantIds: string[] = [];

async function makeTenant(label: string): Promise<string> {
  const slug = `uji-cod-${label}-${SUFFIX}`;
  const [t] = await db
    .insert(tenants)
    .values({
      name: `Uji COD ${label}`,
      slug,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!t) throw new Error("gagal membuat tenant");
  createdTenantIds.push(t.id);
  return t.id;
}

async function setBank(
  tenantId: string,
  status: "verified" | "unverified" | "failed",
  suffix: string,
) {
  await db.insert(tenantBankAccounts).values({
    tenantId,
    bankCode: "bca",
    bankName: "Bank Central Asia (BCA)",
    accountNumber: `778899${suffix}`,
    accountName: "PT Pengrajin Uji",
    status,
    verifiedAt: status === "verified" ? new Date() : null,
  });
}

async function makeOrder(
  tenantId: string,
  label: string,
  paymentMethod: "va" | "cod",
  paymentStatus: "unpaid" | "dp_paid" | "fully_paid",
) {
  const [o] = await db
    .insert(orders)
    .values({
      tenantId,
      orderCode: `COD-${label}-${SUFFIX}`,
      customerName: "Pembeli Uji",
      customerPhone: PHONE,
      customerAddress: "Jl. Uji No. 9",
      destinationCity: "Kabupaten Bandung",
      itemsSubtotal: 1_000_000,
      shippingFee: 450_000,
      totalAmount: 1_450_000,
      // COD: tidak ada DP, uangnya belum masuk.
      dpAmount: paymentMethod === "cod" ? 0 : 1_450_000,
      paymentMethod,
      orderStatus: "in_production",
      paymentStatus,
      netTenantAmount: 1_400_000,
    })
    .returning({ id: orders.id, orderCode: orders.orderCode });
  if (!o) throw new Error("gagal membuat pesanan");
  return o;
}

async function main() {
  const tenantA = await makeTenant("a");
  await setBank(tenantA, "verified", "0001");

  const tenantUnverified = await makeTenant("u");
  await setBank(tenantUnverified, "unverified", "0002");

  const tenantNoBank = await makeTenant("n");

  const codUnpaid = await makeOrder(tenantA, "BELUM", "cod", "unpaid");
  const codPaid = await makeOrder(tenantA, "LUNAS", "cod", "fully_paid");
  const vaUnpaid = await makeOrder(tenantA, "VA", "va", "unpaid");
  const codUnverifiedBank = await makeOrder(
    tenantUnverified,
    "BELUMVERIF",
    "cod",
    "unpaid",
  );
  const codNoBank = await makeOrder(tenantNoBank, "NOREK", "cod", "unpaid");

  /* ---------- 1. COD belum lunas: rekening HARUS tampil ---------- */
  const found = await findOrderForTracking(codUnpaid.orderCode, PHONE);
  if (!found) {
    throw new Error("fikstur COD tidak ditemukan lewat findOrderForTracking");
  }
  check(
    "COD belum lunas: rekening pengrajin tampil",
    found.codBank?.accountNumber === "7788990001",
    found.codBank?.accountNumber ?? "tidak ada",
  );
  check(
    "rekening yang tampil juga membawa nama bank & atas nama",
    found?.codBank?.bankName === "Bank Central Asia (BCA)" &&
      found?.codBank?.accountName === "PT Pengrajin Uji",
    `${found.codBank?.bankName} / ${found.codBank?.accountName}`,
  );
  check(
    "metode pembayaran terbaca sebagai cod",
    found.paymentMethod === "cod",
    found.paymentMethod,
  );

  /* ---------- 2. COD sudah lunas: rekening HARUS hilang ---------- */
  const paid = await findOrderForTracking(codPaid.orderCode, PHONE);
  check(
    "COD sudah lunas: rekening TIDAK tampil lagi",
    paid !== null && paid.codBank === null,
    paid === null ? "pesanan tidak ditemukan" : String(paid.codBank),
  );
  check(
    "COD sudah lunas: pesanan tetap bisa dilacak (data lain tidak ikut hilang)",
    paid?.orderCode === codPaid.orderCode && paid?.totalAmount === 1_450_000,
    paid?.orderCode ?? "-",
  );

  /* ---------- 3. VA: rekening TIDAK PERNAH tampil ---------- */
  const va = await findOrderForTracking(vaUnpaid.orderCode, PHONE);
  check(
    "pesanan VA: rekening TIDAK tampil meski belum lunas",
    va !== null && va.codBank === null,
    va === null ? "pesanan tidak ditemukan" : String(va.codBank),
  );

  // Dicari lewat serialisasi, bukan lewat `codBank === null`: yang diuji
  // adalah tidak adanya NOMOR REKENING di hasil, apa pun nama field-nya.
  // Kalau suatu saat field-nya diganti nama, tes ini masih benar.
  const vaSerialised = JSON.stringify(va ?? {});
  check(
    "pesanan VA: nomor rekening tidak ada di seluruh hasil",
    !vaSerialised.includes("7788990001"),
    "tidak ditemukan",
  );

  /* ---------- 4. Rekening belum terverifikasi: TIDAK tampil ---------- */
  const unverified = await findOrderForTracking(
    codUnverifiedBank.orderCode,
    PHONE,
  );
  check(
    "rekening belum terverifikasi: TIDAK tampil ke pembeli",
    unverified !== null && unverified.codBank === null,
    unverified === null ? "pesanan tidak ditemukan" : String(unverified.codBank),
  );

  /* ---------- 5. Tanpa rekening sama sekali ---------- */
  const noBank = await findOrderForTracking(codNoBank.orderCode, PHONE);
  check(
    "tanpa rekening: pesanan tetap bisa dilacak, rekening null",
    noBank !== null && noBank.codBank === null,
    noBank === null ? "pesanan tidak ditemukan" : String(noBank.codBank),
  );

  /* ---------- 6. Rekening tenant lain tidak ikut bocor ---------- */
  const serialised = JSON.stringify(found ?? {});
  check(
    "rekening tenant lain tidak ikut keluar",
    !serialised.includes("7788990002"),
    "tidak ditemukan",
  );

  /* ---------- 7. Tidak ada data keuangan yang ikut ---------- */
  const LEAKY_KEYS = [
    "netTenantAmount",
    "midtransMdrFee",
    "platformServiceFee",
    "dpAmount",
    "tenantId",
    "bankCode",
    "status",
    "verifiedAt",
  ];
  const leaked = LEAKY_KEYS.filter((key) => serialised.includes(key));
  check(
    "tidak ada data keuangan/rahasia toko di hasil",
    leaked.length === 0,
    leaked.length ? leaked.join(", ") : "bersih",
  );

  // `bankCode` sengaja masuk daftar: kode bank tidak berguna bagi pembeli dan
  // tidak perlu keluar. Yang perlu hanyalah nama bank yang bisa dibaca.
  check(
    "kode bank tidak keluar (yang perlu hanya label yang terbaca)",
    !serialised.includes('"bankCode"') && serialised.includes("Bank Central Asia"),
    "hanya label",
  );

  /* ---------- 8. Verifikasi nomor HP tetap berlaku ---------- */
  check(
    "COD juga tetap butuh nomor HP yang cocok",
    (await findOrderForTracking(codUnpaid.orderCode, "6289999999999")) === null,
    "null",
  );

  console.log(
    failures === 0
      ? "\nsemua pemeriksaan COD lulus.\n"
      : `\n${failures} pemeriksaan gagal.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((err) => {
    console.error("Uji COD gagal:", err);
    failures += 1;
  })
  .finally(async () => {
    if (createdTenantIds.length > 0) {
      await sqlClient`delete from integration_audit_logs where tenant_id in ${sqlClient(createdTenantIds)}`;
      await db
        .delete(orders)
        .where(inArray(orders.tenantId, createdTenantIds));
      await db
        .delete(tenantBankAccounts)
        .where(inArray(tenantBankAccounts.tenantId, createdTenantIds));
      await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
      await sqlClient.end();
    }
    process.exit(failures === 0 ? 0 : 1);
  });
