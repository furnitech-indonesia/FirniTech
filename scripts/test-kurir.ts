/**
 * Uji peran KURIR (Sprint 6).
 *
 * Peran kurir adalah satu-satunya tempat di mana RLS bukan lapisan kedua
 * melainkan lapisan SATU-SATUNYA yang memisahkan dua orang dalam tenant yang
 * sama. Untuk owner dan admin, `tenant_id` sudah cukup karena tidak ada dua
 * orang dengan peran sama di satu toko. Untuk kurir ada: dua orang bisa punya
 * peran `kurir` di workshop yang sama, dan hanya salah satunya yang berhak
 * melihat alamat dan nomor pembeli untuk kiriman yang ditugaskan padanya.
 *
 * Karena itu pemeriksaan di sini berbasis JWT sungguhan lewat PostgREST, bukan
 * pembacaan source code. Membaca `orders_courier_read` di file migrasi hanya
 * membuktikan policy-nya tertulis — bukan bahwa policy itu benar-benar berlaku, dan
 * tidak bahwa policy `orders_staff_read` yang sudah ada sebelumnya tidak
 * tetap meloloskan semua baris. Policy yang saling menimpa adalah kegagalan
 * yang paling mungkin terjadi di feature ini, jadi itulah yang diuji.
 *
 * Jalankan: npm run test:kurir
 */
import "dotenv/config";

import { eq, inArray, sql } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { orders, tenants, users } from "../src/db/schema";
import { createSupabaseAdmin } from "../src/lib/supabase/admin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_JWT!;

const PASSWORD = "KurirUji-2026!";
const SUFFIX = Date.now();
const TENANT_NAME = `Uji Kurir ${SUFFIX}`;

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(
      `Login ${email} gagal: ${JSON.stringify(body).slice(0, 200)}`,
    );
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

/**
 * PATCH dengan `return=representation`.
 *
 * BUKAN `return=minimal` — itu balas 204 Whether pun apakah barisnya ketemu,
 * karena PostgREST tidak membalas error kalau `USING` menyaring semua baris.
 * Percaya pada status 204 berarti tes ini melaporkan "penolakan berhasil"
 * untuk penulisan yang tidak terjadi, dan tes yang mengira ia menguji
 * sesuatu padahal tidak. `return=representation` membalas daftar baris yang
 * benar-benar berubah, jadi 0 baris berarti RLS menolaknya.
 */
async function patch(token: string, path: string, body: unknown) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* biarkan teks mentah */
  }
  return { status: res.status, text, data };
}

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

/**
 * Buat akun kurir yang bisa benar-benar login lewat password.
 *
 * Baris `users` tidak dibuat trigger `handle_new_user` karena ia menolak
 * `tenant_id` dari metadata dan selalu disisipkan dengan `tenant_id` NULL.
 * Jadi placeholder dibuang lebih dulu (karena `user_email_idx` unik pada
 * lower(email) akan membuat trigger gagal), lalu baris yang benar disisipkan
 * dengan id dari `auth.users` — persis seperti `provisionOwner` melakukan.
 */
async function makeCourier(
  tenantId: string,
  label: string,
): Promise<{ userId: string; email: string }> {
  const email = `kurir.${label}.${SUFFIX}@uji.test`;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Kurir ${label}` },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (!data?.user) throw new Error(`gagal membuat auth user ${email}`);

  await db.delete(users).where(eq(users.email, email));
  await db.insert(users).values({
    id: data.user.id,
    tenantId,
    email,
    fullName: `Kurir ${label}`,
    phone: `62812${SUFFIX % 1_000_000}`.slice(0, 14),
    role: "kurir",
  });
  return { userId: data.user.id, email };
}

async function main() {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: TENANT_NAME,
      slug: `uji-kurir-${SUFFIX}`,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error("gagal membuat tenant uji");

  const a = await makeCourier(tenant.id, "a");
  const b = await makeCourier(tenant.id, "b");

  /*
   * Tiga pesanan, dua tenant. Yang dari tenant lain penting justru karena
   * policy yang salah sering tetap "meng benar" pada data tenant sendiri —
   * misal policy forgot `tenant_id` sama sekali dan hanya memfilter
   * `assigned_courier_id`. Kalau tidak ada baris tenant lain, tes itu lulus
   * padahal belligok.
   */
  const otherTenant = await db
    .insert(tenants)
    .values({
      name: `Uji Kurir Lain ${SUFFIX}`,
      slug: `uji-kurir-lain-${SUFFIX}`,
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000 * 30),
    })
    .returning({ id: tenants.id });

  const mk = async (
    tenantId: string,
    code: string,
    courierId: string | null,
  ) =>
    db
      .insert(orders)
      .values({
        tenantId,
        orderCode: code,
        customerName: `Pembeli ${code}`,
        customerPhone: "6281234567890",
        customerAddress: `Jl. Uji No. ${code}`,
        destinationCity: "Kabupaten Bandung",
        itemsSubtotal: 1_000_000,
        shippingFee: 20_000,
        totalAmount: 1_020_000,
        orderStatus: "ready_to_ship",
        assignedCourierId: courierId,
      })
      .returning({ id: orders.id, orderCode: orders.orderCode });

  const [mineA] = await mk(tenant.id, `KUR-A-1-${SUFFIX}`, a.userId);
  const [mineB] = await mk(tenant.id, `KUR-B-1-${SUFFIX}`, b.userId);
  const [unassigned] = await mk(tenant.id, `KUR-NONE-1-${SUFFIX}`, null);
  const [foreign] = await mk(otherTenant[0].id, `KUR-X-1-${SUFFIX}`, a.userId);

  // 1. Kurir A melihat PERSIS satu baris: pesanannya sendiri.
  const tokenA = await login(a.email);
  const seenA = await get(tokenA, "orders?select=order_code,customer_name");
  const codesA = rows(seenA.data).map((r) => r.order_code as string);
  check(
    "kurir A: hanya melihat pesanan yang ditugaskan padanya",
    codesA.length === 1 && codesA[0] === mineA.orderCode,
    `terlihat: [${codesA.join(", ")}]`,
  );

  // 2. Pesanan milik kurir B di tenant yang SAMA tidak boleh terlihat.
  check(
    "kurir A: pesanan kurir lain di toko yang sama TIDAK bocor",
    !codesA.includes(mineB.orderCode),
    mineB.orderCode,
  );

  // 3. Pesanan tanpa kurir tidak boleh terlihat.
  check(
    "kurir A: pesanan tanpa kurir tidak terlihat",
    !codesA.includes(unassigned.orderCode),
    unassigned.orderCode,
  );

  // 4. Pesanan tenant lain tidak boleh terlihat meski ditugaskan ke dia.
  check(
    "kurir A: pesanan tenant lain tidak terlihat",
    !codesA.includes(foreign.orderCode),
    foreign.orderCode,
  );

  // 5. Kolom uang ada di tabel, dan kurir membacanya lewat select eksplisit.
  //    Yang diuji di sini policy-nya, bukan kolom mana yang boleh dipanggil:
  //    PostgREST memfilter SETELAH policy, jadi kurir yang bisa membaca
  //    `total_amount` pada barisnya sendiri adalah hal normal. Yang tidak
  //    normal adalah baris orang lain — sudah diuji di atas.
  /*
   * Kolom uang TIDAK bisa dikunci lewat RLS — RLS hanya menyaring baris.
   * Yang mengunci kolom adalah GRANT, jadi inilah yang diuji di sini: kurir
   * harus mendapat 400 "column not found" untuk `net_tenant_amount`, bukan
   * baris dengan nilai `null` di dalamnya.
   *
   * null akan lolos sebagai "tidak ada datanya", dan itu kesalahan yang
   * paling berbahaya: tesnya hijau, tidak ada error di aplikasi, dan margin
   * toko tetap bocor ke akun kurir.
   */
  const withMoney = await get(
    tokenA,
    "orders?select=order_code,total_amount,net_tenant_amount",
  );
  const margin = rows(withMoney.data)[0]?.net_tenant_amount;
  check(
    "kurir A: kolom margin toko TIDAK bisa dibaca (GRANT, bukan RLS)",
    withMoney.status >= 400 && margin === undefined,
    `status ${withMoney.status}, margin=${
      margin === undefined ? "tidak terbaca" : String(margin)
    }`,
  );

  // Sebagai pembanding: `total_amount` TIDAK dicabut: itu angka yang diketahui
  // pembeli sendiri, dan mengujinya ke sini hanya memastikan PROCABUT tidak
  // ikut menyeret kolom yang memang boleh dibaca.
  const withTotal = await get(tokenA, "orders?select=total_amount");
  check(
    "kurir A: total_amount untuk pesanannya sendiri tetap bisa dibaca",
    withTotal.status === 200 && rows(withTotal.data).length === 1,
    `status ${withTotal.status}, ${rows(withTotal.data).length} baris`,
  );

  // 6. Kurir TIDAK boleh menulis apa pun ke orders. Ini yang menutup jalan
  //    samping yang paling merusak: tanpa ini, kurir bisa mengubah
  //    `payment_status` sendiri lalu memicu pencairan. Pencairan harus
  //    datang dari bukti penerimaan, bukan dari status yang ditulis kurir.
  const write = await patch(tokenA, `orders?id=eq.${mineA.id}`, {
    payment_status: "fully_paid",
  });
  check(
    "kurir A: UPDATE payment_status DITOLAK",
    write.status >= 400 || rows(write.data).length === 0,
    `status ${write.status}, ${rows(write.data).length} baris berubah`,
  );

  // 7. Menulis `assigned_courier_id` ke baris milik kurir lain juga harus
  //    ditolak, bukan hanya ke barisnya sendiri.
  // Nama kolom PostgREST adalah `snake_case`. Versi camelCase akan membalas
  // 400 dengan "Could not find the column" — status yang BENAR tapi karena
  // alasan yang salah, dan tesnya lulus tanpa menguji apa pun.
  const steal = await patch(tokenA, `orders?id=eq.${mineB.id}`, {
    assigned_courier_id: a.userId,
  });
  check(
    "kurir A: mengambil pesanan kurir lain DITOLAK",
    steal.status >= 400 || rows(steal.data).length === 0,
    `status ${steal.status}, ${rows(steal.data).length} baris berubah`,
  );

  // 8. Verifikasi dari sisi database bahwa penolakan itu sungguhan, bukan
  //    balasan 200 yang diam-diam tidak mengubah apa pun.
  const [afterWrite] = await db
    .select({ paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, mineA.id));
  check(
    "kurir A: payment_status tetap belum dibayar di database",
    afterWrite?.paymentStatus === "unpaid",
    `payment_status=${afterWrite?.paymentStatus}`,
  );

  // 9. Kurir B melihat barisnya sendiri, dan hanya itu.
  const tokenB = await login(b.email);
  const seenB = await get(tokenB, "orders?select=order_code");
  const codesB = rows(seenB.data).map((r) => r.order_code as string);
  check(
    "kurir B: hanya melihat pesanannya sendiri",
    codesB.length === 1 && codesB[0] === mineB.orderCode,
    `terlihat: [${codesB.join(", ")}]`,
  );

  // 10. Policy kurir tidak boleh melonggarkan akses stok bahan. Kurir tidak
  //     butuh tahu stok jadi lemari masih ada.
  const materials = await get(tokenA, "materials?select=name");
  check(
    "kurir A: TIDAK boleh membaca bahan baku",
    materials.status === 200 && rows(materials.data).length === 0,
    `status ${materials.status}, ${rows(materials.data).length} baris`,
  );

  /*
   * 11. Bukti penerimaan milik orang lain tidak boleh terlihat oleh kurir
   *     yang tidak ditugaskan. Tabel ini belum ada di Point 1 — pemeriksaan
   *     ini sengaja menunggu tabelnya dan akan ditambah di Point 2, karena
   *     policies-nya belum ditulis saat skrip ini dibuat.
   */

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} pengujian kurir lulus.\n`,
  );
  await cleanup(tenant.id, otherTenant[0].id, [a, b]);
  process.exit(failed === 0 ? 0 : 1);
}

/**
 * Bersihkan fikstur.
 *
 * Baris audit harus dihapus eksplisit: `integration_audit_logs.tenant_id` memakai
 * `onDelete: "set null"`, jadi baris audit TIDAK ikut terhapus bersama tenant dan
 * kalau tidak dihapus eksplisit setiap menjalankan skrip ini mencampur sampah
 * test ke tabel yang dibaca super admin.
 */
async function cleanup(
  tenantId: string,
  otherTenantId: string,
  couriers: Array<{ userId: string; email: string }>,
) {
  await db.execute(
    sql`delete from integration_audit_logs where tenant_id in (${tenantId}, ${otherTenantId})`,
  );
  // `inArray`, bukan `and(eq(...), eq(...))` — dua tenant BERBEDA di-AND-kan
  // tidak pernah menghasilkan baris, jadi bentuk `and` akan terlihat benar
  // sambil tidak menghapus apa pun.
  await db.delete(orders).where(inArray(orders.tenantId, [tenantId, otherTenantId]));
  await db.delete(users).where(inArray(users.tenantId, [tenantId, otherTenantId]));
  await db.delete(tenants).where(inArray(tenants.id, [tenantId, otherTenantId]));

  const admin = createSupabaseAdmin();
  for (const c of couriers) {
    await admin.auth.admin.deleteUser(c.userId).catch(() => undefined);
  }
  await sqlClient.end();
}

main().catch((err) => {
  console.error("Uji kurir gagal:", err);
  process.exit(1);
});
