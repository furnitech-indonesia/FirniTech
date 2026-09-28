/**
 * Ukur kotak mark di dalam `public/icon.svg`.
 *
 * Dipakai HANYA ketika logo diekspor ulang dan posisinya bergeser. Salin
 * hasil keluaran ke `CROP` di `scripts/make-icons.ts`, lalu jalankan
 * `npm run make:icons`.
 *
 * Cara kerjanya: decode PNG yang tertanam di dalam SVG, petakan piksel yang
 * berisi tinta, lalu cari celah putih yang memisahkan blok-blok isi. Blok
 * PERTAMA dari atas adalah mark (rumah + kursi); setelahnya wordmark lalu
 * tagline.
 *
 * Memakai decoder PNG sendiri karena repo ini tidak punya pustaka gambar:
 * `sharp` atau `pngjs` untuk satu pekerjaan sekali seumur proyek tidak
 * sepadan. `make-icons.ts` sendiri tidak butuh ini — ia memotong di browser.
 *
 * Jalankan: npm run make:icons:measure
 */
import { existsSync, readFileSync } from "fs";
import { inflateSync } from "zlib";

const SOURCE = "public/icon.svg";

/** Ambil PNG yang tertanam sebagai base64 di dalam SVG. */
function extractPng(): Buffer {
  if (!existsSync(SOURCE)) {
    throw new Error(`${SOURCE} tidak ditemukan.`);
  }
  const raw = readFileSync(SOURCE, "utf8");
  const match = raw.match(/base64,([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      "Tidak menemukan gambar tertanam (base64) di " +
        SOURCE +
        ". Kalau file ini SVG vektor, tidak perlu diukur — biarkan CROP di make-icons.ts apa adanya.",
    );
  }
  return Buffer.from(match[1], "base64");
}

/** Nilai kanal terkecil per piksel: 255 = putih, kecil = ada tinta. */
function decode(png: Buffer): { width: number; height: number; grey: Uint8Array } {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (pos < png.length) {
    const length = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = png.readUInt32BE(pos + 8);
      height = png.readUInt32BE(pos + 12);
      colorType = png[pos + 17];
    } else if (type === "IDAT") {
      idat.push(png.subarray(pos + 8, pos + 8 + length));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] ?? 4;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const previous = Buffer.alloc(stride);
  const grey = new Uint8Array(width * height);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset];
    offset += 1;
    const line = Buffer.from(raw.subarray(offset, offset + stride));
    offset += stride;

    // Lima filter PNG. Menyalinnya satu per satu adalah satu-satunya cara
    // tanpa pustaka; filter `Paeth` ikut ditulis lengkap karena tanpa itu
    // gambarnya bergeser dan kotak yang terukur jadi salah.
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        line[i] = (line[i] + pr) & 0xff;
      }
    }

    for (let x = 0; x < width; x += 1) {
      let min = 255;
      for (let c = 0; c < channels; c += 1) {
        const v = line[x * channels + c];
        if (v < min) min = v;
      }
      grey[y * width + x] = min;
    }
    line.copy(previous);
  }

  return { width, height, grey };
}

function main() {
  const { width, height, grey } = decode(extractPng());

  // Ambang "ada tinta": di bawah 245 dianggap putih. 245 bukan 255 supaya
  // anti-aliasing tepi yang samar ikut terukur sebagai isi.
  const hasInk = (i: number) => grey[i] < 245;
  const rowInk = new Uint32Array(height);
  for (let y = 0; y < height; y += 1) {
    let n = 0;
    for (let x = 0; x < width; x += 1) if (hasInk(y * width + x)) n += 1;
    rowInk[y] = n;
  }

  const threshold = Math.max(1, width * 0.002);
  const inkedRows: number[] = [];
  for (let y = 0; y < height; y += 1) if (rowInk[y] >= threshold) inkedRows.push(y);
  if (inkedRows.length === 0) throw new Error("Gambar kosong.");

  // Celah putih yang memisahkan blok isi.
  const gaps: Array<{ from: number; to: number }> = [];
  let runStart = -1;
  for (let y = 0; y < height; y += 1) {
    if (rowInk[y] < threshold) {
      if (runStart < 0) runStart = y;
    } else if (runStart >= 0) {
      gaps.push({ from: runStart, to: y - 1 });
      runStart = -1;
    }
  }
  if (runStart >= 0) gaps.push({ from: runStart, to: height - 1 });

  // Celah yang MEMANG memisahkan isi, yaitu yang diapit baris berisi tinta di
  // kedua sisinya. Celah di tepi kanvas bukan pemisah.
  const separators = gaps.filter(
    (g) =>
      g.from > inkedRows[0] &&
      g.to < inkedRows[inkedRows.length - 1] &&
      g.to - g.from > height * 0.01,
  );

  const markTop = inkedRows[0];
  const markBottom = separators.length > 0 ? separators[0].from - 1 : inkedRows[inkedRows.length - 1];

  let minX = width;
  let maxX = 0;
  for (let y = markTop; y <= markBottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!hasInk(y * width + x)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }

  const widthPx = maxX - minX + 1;
  const heightPx = markBottom - markTop + 1;

  console.log(`Kanvas           : ${width} x ${height}`);
  console.log(`Isi vertikal     : y ${inkedRows[0]} .. ${inkedRows[inkedRows.length - 1]}`);
  console.log(`Celah pemisah    : ${separators.length - 1} (antar mark, wordmark, tagline)`);
  for (const s of separators) {
    console.log(`                  y ${s.from}..${s.to}`);
  }
  console.log("");
  console.log(`MARK             : x ${minX}..${maxX}  y ${markTop}..${markBottom}`);
  console.log(`UKURAN MARK      : ${widthPx} x ${heightPx}`);
  console.log(`di ikon 48px    : ${Math.round((widthPx / width) * 48)} x ${Math.round((heightPx / height) * 48)} px`);
  console.log("");
  console.log("Salin ke CROP di scripts/make-icons.ts:");
  console.log(
    `const CROP = { x: ${minX}, y: ${markTop}, width: ${widthPx}, height: ${heightPx} } as const;`,
  );
}

main();
