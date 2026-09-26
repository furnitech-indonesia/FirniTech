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

export { BUCKET as PRODUCT_IMAGE_BUCKET };
