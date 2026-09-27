import "dotenv/config";

import { chromium } from "playwright";
import { eq, inArray } from "drizzle-orm";

import { db, sqlClient as sql } from "../src/db/client";
import { orderItems, orders, productionProgress, tenants, users } from "../src/db/schema";
import { createSupabaseAdmin } from "../src/lib/supabase/admin";

/**
 * Uji Antrean Produksi untuk tukang (ROADMAP Sprint 4).
 *
 * Halaman ini tidak bisa diperiksa secara struktural, karena separuh yang
 * diujinya memang soal apa yang TIDAK tampil: nominal rupiah, pesanan rekan
 * kerja, dan pesanan yang sudah selesai. Membaca source code tidak bisa
 * membuktikan ketiganya tidak bocor ke layar — hanya merender halaman yang
 * bisa.
 *
 * DoD yang diuji (ROADMAP Sprint 4):
 *   "target sentuh >= 44px, satu tangan, tetap jelas di layar 375px tanpa
 *    geser horizontal"
 *
 * Fikstur dibuat sendiri lalu dibersihkan di `finally`, termasuk user Auth-nya.
 * Jalankan: npm run test:carpenter  (server harus sudah jalan)
 */
const PASSWORD = "BengkelKuat9";
const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const TENANT_NAME = "Bengkel Uji Carpenter";
const CODES = ["ORD-UJI-BNGK-1", "ORD-UJI-BNGK-LAIN", "ORD-UJI-BNGK-SELESAI"] as const;

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS " : "FAIL "} ${label} — ${detail}`);
}

type Made = { userId: string; email: string };

/**
 * Buat akun tukang yang bisa benar-benar login.
 *
 * Baris `users` untuk email ini tidak dibuat trigger, karena fikstur menyisipkan
 * baris placeholder lebih dulu dan `user_email_idx` unik pada lower(email)
 * membuat trigger gagal. Jadi placeholder dibuang dan baris yang benar
 * disisipkan dengan id dari auth.users — persis seperti `provisionOwner`
 * melakukan|.
 */
async function makeCarpenter(
  tenantId: string,
  fullName: string,
  phone: string,
): Promise<Made> {
  const email = `${fullName.split(" ")[1]?.toLowerCase()}.${Date.now()}@uji.test`;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (!data?.user) throw new Error(`gagal membuat auth user ${email}`);

  await db.delete(users).where(eq(users.email, email));
  await db.insert(users).values({
    id: data.user.id,
    tenantId,
    email,
    fullName,
    phone,
    role: "tukang",
  });
  return { userId: data.user.id, email };
}

async function main() {
  // Server harus hidup; tanpa ini `page.goto` melempar dan tidak ada yang
  // bisa dibedakan antara bug UI dan server mati.
  const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    console.error(`Server tidak berjalan di ${BASE} — jalankan \`npm run build && npm run start\`.`);
    process.exit(2);
  }

  // Sisa fikstur dari eksekusi yang gagal sebelumnya.
  await db.delete(orders).where(inArray(orders.orderCode, [...CODES]));
  await db.delete(users).where(eq(users.fullName, "Pak Budi Uji"));
  await db.delete(tenants).where(eq(tenants.name, TENANT_NAME));

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: TENANT_NAME,
      slug: `uji-tukang-${Date.now()}`,
      plan: "basic",
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      isActive: true,
    })
    .returning();

  const made: Made[] = [];

  try {
    const budi = await makeCarpenter(tenant.id, "Pak Budi Uji", "081200000000");
    const agus = await makeCarpenter(tenant.id, "Pak Agus Uji", "081200000001");
    made.push(budi, agus);

    const [mine] = await db
      .insert(orders)
      .values({
        tenantId: tenant.id,
        assignedCarpenterId: budi.userId,
        orderCode: CODES[0],
        customerName: "Ibu Ratna",
        customerPhone: "08123456789",
        customerAddress: "Jl. Contoh No. 1",
        destinationCity: "Bandung",
        itemsSubtotal: 4_500_000,
        shippingFee: 150_000,
        totalAmount: 4_650_000,
        dpAmount: 1_000_000,
        orderStatus: "in_production",
        paymentStatus: "dp_paid",
      })
      .returning();

    await db.insert(orderItems).values([
      {
        orderId: mine.id,
        productName: "Meja Makan Jati",
        quantity: 1,
        price: 3_500_000,
        customSpecs: {
          lengthCm: 180,
          widthCm: 90,
          heightCm: 75,
          woodType: "Jatisolid",
          finishingType: "Melamin glossy",
        },
      },
      {
        orderId: mine.id,
        productName: "Kursi Tamu",
        quantity: 4,
        price: 250_000,
        customSpecs: {
          lengthCm: 45,
          widthCm: 45,
          heightCm: 90,
          woodType: "Kayu Aron",
        },
      },
    ]);

    // Dua tahap terunggah; yang terakhir harus yang ditampilkan.
    await db.insert(productionProgress).values([
      {
        orderId: mine.id,
        carpenterId: budi.userId,
        carpenterName: "Pak Budi Uji",
        stage: "bahan_dipotong",
        photoUrl: "probe://1",
        createdAt: new Date(Date.now() - 7_200_000),
      },
      {
        orderId: mine.id,
        carpenterId: budi.userId,
        carpenterName: "Pak Budi Uji",
        stage: "perakitan",
        photoUrl: "probe://2",
        createdAt: new Date(Date.now() - 3_600_000),
      },
    ]);

    // Pesanan tukang lain: tidak boleh bocor ke antrean Budi.
    await db.insert(orders).values({
      tenantId: tenant.id,
      assignedCarpenterId: agus.userId,
      orderCode: CODES[1],
      customerName: "Bukan Urusan Budi",
      customerPhone: "081299999999",
      customerAddress: "Jl. X No. 1",
      destinationCity: "Solo",
      itemsSubtotal: 100,
      shippingFee: 0,
      totalAmount: 100,
      orderStatus: "in_production",
      paymentStatus: "unpaid",
    });

    // Pesanan selesai: tidak boleh muncul di antrean sama sekali.
    await db.insert(orders).values({
      tenantId: tenant.id,
      assignedCarpenterId: budi.userId,
      orderCode: CODES[2],
      customerName: "Sudah Selesai",
      customerPhone: "081277777777",
      customerAddress: "Jl. Y No. 2",
      destinationCity: "Malang",
      itemsSubtotal: 100,
      shippingFee: 0,
      totalAmount: 100,
      orderStatus: "completed",
      paymentStatus: "fully_paid",
    });

    const browser = await chromium.launch();
    // 375px: lebar iPhone SE/8 dan Android kelas bawah, dan hanya layar ini
    // yang wajib diuji kalau DoD-nya menyebut "satu tangan".
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(budi.email);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: /masuk/i }).last().click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto(`${BASE}/dashboard/pesanan`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const text = await page.locator("main").innerText();

    check("halaman adalah Antrean Produksi", /Antrean Produksi/.test(text), text.split("\n")[0]);
    check("pesanan sendiri tampil", text.includes(CODES[0]), "ada");
    check("pesanan tukang lain TIDAK bocor", !text.includes(CODES[1]), "tidak ada");
    check("pesanan selesai tidak di antrean", !text.includes(CODES[2]), "tidak ada");
    check(
      "dimensi tampil dalam cm dan lengkap",
      /P 180 .*L 90 .*T 75 cm/.test(text),
      (text.match(/P .*cm/) ?? ["tidak ada"])[0],
    );
    check(
      "jumlah item benar (4x Kursi Tamu)",
      text.includes("Meja Makan Jati") && text.includes("4× Kursi Tamu"),
      "2 item",
    );
    check(
      "bahan & finishing tampil",
      text.includes("Jatisolid") && text.includes("Melamin glossy"),
      "ada",
    );
    check(
      "tahap terbaru = Perakitan (2 dari 5), bukan tahap pertama",
      /Perakitan \(2 dari 5\)/.test(text),
      (text.match(/Tahap:.*/) ?? ["tidak ada"])[0],
    );
    check("tidak ada nominal rupiah di layar tukang", !/Rp\s?[\d.]+/.test(text), "tidak ada");
    check("ada tombol Unggah foto", text.includes("Unggah foto progres"), "ada");

    /*
     * Tautan `wa.me`. Yang diuji bukan cuma "tombolnya ada" — kalau nomornya
     * salah format, WhatsApp terbuka tanpa tujuan dan tukang baru sadar
     * setelah menekan kirim, jadi ke pembeli yang salah.
     */
    const waHref = await page
      .locator('a[href^="https://wa.me/"]')
      .first()
      .getAttribute("href");
    check("ada tombol Kirim lewat WhatsApp", text.includes("Kirim lewat WhatsApp"), "ada");
    check(
      "tautan wa.me memakai format 628… (nomor 08xx dinormalisasi)",
      /^https:\/\/wa\.me\/62\d{9,13}\?text=/.test(waHref ?? ""),
      waHref ? waHref.split("?")[0] : "(tidak ada tautan)",
    );
    const waText = decodeURIComponent((waHref ?? "").split("?text=")[1] ?? "");
    check(
      "pesan pembuka menyebut nama pembeli & kode pesanan",
      waText.includes("Ibu Ratna") && waText.includes("ORD-UJI-BNGK-1"),
      waText.split("\n").filter(Boolean)[0] ?? "(kosong)",
    );
    check(
      "label jujur: aplikasi tidak mengirim fotonya",
      text.includes("Pilih fotonya di sana"),
      "ada penjelasan",
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check("tidak ada geser horizontal di 375px", overflow <= 0, `overflow=${overflow}px`);

    const tooSmall = await page.evaluate(() => {
      const els = [...document.querySelectorAll<HTMLElement>('a[href*="/dashboard/pesanan/"]')];
      return els.filter((el) => el.getBoundingClientRect().height < 44).length;
    });
    check("tidak ada target sentuh di bawah 44px", tooSmall === 0, `${tooSmall} elemen terlalu pendek`);

    await page.screenshot({ path: "screenshots/carpenter-375.png", fullPage: true });
    await page.close();
    await context.close();
    await browser.close();
  } finally {
    await db.delete(orders).where(inArray(orders.orderCode, [...CODES]));
    await db.delete(users).where(eq(users.fullName, "Pak Budi Uji"));
    await db.delete(users).where(eq(users.fullName, "Pak Agus Uji"));
    await db.delete(tenants).where(eq(tenants.id, tenant.id));

    // User Auth tidak ikut terhapus oleh cascade, jadi harus dihapus sendiri.
    const admin = createSupabaseAdmin();
    for (const person of made) {
      await admin.auth.admin.deleteUser(person.userId).catch(() => {});
    }
    await sql.end();
  }

  console.log(
    failures === 0
      ? "\nSemua pemeriksaan antrean tukang lulus."
      : `\n${failures} pemeriksaan antrean tukang gagal.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
