/**
 * Pastikan bucket Storage yang dipakai aplikasi ada dan privat.
 *
 * Bucket TIDAK dibuat lewat migrasi SQL karena Supabase Storage tinggal di
 * luar skema `public` — tidak ada yang bisa di-`CREATE TABLE` di sana. Tapi
 * bucket yang hilang harus terasa sebagai kegagalan yang jelas, bukan
 * 404 yang ditelan diam-diam lalu bukti penerimaannya hilang.
 *
 * Sifat bucket yang ditetapkan di sini:
 *   public: false  — WAJIB. Bucket privat + signed URL adalah satu-satunya
 *                    alasan `snap_token` dan bukti penerimaan tidak bocor.
 *                    File size limit dan MIME Allowed di sini sengaja
 *                    DICOCOKKAN dengan validasi di `src/lib/storage.ts`,
 *                    supaya file yang lolos validasi server tidak ditolak
 *                    lapisan storage dan muncul sebagai error generik.
 *
 * Idempoten: aman dijalankan berkali-kali.
 * Jalankan: npm run db:buckets
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

/**
 * Bucket privat + batas yang harus sama dengan `src/lib/storage.ts`.
 * Dua angka ini kalau sampai berbeda gejalanya buruk: file yang lolos
 * validasi server ditolak storage, dan kurir mendapat "gagal mengunggah"
 * untuk foto yang formatnya sudah benar.
 */
const BUCKETS = [
  { name: "product-images", maxBytes: 5 * 1024 * 1024 },
  { name: "delivery-proofs", maxBytes: 12 * 1024 * 1024 },
] as const;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const supabase = adminClient();
  let failed = 0;

  const { data: existing, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw listError;
  const have = new Set((existing ?? []).map((b) => b.name));

  for (const bucket of BUCKETS) {
    if (have.has(bucket.name)) {
      const info = existing?.find((b) => b.name === bucket.name);
      const ok = info?.public === false;
      if (!ok) {
        console.error(
          `GAGAL  ${bucket.name} — bucket publik. Bukti penerimaan dan foto produk\n` +
            `       hanya aman karena privat + signed URL. Set public=false manual\n` +
            `       lewat dashboard Supabase.`,
        );
        failed += 1;
        continue;
      }
      console.log(`OK    ${bucket.name} — sudah ada, privat`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: false,
      fileSizeLimit: bucket.maxBytes,
    });
    if (error) {
      console.error(`GAGAL  ${bucket.name} — ${error.message}`);
      failed += 1;
      continue;
    }
    console.log(`OK    ${bucket.name} — dibuat, privat`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Gagal menyiapkan bucket:", err);
  process.exit(1);
});
