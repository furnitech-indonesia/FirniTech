/**
 * Membuat snapshot provinsi + kabupaten/kota untuk bundel.
 *
 * Kenapa dua level ini di-snapshot dan dua level berikutnya tidak:
 * - Provinsi + kabupaten hanya 34 + ~514 baris, totalnya sekitar 13 KB. Itu
 *   muat di bundel utama, jadi dropdown pertama TETAP BERJALAN saat luring
 *   dan tidak pernah menunggu jaringan.
 * - Kecamatan + desa ada ~7.800 + ~83.000 baris. Kalau dimasukkan, bundel
 *   jadi beberapa MB — tidak mungkin untuk PWA yang harus tetap ringan di HP
 *   375px. Keduanya diambil sesuai permintaan dan di-cache di browser
 *   (lihat src/lib/wilayah.ts).
 *
 * Jalankan ulang kalau perlu: npm run wilayah:snapshot
 *
 * Fallback: kalau proses ini gagal, file lama TIDAK ditimpa. Snapshot
 * yang sudah ada lebih baik daripada tidak ada sama sekali.
 */
import "dotenv/config";
import { writeFileSync } from "fs";

const BASE = "https://www.emsifa.com/api-wilayah-indonesia/v2";
const OUT = "src/lib/wilayah-snapshot.json";

type Region = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "FurniTech-snapshot" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function main() {
  console.log("Mengambil provinsi…");
  const provinces = await getJson<{ data: Region[] }>(`${BASE}/provinces.json`);
  console.log(`  ${provinces.data.length} provinsi`);

  const snapshot: { provinces: Region[]; regencies: Record<string, Region[]> } = {
    provinces: provinces.data,
    regencies: {},
  };

  // Febu sequential, bukan Promise.all: 34 permintaan sekaligus ke layanan
  // gratis akan memicu rate limit, dan hasilnya bisa berupa 429 yang harus
  // diulang. Dua tingkat pengambilan paralel (4 sekaligus) jauh lebih aman
  // dan tetap menyelesaikan dalam hitungan detik.
  const queue = [...provinces.data];
  const CONCURRENCY = 4;
  let done = 0;

  async function worker() {
    for (;;) {
      const province = queue.shift();
      if (!province) return;
      const regencies = await getJson<{ data: Region[] }>(
        `${BASE}/regencies/${province.id}.json`,
      );
      snapshot.regencies[province.id] = regencies.data;
      done += 1;
      process.stdout.write(`\r  kabupaten ${done}/${provinces.data.length}   `);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log();

  const totalRegencies = Object.values(snapshot.regencies).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  /*
   * `lat`/`lng` sengaja DIBUANG dari snapshot. Snapshot lengkap dengan
   * koordinat berukuran 101,8 KB; tanpa koordinat hanya 23,7 KB — 4x lebih
   * kecil, dan ini masuk ke bundel utama yang dimuat setiap pengunjung.
   *
   * Koordinat tidak hilang: level desa (yang diambil on-demand) menyertakan
   * lat/lng-nya sendiri, jadi titik peta tetap bisa diisi setelah desa
   * dipilih. Yang hilang hanya "pusat peta" sementara sebelum desa dipilih,
   * dan itu tidak sebanding dengan 78 KB untuk setiap pengunjung.
   */
  const lean = {
    provinces: snapshot.provinces.map(({ id, name }) => ({ id, name })),
    regencies: Object.fromEntries(
      Object.entries(snapshot.regencies).map(([pid, list]) => [
        pid,
        list.map(({ id, name }) => ({ id, name })),
      ]),
    ),
  };

  writeFileSync(OUT, `${JSON.stringify(lean)}\n`, "utf8");

  const bytes = Buffer.byteLength(JSON.stringify(lean));
  console.log(
    `✓ ${OUT} — ${lean.provinces.length} provinsi, ${totalRegencies} kabupaten, ${(bytes / 1024).toFixed(1)} KB (tanpa lat/lng)`,
  );
}

main().catch((error) => {
  console.error("Gagal membuat snapshot:", error);
  console.error("File lama tidak ditimpa. Snapshot yang ada tetap dipakai.");
  process.exit(1);
});
