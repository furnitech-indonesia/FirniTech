"use client";

import { useState } from "react";
import { CalculatorIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { parseRupiah } from "@/lib/parse";
import {
  FEE_MASUK,
  FEE_MASUK_PPNJ,
  FEE_PENCAIRAN_PER_BATCH,
  PLATFORM_FEE_RATE,
  SLOT_PENCAIRAN,
  craftsmanCreditFor,
  minimumPriceFor,
  platformFeeFor,
} from "@/lib/fees";

/**
 * Modal kalkulator biaya di modul produk (Sprint 6, keputusan pemilik
 * produk).
 *
 * Tujuannya satu: pengrajin bisa menghitung harga jual yang dia inginkan,
 * dengan melihat sendiri berapa yang akan dipotong. Tanpa angka ini, dia
 * baru tahu kehilangan 1,5% + Rp 4.440 setelah uangnya ditransfer.
 *
 * YANG DISENGaja TAMPIL BERPIHAK
 * Modal ini menampilkan fee pencairan Rp 5.000 meskipun itu ditanggung
 * platform. Menyembunyikannya akan membuat pengrajin menghitung ulang
 * tanpa dasar, atau lebih buruk: menganggap platform membebankan Rp 9.440
 * padanya padahal yang benar-benar dipotong hanya Rp 4.440. Angka yang
 * dipisah-pisah lebih dipercaya daripada satu angka total yang salah
 * arti.
 *
 * TAPI bagian "beban yang memotong uang Anda" hanya berisi fee yang
 * BENAR-BENAR memotong saldonya. Kalau tidak, pengrajin akan menghitung harga terlalu
 * tinggi — dan itu memindahkan kerugian dari platform ke pembeli, yang jauh
 * lebih merusak hubungan dengan pelanggan toko itu sendiri.
 *
 * SEMUA ANGKA DARI `src/lib/fees.ts`, tidak ada yang diketik ulang. Kalau
 * fee di server berubah dan modal tidak, pengrajin akan melihat angka yang
 * tidak sama dengan yang benar-benar dipotong — dan itu persis kesalahan
 * yang modal ini ada untuk mencegah.
 */
export function FeeCalculatorDialog({
  /** Harga yang sedang diisi di form produk, kalau ada. */
  initialPrice,
}: {
  initialPrice?: number;
}) {
  const [open, setOpen] = useState(false);
  const [priceText, setPriceText] = useState(
    initialPrice && initialPrice > 0 ? String(initialPrice) : "",
  );
  const [targetText, setTargetText] = useState("");

  const price = parseRupiah(priceText);
  const target = parseRupiah(targetText);

  const fee = price > 0 ? platformFeeFor(price) : 0;
  const credit = price > 0 ? craftsmanCreditFor(price) : 0;
  const needed = target > 0 ? minimumPriceFor(target) : 0;
  const shortfall = price > 0 && target > 0 ? target - credit : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="touch" />}>
        <CalculatorIcon size={18} weight="light" aria-hidden />
        Hitung biaya transaksi
      </DialogTrigger>

      {/*
        `max-h-[85dvh]` + scroll: di 375×812 isinya lebih tinggi dari
        viewport, dan DialogContent Base UI tidak membatasi tinggi sendiri —
        tanpa ini tombol "Tutup" dan catatan kanal pembayaran bisa keluar
        layar dan tidak terjangkau di HP kelas bawah.
      */}
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Biaya transaksi di FurniTech</DialogTitle>
          <DialogDescription>
            Angka di bawah dipakai sistem saat pesanan dibayar. Untuk hasil
            hitungan yang benar, pakai{" "}
            {(PLATFORM_FEE_RATE * 100).toLocaleString("id-ID")}% + Rp{" "}
            {FEE_MASUK.toLocaleString("id-ID")} — bukan angka lain.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <Field>
            <FieldLabel htmlFor="fee-calc-price">Harga jual</FieldLabel>
            <Input
              id="fee-calc-price"
              name="hargaJual"
              inputMode="numeric"
              placeholder="Contoh: 10000000"
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
            />
          </Field>

          {price > 0 ? (
            <dl className="grid gap-2 rounded-xl border border-border bg-card p-4 text-body-md">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Harga yang dibayar pembeli</dt>
                <dd className="text-code-tabular text-foreground">
                  {formatRupiah(price)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  Biaya layanan FurniTech (1,5%)
                </dt>
                <dd className="text-code-tabular text-foreground">
                  −{formatRupiah(fee)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  Biaya payment gateway
                  <span className="block text-body-sm">
                    Rp{FEE_MASUK_PPNJ.toLocaleString("id-ID")} + PPN 11%
                  </span>
                </dt>
                <dd className="text-code-tabular text-foreground">
                  −{formatRupiah(FEE_MASUK)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <dt className="font-medium text-foreground">Diterima Anda</dt>
                <dd className="text-code-tabular text-title-md text-foreground">
                  {formatRupiah(credit)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              Isi harga jual untuk melihat rinciannya.
            </p>
          )}

          {/*
            Hitung mundur. Alasan ada tool ini: menghitung "harga harus
            berapa supaya saya dapat Rp X" jauh lebih sulit daripada
            "dari harga ini saya dapat berapa" — dan itu yang benar-benar
            dipakai pemilik toko saat menentukan harga.
          */}
          <Field>
            <FieldLabel htmlFor="fee-calc-target">Target pendapatan Anda</FieldLabel>
            <Input
              id="fee-calc-target"
              name="targetPendapatan"
              inputMode="numeric"
              placeholder="Contoh: 5000000"
              value={targetText}
              onChange={(event) => setTargetText(event.target.value)}
            />
          </Field>

          {needed > 0 ? (
            <div className="grid gap-2 rounded-xl border border-border bg-muted p-4">
              <p className="text-body-md text-foreground">
                Untuk menerima {formatRupiah(target)}, harga jual minimal{" "}
                <strong className="text-code-tabular">{formatRupiah(needed)}</strong>
                {price > 0 && shortfall > 0 ? (
                  <span className="text-destructive">
                    {" "}
                    — harga sekarang {formatRupiah(Math.abs(shortfall))} kurang.
                  </span>
                ) : null}
              </p>
              {price > 0 && needed > 0 && price >= needed ? (
                <p className="text-body-sm text-muted-foreground">
                  Harga sekarang sudah cukup.
                </p>
              ) : null}
            </div>
          ) : null}

          {/*
            Fee pencairan ditampilkan sebagai catatan, bukan sebagai
            pengurangan. Alasannya ada di kepala berkas: kalau tidak, owner
            akan menghitung harga terlalu tinggi atau mengira platform
            membebankan Rp9.440 padanya.
          */}
          <div className="rounded-xl border border-border p-4">
            <p className="text-label-lg text-foreground">
              Biaya pencairan Rp{" "}
              {FEE_PENCAIRAN_PER_BATCH.toLocaleString("id-ID")}
              <span className="font-normal text-muted-foreground">
                {" "}
                ditanggung FurniTech
              </span>
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Dihitung sekali untuk semua pencairan di satu jadwal (
              {SLOT_PENCAIRAN.join(" dan ")} WIB), bukan per pesanan dan bukan
              per transfer. Karena itu saldo di bawah ambang minimum tidak
              ikut dikirim sampai terkumpul cukup.
            </p>
          </div>

          {/*
            Kanal pembayaran ditampilkan supaya pengrajin tahu pembeli hanya
            bisa lewat Virtual Account. Ini bukan detail teknis: kalau ia
            memasang harga yang hanya bisa dibayar kartu kredit, pembeli akan
            gagal di halaman pembayaran dan menutupnya.
          */}
          <p className="text-body-sm text-muted-foreground">
            Pembeli hanya dapat membayar lewat Virtual Account (BCA, BNI, BRI,
            BSI, Danamon, Permata).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
