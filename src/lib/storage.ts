import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Foto produk di Supabase Storage, bucket `product-images` (PRIVAT).
 *
 * Karena privat, halaman publik WAJIB memakai signed URL — tidak boleh
 * menempelkan object path mentah ke `<img src>`, karena akan 400/403.
 * Signed URL kedaluwarsa, jadi jangan disimpan di database.
 */

const BUCKET = "product-images";

/**
 * Bucket bukti penerimaan, PRIVAT.
 *
 * Berbeda dari `product-images` yang bucket-nya di-hardcode di modul ini,
 * bucket ini tidak dibuat lewat migrasi dan tidak dibuat otomatis saat
 * boot: isinya bukti yang memicu pencairan, jadi bucket yang tidak ada
 * harus terasa sebagai KEGAGALAN yang jelas, bukan sekadar 404 yang
 * ditelan diam-diam lalu bukti hilang.
 */
const PROOF_BUCKET = "delivery-proofs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.",
    );
  }
  // Service role dipakai HANYA di server, dan untuk operasi storage.
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Validasi upload sebelum mengirim ke storage.
 * Bucket hanya boleh berisi gambar, ukuran dibatasi supaya mencegah penyalahgunaan.
 */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function validateProductImage(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Format foto harus JPEG, PNG, WebP, atau AVIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }
  if (file.size === 0) {
    throw new Error("File foto kosong.");
  }
}

/**
 * Unggah foto dan kembalikan OBJECT PATH (bukan URL publik).
 * Path disimpan di products.images; URL dibuat lewat signed URL saat render.
 */
export async function uploadProductImage({
  tenantId,
  productSlug,
  file,
}: {
  tenantId: string;
  productSlug: string;
  file: File;
}): Promise<string> {
  validateProductImage(file);

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  // Nama file dibuat dari nilai acak, BUKAN dari input pengguna: mencegah
  // path traversal sekaligus membuat nama tidak bentrok.
  const random = crypto.randomUUID();
  const path = `${tenantId}/${productSlug}/${random}.${extension}`;

  const { error } = await adminClient().storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah foto: ${error.message}`);
  }

  return path;
}

/** Signed URL untuk render. Null bila path kosong atau gagal. */
export async function createProductImageSignedUrl(
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await adminClient().storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl ?? null;
}

/** Buat banyak signed URL sekaligus (lebih hemat daripada satu per foto). */
export async function createSignedUrls(
  paths: readonly string[],
  expiresInSeconds = 60 * 60,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await adminClient().storage
    .from(BUCKET)
    .createSignedUrls([...paths], expiresInSeconds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Hapus objek dari storage (dipakai saat produk dihapus). */
export async function deleteProductImage(path: string): Promise<void> {
  await adminClient().storage.from(BUCKET).remove([path]);
}

/* ==========================================
   BUKTI PENERIMAAN (Sprint 6)
   ========================================== */

/**
 * Batas ukuran bukti.
 *
 * BEDA dari foto produk, dan alasannya nyata: yang diunggah kurir di HP,
 * di bawah pageable, sambil memegang paket, jadi sering kali foto
 * beresolusi penuh dari kamera HP yang jauh lebih besar dari foto produk
 * yang diunggah orang dari komputer. Batas 5 MB akan menolak sebagian
 * besar pengiriman yang sebenarnya sah, dan kurir yang gagal mengunggah
 * bukti berarti pencairan tidak jalan.
 *
 * TETAP ADA batasnya: tanpa batas, storage jadi tempat menaruh berkas
 * sembarang lewat endpoint yang bisa dipanggil siapa pun yang punya sesi
 * kurir.
 */
const PROOF_MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const SIGNATURE_MAX_BYTES = 512 * 1024; // 512 KB, PNG dari canvas

export function validateDeliveryPhoto(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Foto barang harus JPEG, PNG, WebP, atau AVIF.");
  }
  if (file.size > PROOF_MAX_BYTES) {
    throw new Error("Ukuran foto maksimal 12 MB.");
  }
  if (file.size === 0) {
    throw new Error("Foto barang kosong.");
  }
}

/**
 * Tanda tangan datang sebagai data URL PNG dari canvas, bukan sebagai File.
 *
 * Diperiksa di sini, bukan di server action, karena yang perlu dijaga
 * adalah "jangan pernah trusting apa pun yang masuk lewat FormData" — dan
 * `data:image/png;base64,` yang dichirim klien bisa ridden dengan muatan
 * apa saja setelah tanda koma pertama. Pemeriksaan MIME dan ukuran tetap
 * dilakukan di server, tapi kemungkinannya untuk dilewati hampir nol kalau
 * FormData-nya memang sudah jadi PNG.
 */
export function decodeSignatureDataUrl(dataUrl: string): {
  bytes: Uint8Array;
  mime: string;
} {
  const match = /^data:(image\/(?:png|jpeg));base64,/.exec(dataUrl);
  if (!match) {
    throw new Error("Tanda tangan tidak terbaca. Minta yang menerima menandatangani ulang.");
  }
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (base64.length === 0) {
    throw new Error("Tanda tangan kosong.");
  }
  // Perkiraan ukuran: 4 karakter base64 = 3 byte.
  if ((base64.length * 3) / 4 > SIGNATURE_MAX_BYTES) {
    throw new Error("Tanda tangan terlalu besar. Minta yang menerima menandatangani sekali saja.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime: match[1] };
}

/**
 * Unggah foto bukti barang. Mengembalikan OBJECT PATH, bukan URL.
 *
 * Path-nya memuat `orderId`, dan itu bukan cuma soal kerapian: dengan begitu
 * seluruh bukti untuk satu pesanan berada di satu prefix, dan itu yang
 * membuat penghapusan massal saat tenant dihapus tidak memerlukan daftar
 * path yang harus disimpan di tempat lain.
 */
export async function uploadDeliveryPhoto({
  tenantId,
  orderId,
  file,
}: {
  tenantId: string;
  orderId: string;
  file: File;
}): Promise<string> {
  validateDeliveryPhoto(file);

  const extension = file.type === "image/png" ? "png" : "jpg";
  const path = `${tenantId}/${orderId}/barang-${crypto.randomUUID()}.${extension}`;

  const { error } = await adminClient().storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah foto barang: ${error.message}`);
  }
  return path;
}

/** Unggah hasil render tanda tangan. Byte-nya sudah divalidasi terpisah. */
export async function uploadSignature({
  tenantId,
  orderId,
  bytes,
  mime,
}: {
  tenantId: string;
  orderId: string;
  bytes: Uint8Array;
  mime: string;
}): Promise<string> {
  const extension = mime === "image/png" ? "png" : "jpg";
  const path = `${tenantId}/${orderId}/tanda-${crypto.randomUUID()}.${extension}`;

  const { error } = await adminClient().storage
    .from(PROOF_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah tanda tangan: ${error.message}`);
  }
  return path;
}

/**
 * Bukti transfer COD: foto struk atau screenshot mutasi rekening.
 *
 * Batasnya 12 MB, sama dengan foto barang, dan formatnya sama — karena
 * ini juga hasil kamera HP di tempat. Bedanya hanya satu: berkas ini
 * berisi nomor rekening dan mutasi, jadi ia tidak boleh pernah keluar
 * lewat signed URL yang berumur satu jam tanpa diperiksa pemanggilnya.
 * `createDeliveryProofUrls` tidak membedakan jenis berkasnya; pemanggil
 * yang memutuskan. Jangan memakai helper itu tanpa menguji siapa yang
 * boleh melihat.
 */
export async function uploadDeliveryCodProof({
  tenantId,
  orderId,
  file,
}: {
  tenantId: string;
  orderId: string;
  file: File;
}): Promise<string> {
  validateDeliveryPhoto(file);
  const extension = file.type === "image/png" ? "png" : "jpg";
  const path = `${tenantId}/${orderId}/cod-${crypto.randomUUID()}.${extension}`;

  const { error } = await adminClient().storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah bukti transfer COD: ${error.message}`);
  }
  return path;
}

/** Signed URL untuk render bukti. Null bila path kosong atau gagal. */
export async function createDeliveryProofUrl(
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await adminClient()
    .storage.from(PROOF_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl ?? null;
}

export async function createDeliveryProofUrls(
  paths: readonly string[],
  expiresInSeconds = 60 * 60,
): Promise<Record<string, string>> {
  const usable = paths.filter((p) => Boolean(p));
  if (usable.length === 0) return {};

  const { data, error } = await adminClient()
    .storage.from(PROOF_BUCKET)
    .createSignedUrls([...usable], expiresInSeconds);

  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Hapus seluruh bukti untuk satu pesanan (dipakai kalau salah unggah). */
export async function deleteDeliveryProofObjects(paths: readonly string[]) {
  if (paths.length === 0) return;
  await adminClient().storage.from(PROOF_BUCKET).remove([...paths]);
}

export { BUCKET as PRODUCT_IMAGE_BUCKET, PROOF_BUCKET as DELIVERY_PROOF_BUCKET };
