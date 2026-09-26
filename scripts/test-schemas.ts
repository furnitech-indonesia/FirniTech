/**
 * Uji skema validasi.
 *
 * Mengunci perilaku yang sempat BUG dan sudah diperbaiki:
 *   - "abc" tidak boleh lolos sebagai 0
 *   - "-5" tidak boleh berubah jadi 5
 *   - "+10" harus diterima (form penyesuaian stok menyuruh mengetik "+10")
 *   - field id milik server wajib ada di skema server, dan tidak boleh ada di
 *     skema form
 *
 * Jalankan: npm run test:schemas
 */
import "dotenv/config";

import { parseForm } from "../src/lib/schemas/primitives";
import { adjustStockFormSchema, adjustStockSchema } from "../src/lib/schemas/material";
import { productFormSchema, productSchema } from "../src/lib/schemas/product";
import { customOrderSchema } from "../src/lib/schemas/order";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(label: string, ok: boolean, detail: string) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function main() {
  // ---- Uang: guard transformasi ----
  const basePrice = (value: string) => {
    const parsed = parseForm(
      productFormSchema.pick({ basePrice: true }),
      form({ basePrice: value }),
    );
    return parsed;
  };

  const good = basePrice("Rp 12.500.000");
  check(
    'Uang "Rp 12.500.000" diterima sebagai 12500000',
    good.success && good.data.basePrice === 12_500_000,
    good.success ? String(good.data.basePrice) : JSON.stringify(good.fieldErrors),
  );

  const letters = basePrice("abc");
  check(
    'Uang "abc" DITOLAK (bukan diam-diam jadi 0)',
    !letters.success,
    letters.success ? `LOLOS sebagai ${letters.data.basePrice}` : "ditolak",
  );

  const minus = basePrice("-5");
  check(
    'Uang "-5" DITOLAK (tidak berubah jadi 5)',
    !minus.success,
    minus.success ? `LOLOS sebagai ${minus.data.basePrice}` : "ditolak",
  );

  const zero = basePrice("0");
  check(
    'Uang "0" diterima (produk gratis mungkin sah)',
    zero.success && zero.data.basePrice === 0,
    zero.success ? "diterima" : "ditolak",
  );

  // ---- Penyesuaian stok ----
  const adjust = (delta: string) =>
    parseForm(adjustStockFormSchema, form({ delta, reason: "pembelian" }));

  const plus = adjust("+10");
  check(
    'Penyesuaian "+10" diterima sebagai 10',
    plus.success && plus.data.delta === 10,
    plus.success ? String(plus.data.delta) : JSON.stringify(plus.fieldErrors),
  );

  const minusStock = adjust("-2,5");
  check(
    'Penyesuaian "-2,5" diterima sebagai -2.5',
    minusStock.success && minusStock.data.delta === -2.5,
    minusStock.success ? String(minusStock.data.delta) : JSON.stringify(minusStock.fieldErrors),
  );

  const nol = adjust("0");
  check(
    'Penyesuaian "0" DITOLAK (perubahan nol tidak ada artinya)',
    !nol.success,
    nol.success ? "LOLOS" : "ditolak",
  );

  // ---- Skema server mewajibkan id, skema form tidak ----
  const serverNoId = parseForm(adjustStockSchema, form({ delta: "1", reason: "pemakaian" }));
  check(
    "Skema server mewajibkan materialId",
    !serverNoId.success && Boolean(serverNoId.fieldErrors.materialId),
    serverNoId.success ? "LOLOS tanpa id" : "ditolak",
  );

  const serverBadId = parseForm(
    adjustStockSchema,
    form({ delta: "1", reason: "pemakaian", materialId: "bukan-uuid" }),
  );
  check(
    "materialId bukan uuid ditolak",
    !serverBadId.success,
    serverBadId.success ? "LOLOS" : "ditolak",
  );

  const formHasId = "materialId" in adjustStockFormSchema.shape;
  check(
    "Skema form TIDAK memuat field id milik server",
    !formHasId,
    formHasId ? "masih ada" : "bersih",
  );

  const productFormHasId = "id" in productFormSchema.shape;
  check(
    "productFormSchema tidak memuat id, productSchema memuatnya",
    !productFormHasId && "id" in productSchema.shape,
    `form=${productFormHasId}, server=${"id" in productSchema.shape}`,
  );

  // ---- Validasi field mengembalikan pesan per field ----
  const badOrder = parseForm(
    customOrderSchema,
    form({
      customerName: "",
      customerPhone: "0812",
      customerAddress: "Jl. Merdeka",
      destinationCity: "Bandung",
      itemName: "Meja",
      price: "9.500.000",
      quantity: "1",
    }),
  );
  check(
    "Error dikembalikan PER FIELD, bukan satu pesan umum",
    !badOrder.success &&
      Boolean(badOrder.fieldErrors.customerName) &&
      Boolean(badOrder.fieldErrors.customerPhone),
    badOrder.success
      ? "LOLOS"
      : Object.keys(badOrder.fieldErrors).join(", "),
  );

  // ---- Pesan error harus Bahasa Indonesia ----
  const empty = parseForm(productFormSchema, new FormData());
  // ParseResult adalah union; di cabang gagal fieldErrors selalu ada.
  const messages: string[] = empty.success
    ? []
    : Object.values(empty.fieldErrors);
  const allIndonesian = messages.every(
    (m) => !/^Invalid input|^Too small|^Too big/i.test(m),
  );
  check(
    "Pesan zod bawaan diterjemahkan ke Bahasa Indonesia",
    allIndonesian && messages.length > 0,
    messages.slice(0, 2).join(" | "),
  );

  // ---- Checkbox (dengan seluruh field wajib terisi) ----
  const checked = form({
    name: "Meja",
    lengthCm: "100",
    widthCm: "60",
    heightCm: "75",
    woodType: "Jati",
    finishingType: "Matte",
    basePrice: "1000000",
    isPublished: "on",
  });
  const withCheckbox = parseForm(productFormSchema, checked);
  check(
    'Checkbox "on" dibaca sebagai boolean true',
    withCheckbox.success && withCheckbox.data.isPublished === true,
    withCheckbox.success
      ? String(withCheckbox.data.isPublished)
      : JSON.stringify(withCheckbox.fieldErrors),
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} pengujian skema lulus.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
