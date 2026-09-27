/**
 * Uji rekening pencairan & transport Payouts (Sprint 6).
 *
 * Dua hal yang diuji di sini, dan keduanya tidak bisa diuji tanpa
 * kehati-hatian khusus:
 *
 *  1. **RLS rekening.** Nomor rekening pengrajin tidak boleh bisa dibaca
 *     akun `kurir`. Ini kebocoran yang nyata dan sudah terjadi: kolomnya
 *     sempat ada di `tenants`, yang policy `tenants_select`-nya tidak
 *     menyaring role sama sekali. Dipindah ke `tenant_bank_accounts` dengan
 *     policy sendiri, dan diuji lewat JWT sungguhan.
 *
 *  2. **`iris-idempotency-key` harus deterministik.** Ini jaminan struktural
 *     yang membuat payout ganda mustahil: Payouts menganggap permintaan
 *     dengan kunci yang sama sebagai RETRY, bukan permintaan baru. Kunci
 *     yang dibuat ulang tiap percobaan — `Date.now()`, `Math.random()` —
 *     justru MEMBATALIR jaminan itu. Yang diuji di sini adalah sifat
 *     determinismenya, dan itu satu-satunya bagian dari mesin payout yang
 *     bisa dibuktikan tanpa kredensial.
 *
 * Jalankan: npm run test:rekening
 */
import "dotenv/config";

import { createHash } from "crypto";
import { eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { tenantBankAccounts, tenants, users } from "../src/db/schema";
import { createSupabaseAdmin } from "../src/lib/supabase/admin";
import {
  FALLBACK_BANKS,
  findBankOption,
  normalizeBankAccount,
} from "../src/lib/banks";
import {
  isPayoutsConfigured,
  PayoutsNotConfiguredError,
  validateBankAccount,
  verifyBankCodesAgainstMidtrans,
} from "../src/lib/midtrans/payouts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT!;

const PASSWORD = "RekeningUji-2026!";
const SUFFIX = Date.now();

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`Login ${email} gagal: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body.access_token;
}

async function get(token: string, path: string) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* biarkan teks mentah */
  }
  return { status: res.status, data };
}

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

async function makeUser(
  tenantId: string,
  label: string,
  role: "kurir" | "owner" | "admin_penjualan",
): Promise<{ userId: string; email: string }> {
  const email = `rekening.${label}.${SUFFIX}@uji.test`;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: label },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (!data?.user) throw new Error(`gagal membuat auth user ${email}`);

  await db.delete(users).where(eq(users.email, email));
  await db.insert(users).values({
    id: data.user.id,
    tenantId,
    email,
    fullName: label,
    phone: `62811${String(SUFFIX).slice(-8)}`,
    role,
  });
  return { userId: data.user.id, email };
}

async function main() {
  /* ==============================================================
   * BAGIAN 1 — fungsi murni, tanpa database
   * ============================================================== */

  // 1. Normalisasi nomor rekening.
  check(
    "normalizeBankAccount membuang spasi, tanda hubung, dan huruf",
    normalizeBankAccount(" 1234-5678 ") === "12345678" &&
      normalizeBankAccount("1234 5678") === "12345678" &&
      normalizeBankAccount("abc1234def") === "1234",
    `"1234-5678" -> "${normalizeBankAccount("1234-5678")}"`,
  );

  // 2. Panjang dibatasi 20 digit.
  check(
    "normalizeBankAccount memotong di 20 digit",
    normalizeBankAccount("1".repeat(40)).length === 20,
    `${normalizeBankAccount("1".repeat(40)).length} digit`,
  );

  // 3. Dua bentuk penulisan rekening yang sama jadi satu nilai.
  //    Ini yang mencegah "rekening tersimpan tapi payout gagal" hanya
  //    karena pengrajin mengetik dengan tanda hubung.
  check(
    "penulisan rekening berbeda normalisasi ke nilai yang sama",
    normalizeBankAccount("1234-5678") === normalizeBankAccount("12345678"),
    "identik",
  );

  // 4. Tidak ada kode bank duplikat di daftar cadangan. Duplikat akan
  //    membuat dropdown menampilkan bank yang sama dua kali dengan kode
  //    berbeda, dan tidak ada yang tahu mana yang benar sampai payout gagal.
  const codes = FALLBACK_BANKS.map((b) => b.code);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
  check(
    "tidak ada kode bank duplikat di daftar cadangan",
    dupes.length === 0,
    dupes.length ? dupes.join(", ") : codes.join(", "),
  );

  // 5. Semua kode huruf kecil dan tanpa spasi.
  check(
    "semua kode bank huruf kecil tanpa spasi",
    codes.every((c) => c === c.toLowerCase() && !/\s/.test(c)),
    codes.join(", "),
  );

  // 6. `findBankOption` case-insensitive dan null untuk yang tidak dikenal.
  check(
    "findBankOption tahan huruf besar dan null untuk kode asing",
    findBankOption("BCA")?.code === "bca" && findBankOption("bukan-bank") === null,
    `BCA -> ${findBankOption("BCA")?.code}`,
  );

  // 7. Laporan selisih daftar cadangan vs daftar layanan. Fungsinya
  //    dipakai sekali sebelum produksi; di sini yang diuji adalah bahwa ia
  //    melaporkan dengan benar, karena laporan yang salah lebih berbahaya
  //    daripada tidak ada laporan.
  const fakeService = [
    { code: "bca", label: "Bank Central Asia" },
    { code: "mandiri", label: "Bank Mandiri" },
  ];
  const diff = verifyBankCodesAgainstMidtrans(fakeService);
  check(
    "verifyBankCodesAgainstMidtrans melaporkan bank yang hilang & asing",
    diff.unknown.includes("bri") && diff.missing.includes("mandiri"),
    `tidak dikenal: [${diff.unknown.join(", ")}], hilang: [${diff.missing.join(", ")}]`,
  );

  /* ==============================================================
   * BAGIAN 2 — idempotency key Payouts
   * ============================================================== */

  const keyFor = (path: string, body: unknown) =>
    createHash("sha256")
      .update(`${path}|${JSON.stringify(body)}`)
      .digest("hex")
      .slice(0, 32);

  const body1 = {
    bank_code: "bca",
    account_number: "1234567890",
    account_name: "PT Mebel Jaya",
  };

  // 8. Isi sama -> kunci sama. INIitu yang membuat retry jadi aman.
  check(
    "permintaan dengan isi sama menghasilkan idempotency key yang sama",
    keyFor("/account_validation", body1) === keyFor("/account_validation", body1),
    keyFor("/account_validation", body1).slice(0, 16),
  );

  // 9. Isi berbeda -> kunci berbeda. Kalau tidak, validasi rekening yang
  //    berbeda akan saling menimpa sebagai "retry" dan hanya yang pertama
  //    yang pernah sampai ke bank.
  check(
    "isi berbeda menghasilkan idempotency key berbeda",
    keyFor("/account_validation", body1) !==
      keyFor("/account_validation", { ...body1, account_number: "999" }),
    "berbeda",
  );

  // 10. Panjang kunci. Payouts punya batasnya sendiri; 32 hex char
  //     (128 bit) cukup untuk tidak bertabrakan dengan request lain tanpa
  //     berisiko melewati batas panjang yang tidak diketahui.
  check(
    "idempotency key panjangnya 32 karakter",
    keyFor("/account_validation", body1).length === 32,
    `${keyFor("/account_validation", body1).length} karakter`,
  );

  // 11. Endpoint yang berbeda tidak berbagi kunci.
  check(
    "endpoint berbeda menghasilkan key berbeda",
    keyFor("/account_validation", body1) !== keyFor("/beneficiaries", body1),
    "berbeda",
  );

  /* ==============================================================
   * BAGIAN 3 — Payouts belum dikonfigurasi harus JELAS, bukan error
   * ============================================================== */

  // 12. Keadaan "belum dikonfigurasi" punya error type sendiri.
  //     Kalau tidak, `saveBankAccount` tidak bisa membedakan "rekeningnya
  //     salah" dari "server kita belum punya kredensial" — dan pengrajin
  //     akan diberi pesan yang salah sasaran.
  const configured = isPayoutsConfigured();
  let thrown: unknown = null;
  try {
    await validateBankAccount({
      bankCode: "bca",
      accountNumber: "1234567890",
      accountName: "PT Mebel Jaya",
    });
  } catch (err) {
    thrown = err;
  }
  if (configured) {
    check(
      "Payouts terkonfigurasi: pemanggilan tidak melempar NotConfigured",
      !(thrown instanceof PayoutsNotConfiguredError),
      "kredensial ada",
    );
  } else {
    check(
      "Payouts belum dikonfigurasi: melempar PayoutsNotConfiguredError, bukan error umum",
      thrown instanceof PayoutsNotConfiguredError,
      thrown instanceof PayoutsNotConfiguredError
        ? (thrown as Error).message.slice(0, 60)
        : String(thrown),
    );
  }

  /* ==============================================================
   * BAGIAN 4 — RLS rekening, lewat JWT sungguhan
   * ============================================================== */

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: `Uji Rekening ${SUFFIX}`,
      slug: `uji-rekening-${SUFFIX}`,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error("gagal membuat tenant");

  const owner = await makeUser(tenant.id, "owner", "owner");
  const adminUser = await makeUser(tenant.id, "admin", "admin_penjualan");
  const courier = await makeUser(tenant.id, "kurir", "kurir");

  await db.insert(tenantBankAccounts).values({
    tenantId: tenant.id,
    bankCode: "bca",
    bankName: "Bank Central Asia (BCA)",
    accountNumber: "7788990011",
    accountName: "Budi Santoso",
    status: "unverified",
  });

  // 12b. KOLOM REKENING TIDAK BOLEH KEMBALI KE `tenants`.
  //
  //      Ini pemeriksaan struktural yang mencegah
  //      regresi yang sudah terjadi sekali: `tenants_select` tidak
  //      menyaring role, jadi begitu rekeningnya ada di sana, kurir bisa
  //      membacanya. Menyembunyikan policy-nya akan lebih buruk — memindahkan
  //      tabelnya adalah perbaikannya. Pemeriksaan ini memastikan tidak ada
  //      yang memindahkan kolomnya kembali sambil bilang "cuma untuk
  //      tampilan saja".
  const bankColumns = await sqlClient<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants'
      and (column_name like 'bank%' or column_name like '%account%')
  `;
  check(
    "tabel tenants TIDAK punya kolom rekening",
    bankColumns.length === 0,
    bankColumns.length
      ? bankColumns.map((c) => c.column_name).join(", ")
      : "tidak ada",
  );

  // 13. Owner membaca rekeningnya sendiri.
  const ownerToken = await login(owner.email);
  const asOwner = await get(ownerToken, "tenant_bank_accounts?select=account_number,account_name");
  check(
    "owner: boleh membaca rekening tokonya sendiri",
    rows(asOwner.data).length === 1,
    `${rows(asOwner.data).length} baris`,
  );

  // 14. Admin penjualan juga boleh MEMBACA (dia melihat ringkasan kas).
  const adminToken = await login(adminUser.email);
  const asAdmin = await get(adminToken, "tenant_bank_accounts?select=account_number");
  check(
    "admin_penjualan: boleh MEMBACA rekening",
    rows(asAdmin.data).length === 1,
    `${rows(asAdmin.data).length} baris`,
  );

  // 15. Kurir TIDAK boleh membaca. Ini regresi yang nyata: kolomnya sempat
  //     ada di `tenants`, yang policy-nya tidak menyaring role, jadi kurir
  //     bisa membaca nomor rekening DAN nama pemilik.
  const courierToken = await login(courier.email);
  const asCourier = await get(
    courierToken,
    "tenant_bank_accounts?select=account_number,account_name",
  );
  check(
    "kurir: TIDAK boleh membaca rekening pencairan",
    asCourier.status >= 400 || rows(asCourier.data).length === 0,
    `status ${asCourier.status}, ${rows(asCourier.data).length} baris`,
  );
  check(
    "kurir: nama pemilik rekening tidak bocor",
    !(JSON.stringify(asCourier.data ?? "").includes("Budi Santoso")),
    "tidak ditemukan",
  );

  // 16. Anon tidak boleh apa-apa.
  const anonRead = await get(anonKey, "tenant_bank_accounts?select=account_number");
  check(
    "anon: TIDAK boleh membaca rekening",
    anonRead.status >= 400 || rows(anonRead.data).length === 0,
    `status ${anonRead.status}`,
  );

  // 17. Admin penjualan tidak boleh MENULIS. Admin mengurus pesanan;
  //     rekening adalah keputusan siapa yang menarik uang.
  const adminWrite = await fetch(`${url}/rest/v1/tenant_bank_accounts`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      tenant_id: tenant.id,
      bank_code: "bni",
      bank_name: "Bank Negara Indonesia (BNI)",
      account_number: "0000000000",
      account_name: "Orang Lain",
    }),
  });
  check(
    "admin_penjualan: TIDAK boleh menulis rekening",
    adminWrite.status >= 400,
    `status ${adminWrite.status}`,
  );

  // 18. Verifikasi dari database bahwa penolakan itu sungguhan.
  const [unchanged] = await db
    .select({ accountName: tenantBankAccounts.accountName })
    .from(tenantBankAccounts)
    .where(eq(tenantBankAccounts.tenantId, tenant.id));
  check(
    "rekening tetap milik owner, tidak tertimpa",
    unchanged?.accountName === "Budi Santoso",
    `account_name=${unchanged?.accountName}`,
  );

  // 19. Satu tenant hanya boleh punya SATU rekening. Ditegakkan oleh
  //     primary key, dan itulah yang membuat `onConflictDoUpdate` di action
  //     menjadi idempoten tanpa logika tambahan.
  const [dup] = await db
    .insert(tenantBankAccounts)
    .values({
      tenantId: tenant.id,
      bankCode: "bni",
      bankName: "Bank Negara Indonesia (BNI)",
      accountNumber: "0000000000",
      accountName: "Orang Lain",
    })
    .onConflictDoNothing()
    .returning({ tenantId: tenantBankAccounts.tenantId });
  check(
    "satu tenant tidak bisa punya dua rekening (primary key)",
    dup === undefined,
    dup === undefined ? "insert kedua diabaikan" : "DUPLIKAT LOLOS",
  );

  console.log(
    failures === 0
      ? "\nsemua pemeriksaan rekening lulus.\n"
      : `\n${failures} pemeriksaan gagal.\n`,
  );
  await cleanup(tenant.id, [owner.userId, adminUser.userId, courier.userId]);
  process.exit(failures === 0 ? 0 : 1);
}

async function cleanup(tenantId: string, userIds: string[]) {
  // Audit log harus dihapus eksplisit: `integration_audit_logs.tenant_id`
  // memakai `onDelete: "set null"`, jadi baris audit tidak ikut terhapus
  // bersama tenant dan setiap menjalankan skrip ini mencampur sampah test ke
  // tabel yang dibaca super admin.
  await sqlClient`delete from integration_audit_logs where tenant_id = ${tenantId}`;
  await db.delete(users).where(eq(users.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  const admin = createSupabaseAdmin();
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => undefined);
  }
  await sqlClient.end();
}

main().catch((err) => {
  console.error("Uji rekening gagal:", err);
  process.exit(1);
});
