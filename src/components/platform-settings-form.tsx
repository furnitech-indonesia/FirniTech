"use client";

import { useActionState } from "react";
import { LockIcon, PercentIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { savePlatformSettings, type SettingsState } from "@/lib/actions/settings";
import { FEE_MASUK, FEE_PENCAIRAN } from "@/lib/fees";
import { PLANS } from "@/lib/plans";

/**
 * Form pengaturan platform untuk super admin (Sprint 6).
 *
 * TIGA HAL YANG DITAMPILKAN BERSAMA, dan itu keputusan tampilan:
 *
 *  1. Yang BISA diubah (tarif fee platform, harga bulanan per paket).
 *  2. Yang TIDAK bisa diubah (fee masuk Rp 4.440, fee pencairan Rp 5.550) —
 *     ditampilkan terkunci, bukan disembunyikan. Sembunyikannya membuat
 *     orang wondered fee itu bisa diubah di tempat lain; menampilkannya
 *     dengan alasan jelas membuat pertanyaan itu terjawab.
 *  3. APA yang terjadi kalau tarif berubah — satu kalimat jujur bahwa tarif
 *     berlaku untuk pesanan yang belum dibayar, dan invoice yang sudah terbit
 *     tetap memakai nominal lamanya.
 *
 * Kolom harga paket dikosongkan kalau masih memakai harga default `plans.ts`,
 * BUKAN diisi dengan angka default-nya. Kalau diisi, super admin tidak bisa
 * membedakan "harga ini sudah disesuaikan" dari "harga ini belum pernah
 * diubah", dan perbedaan itu yang membuat form ini berguna.
 */
export function PlatformSettingsForm({
  rateBps,
  defaultRateBps,
  plans,
  addons,
}: {
  rateBps: number;
  defaultRateBps: number;
  plans: Array<{
    id: "basic" | "pro" | "max";
    label: string;
    priceMonthly: number;
    priceSource: "kode" | "override";
  }>;
  addons: {
    domain: {
      price: number;
      priceSource: "kode" | "override";
      floor: number;
      cost: number;
    };
    legalitas: {
      price: number;
      priceSource: "kode" | "override";
    };
    lockedCosts: { pnbp: number; ops: number };
  };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    savePlatformSettings,
    {},
  );

  return (
    <form action={formAction} className="grid gap-5">
      <Field className="gap-1.5">
        <FieldLabel htmlFor="platformFeeRateBps">
          Tarif fee platform (basis points)
        </FieldLabel>
        <Input
          id="platformFeeRateBps"
          name="platformFeeRateBps"
          type="number"
          inputMode="numeric"
          min={0}
          max={10000}
          step={1}
          required
          defaultValue={rateBps}
        />
        <FieldDescription>
          1 basis point = 0,01%. Jadi 150 berarti 1,5%, dan 0 berarti tidak ada
          fee platform sama sekali — yang berlaku sekarang.
          {rateBps !== defaultRateBps ? (
            <>
              {" "}
              Nilai bawaannya {defaultRateBps} (0%).{" "}
            </>
          ) : null}
          <span className="text-code-tabular text-foreground">
            {((rateBps ?? 0) / 100).toLocaleString("id-ID")}%
          </span>
        </FieldDescription>
      </Field>

      <div className="grid gap-3">
        <p className="text-title-md text-foreground">Harga paket bulanan</p>
        <p className="text-body-sm text-muted-foreground">
          Kosongkan untuk memakai harga bawaan di{" "}
          <code>src/lib/plans.ts</code>. Harga tahunan selalu dihitung ulang
          dari harga bulanan dengan diskon 5%, jadi tidak bisa diisi terpisah.
        </p>

        {plans.map((plan) => (
          <Field key={plan.id} className="gap-1.5">
            <FieldLabel htmlFor={`${plan.id}Price`}>
              {plan.label} — bulanan
            </FieldLabel>
            <Input
              id={`${plan.id}Price`}
              name={`${plan.id}Price`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder={`${plan.priceMonthly.toLocaleString("id-ID")} (bawaan)`}
            />
            <FieldDescription>
              {plan.priceSource === "override" ? (
                <>
                  Saat ini{" "}
                  <span className="text-code-tabular text-foreground">
                    {plan.priceMonthly.toLocaleString("id-ID")}
                  </span>
                  /bulan, dari override. Kosongkan untuk kembali ke bawaan.
                </>
              ) : (
                <>
                  Memakai bawaan{" "}
                  <span className="text-code-tabular text-foreground">
                    {PLANS[plan.id].priceMonthly.toLocaleString("id-ID")}
                  </span>
                  /bulan.
                </>
              )}
            </FieldDescription>
          </Field>
        ))}
      </div>

      {/*
        Harga add-on. Kolomnya dikosongkan kalau masih memakai bawaan kode,
        sama seperti harga paket -- supaya "sudah disesuaikan" bisa
        dibedakan dari "belum pernah diubah".
      */}
      <div className="flex flex-col gap-4 border-t border-border pt-5">
        <div>
          <p className="text-body-md font-medium text-foreground">
            Harga add-on
          </p>
          <p className="text-body-sm text-muted-foreground">
            Berlaku untuk invoice yang terbit setelah disimpan. Invoice yang
            sudah terbit mengunci harganya sendiri.
          </p>
        </div>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="domainAddonPrice">
            Custom domain per tahun{" "}
            <span className="text-muted-foreground">
              {addons.domain.priceSource === "override" ? "(diubah)" : ""}
            </span>
          </FieldLabel>
          <Input
            id="domainAddonPrice"
            name="domainAddonPrice"
            type="number"
            inputMode="numeric"
            step={1000}
            min={addons.domain.floor}
            defaultValue={addons.domain.price}
            placeholder={String(addons.domain.price)}
            aria-describedby="domain-addon-hint"
          />
          <p id="domain-addon-hint" className="text-body-sm text-muted-foreground">
            Tidak boleh di bawah Rp {addons.domain.floor.toLocaleString("id-ID")}{" "}
            — itu biaya Cloudflare per tahun, jadi di bawahnya FurniTech rugi
            pada setiap perpanjangan.
          </p>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="legalitasAddonPrice">
            Paket pendirian PT Perorangan{" "}
            <span className="text-muted-foreground">
              {addons.legalitas.priceSource === "override" ? "(diubah)" : ""}
            </span>
          </FieldLabel>
          <Input
            id="legalitasAddonPrice"
            name="legalitasAddonPrice"
            type="number"
            inputMode="numeric"
            step={1000}
            min={1}
            defaultValue={addons.legalitas.price}
            placeholder={String(addons.legalitas.price)}
            aria-describedby="legalitas-addon-hint"
          />
          <p id="legalitas-addon-hint" className="text-body-sm text-muted-foreground">
            Dibayar sekali, di luar paket langganan.
          </p>
        </Field>
      </div>

      {/*
        Fee yang dikunci. Ditampilkan, bukan disembunyikan — pertanyaannya
        selalu muncul, dan lebih baik dijawab sekali di sini daripada
        dijawab satu per chat.
      */}
      <div className="rounded-xl border border-border bg-surface-sunken p-4">
        <p className="flex items-center gap-2 text-body-md font-medium text-foreground">
          <LockIcon size={16} weight="light" aria-hidden />
          Tidak bisa diubah dari sini
        </p>
        <dl className="mt-2 grid gap-1 text-body-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Fee masuk per pesanan</dt>
            <dd className="text-code-tabular text-foreground">
              {FEE_MASUK.toLocaleString("id-ID")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Fee pencairan per penerima</dt>
            <dd className="text-code-tabular text-foreground">
              {FEE_PENCAIRAN.toLocaleString("id-ID")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">
              PNBP pendaftaran AHU
            </dt>
            <dd className="text-code-tabular text-foreground">
              {addons.lockedCosts.pnbp.toLocaleString("id-ID")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Ongkos pengurusan</dt>
            <dd className="text-code-tabular text-foreground">
              {addons.lockedCosts.ops.toLocaleString("id-ID")}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Fee masuk dan fee pencairan sudah dikonfirmasi ke Midtrans dan
          hanya berubah kalau Midtrans mengubahnya. PNBP pendaftaran AHU
          ditetapkan PP 30/2026 pasal 33 — itu tarif negara, dan
         ubahannya berarti FurniTech mengarang tarif yang ditampilkan ke
          pelanggan sebagai "biaya negara". Menjadikannya bisa diubah berarti
          tarif yang sedang berjalan bisa bergerak tanpa ada yang memutuskan — dan
          pengrajin yang sudah menghitung ulang biayanya akan menemukan angka
          berbeda saat menekan tombol bayar.
        </p>
      </div>

      <Alert>
        <AlertDescription className="flex items-start gap-2">
          <PercentIcon
            size={16}
            weight="light"
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <span>
            Tarif baru berlaku untuk pesanan yang dibuat setelah disimpan.
            Invoice langganan yang sudah terbit tetap memakai nominal yang
            tertulis di invoice itu — harga saat invoice dibuat dikunci di
            sana, jadi perubahan tarif tidak pernah mengubah tagihan yang
            sudah terbit.
          </span>
        </AlertDescription>
      </Alert>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.message ? <Alert>{state.message}</Alert> : null}

      <Button type="submit" size="touch" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan pengaturan"}
      </Button>
    </form>
  );
}
