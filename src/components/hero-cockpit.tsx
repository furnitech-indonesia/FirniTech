import {
  CameraIcon,
  CheckIcon,
  CreditCardIcon,
  PackageIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Mockup cockpit untuk hero halaman publik.
 *
 * PENTING soal asal usulnya: panel di bawah dibangun dari elemen DOM, bukan
 * `<img>`. Stitch memakai dua foto dari `lh3.googleusercontent.com` — CDN
 * Google. Itu melanggar DESIGN.md §5 sendiri, yang mengganti Material Symbols
 * dengan Phosphor justru supaya tidak ada permintaan jaringan saat aplikasi
 * dibuka luring atau dibungkus Capacitor (PRD §7.2). Menyalin `<img>` dari
 * CDN akan membatalkan alasan penggantian itu.
 *
 * Slot foto memakai `<div>` bergradien + ikon, bukan gambar, dan disengaja:
 * bentuk produk furniture memang tidak akan cocok dengan stok foto generik,
 * dan pada tampilan publik yang belum ada produk nyata, lebih jujur
 * menampilkan tempat foto akan muncul daripada memamerkan foto rekaan orang
 * lain sebagai produk kita.
 *
 * Angka di sini adalah ILUSTRASI, bukan data. Tidak ada angka dari database
 * yang masuk ke komponen ini; ia tidak menerima props sama sekali. Itu disengaja:
 * begitu pun nanti landing page diubah, tidak mungkin statistik palsu masuk
 * lewat pintu ini.
 */

function PhotoSlot({
  label,
  caption,
  icon: Icon,
}: {
  label: string;
  caption: string;
  icon: typeof PackageIcon;
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder foto produk: ${label}`}
      className="relative flex h-40 flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted p-3"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--accent) 0%, var(--muted) 55%, var(--border) 100%)",
        }}
      />
      <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-card/90 px-2 py-1 text-label-sm text-secondary">
        <Icon size={14} weight="light" aria-hidden />
        {label}
      </span>
      <span className="relative text-label-sm text-secondary">{caption}</span>
    </div>
  );
}

export function HeroCockpit() {
  return (
    <div className="mx-auto mt-10 w-full max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-overlay sm:p-3">
      {/* Bilah "browser" — memberi konteks bahwa ini aplikasi, bukan foto. */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-2 pb-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <span className="truncate rounded-lg border border-border bg-muted px-2.5 py-1 text-label-sm text-muted-foreground">
          app.furnitech.id/dashboard
        </span>
      </div>

      <div className="grid gap-3 pt-3 lg:grid-cols-12">
        {/* Panel 1 — kartu produk */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 lg:col-span-4">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-lg bg-accent px-2 py-0.5 text-label-sm text-accent-foreground">
                SPK-2026-089
              </span>
              <span className="rounded-lg border border-border bg-status-settled-bg px-2 py-0.5 text-label-sm text-status-settled">
                DP lunas
              </span>
            </div>

            <PhotoSlot
              label="Solid teak"
              caption="Foto produk akan tampil di sini"
              icon={PackageIcon}
            />

            <h3 className="mt-3 text-title-md text-foreground">
              Meja Makan Jati Solid 8 Kursi
            </h3>
            <p className="mt-1 text-body-sm text-muted-foreground">
              220 × 100 × 76 cm · Finishing natural oil
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-body-sm text-muted-foreground">Nilai pesanan</span>
            <span className="text-code-tabular font-semibold text-foreground">
              Rp 18.500.000
            </span>
          </div>
        </div>

        {/* Panel 2 — timeline progres (lebar, jadi kolom tengah) */}
        <div className="flex flex-col rounded-xl border border-border bg-muted/40 p-4 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="text-title-md text-foreground">Progres Produksi</h3>
            <span className="text-label-sm text-muted-foreground">5 tahap</span>
          </div>

          <ol className="flex flex-1 flex-col gap-3">
            {[
              { step: "Bahan dipotong", done: true },
              { step: "Perakitan", done: true },
              { step: "Finishing", done: false, current: true },
              { step: "Quality control", done: false },
              { step: "Packing & kirim", done: false },
            ].map((item) => (
              <li key={item.step} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] ${
                    item.done
                      ? "border-status-settled bg-status-settled text-white"
                      : item.current
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {item.done ? <CheckIcon size={12} weight="bold" /> : ""}
                </span>
                <span
                  className={`text-body-md ${
                    item.current
                      ? "font-medium text-foreground"
                      : item.done
                        ? "text-secondary"
                        : "text-muted-foreground"
                  }`}
                >
                  {item.step}
                </span>
                {item.current ? (
                  <span className="ml-auto text-label-sm text-primary">sekarang</span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card p-2.5">
            <CameraIcon size={16} weight="light" className="text-muted-foreground" aria-hidden />
            <span className="text-body-sm text-muted-foreground">
              Foto progres dikirim ke pembeli lewat WhatsApp
            </span>
          </div>
        </div>

        {/* Panel 3 — pembayaran */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 lg:col-span-3">
          <div>
            <h3 className="text-title-md text-foreground">Rincian bayar</h3>

            <dl className="mt-3 flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Harga</dt>
                <dd className="text-code-tabular text-secondary">Rp 18.500.000</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">DP (50%)</dt>
                <dd className="text-code-tabular text-secondary">Rp 9.250.000</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Sisa</dt>
                <dd className="text-code-tabular text-secondary">Rp 9.250.000</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-lg bg-accent/60 p-2.5">
            <p className="flex items-center gap-1.5 text-label-sm text-accent-foreground">
              <CreditCardIcon size={14} weight="light" aria-hidden />
              Ditahan sampai pesanan selesai
            </p>
          </div>
        </div>
      </div>

      <p className="px-1 pt-3 text-label-sm text-muted-foreground">
        Ilustrasi tampilan antarmuka. Angka di panel ini contoh, bukan data
        transaksi.
      </p>
    </div>
  );
}
