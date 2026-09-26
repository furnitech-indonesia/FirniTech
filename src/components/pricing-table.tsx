"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";

import { PLANS } from "@/lib/plans";
import { formatRupiah } from "@/lib/format";

/**
 * Tabel harga dengan toggle bulanan/tahunan.
 *
 * Diskon TIDAK ditulis tangan. `savingFor()` menghitungnya dari
 * `priceMonthly` dan `priceYearly`, jadi kalau harga paket berubah di
 * plans.ts, angka "hemat 10%" ikut berubah atau hilang kalau tidak lagi
 *_diskon_. Stitch menampilkan "Hemat 15%" padahal angka turunannya 10% —
 * itu klaim yang tidak bisa dipertanggungjawabkan.
 *
 * Harga juga dibaca dari PLANS, bukan diketik di markup.
 */

type Period = "monthly" | "yearly";

function savingFor(priceMonthly: number, priceYearly: number): number {
  const fullYear = priceMonthly * 12;
  if (fullYear <= 0 || priceYearly >= fullYear) return 0;
  return Math.round((1 - priceYearly / fullYear) * 100);
}

const DETAILS: Record<string, readonly string[]> = {
  basic: [
    "20 produk di katalog",
    "1 staf produksi selain owner",
    "100 pesan WhatsApp per bulan",
    "Laporan keuangan dasar",
    "Tanpa biaya setup",
  ],
  pro: [
    "100 produk di katalog",
    "5 staf produksi",
    "500 pesan WhatsApp per bulan",
    "Laporan laba-rugi",
    "Domain sendiri + SSL",
  ],
  max: [
    "Produk katalog tanpa batas",
    "Staf tanpa batas",
    "Pesan WhatsApp tanpa batas",
    "Laporan eksekutif",
    "Domain sendiri + SSL",
  ],
};

const ORDER = ["basic", "pro", "max"] as const;

export function PricingTable() {
  const [period, setPeriod] = useState<Period>("monthly");
  const isYearly = period === "yearly";

  return (
    <div>
      {/* Toggle periode */}
      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Pilih periode pembayaran"
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-card"
        >
          {(
            [
              { id: "monthly", label: "Bulanan" },
              { id: "yearly", label: "Tahunan" },
            ] as const
          ).map((option) => {
            const active = period === option.id;
            return (
              <button
                key={option.id}
                type="button"
                // aria-pressed, bukan hanya class: pilihan aktif harus
                // terbaca screen reader, tidak hanya terlihat berubah warna.
                aria-pressed={active}
                onClick={() => setPeriod(option.id)}
                className={`min-h-11 rounded-lg px-4 text-label-lg transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-3">
        {ORDER.map((id) => {
          const plan = PLANS[id];
          const featured = id === "pro";
          const saving = savingFor(plan.priceMonthly, plan.priceYearly);
          const amount = isYearly ? plan.priceYearly : plan.priceMonthly;

          return (
            <div
              key={id}
              className={`flex flex-col rounded-2xl border bg-card p-6 ${
                featured
                  ? "border-primary shadow-card-hover"
                  : "border-border shadow-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-headline-sm text-foreground">{plan.label}</h3>
                {featured ? (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-label-sm text-accent-foreground">
                    Paling dipilih
                  </span>
                ) : null}
              </div>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-code-tabular text-foreground">
                  {formatRupiah(amount)}
                </span>
                <span className="text-body-sm text-muted-foreground">
                  /{isYearly ? "tahun" : "bulan"}
                </span>
              </p>

              <p className="mt-1 flex min-h-10 flex-col text-body-sm text-muted-foreground">
                {isYearly ? (
                  <>
                    <span>
                      Hemat {saving}% dibanding bulanan
                    </span>
                    <span className="text-label-sm text-muted-foreground">
                      {formatRupiah(Math.round(plan.priceMonthly * 12))} kalau
                      bulanan
                    </span>
                  </>
                ) : (
                  <span>
                    {formatRupiah(plan.priceYearly)} per tahun
                  </span>
                )}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {DETAILS[id].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-body-md">
                    <CheckCircleIcon
                      size={18}
                      weight="light"
                      className="mt-0.5 shrink-0 text-status-settled"
                      aria-hidden
                    />
                    <span className="text-secondary">{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-label-lg transition-colors ${
                  featured
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border bg-card text-secondary hover:bg-muted"
                }`}
              >
                Pilih {plan.label}
                <ArrowRightIcon size={18} weight="light" aria-hidden />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
