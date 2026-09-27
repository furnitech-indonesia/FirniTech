"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormContext, useWatch } from "react-hook-form";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  MagicWandIcon,
} from "@phosphor-icons/react";

import { ZodForm, type ZodFormContext } from "@/components/zod-form";
import { TextField } from "@/components/rhf-fields";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldLegend } from "@/components/ui/field";
import { registerFormSchema } from "@/lib/schemas/register";
import { checkSlugAvailability } from "@/lib/auth/actions";
import { registerOwner } from "@/lib/auth/actions";
import { PLANS, PLAN_IDS } from "@/lib/plans";
import { formatRupiah } from "@/lib/format";

/**
 * Wizard pendaftaran owner, empat langkah.
 *
 * SATU form, bukan empat form. Alasannya teknis, bukan selera: Server Action
 * memvalidasi SELURUH skema sekaligus, jadi semua field harus ikut FormData.
 * Kalau dipecah jadi empat form, langkah 1–3 harus disimpan di server lebih
 * dulu (draft) — itu berarti tabel baru plus alur pemulihan kalau pengguna
 * menutup tab di tengah jalan.
 *
 * `data-step` ditulis eksplisit di tiap section. Dua alasan: `test:register`
 * membacanya untuk menghitung langkah, dan `aria-label` saja rapuh karena
 * `main section` ikut menghitung pembungkus tata letak serta section toaster
 * Base UI — keduanya bukan langkah wizard.
 *
 * Langkah yang tidak aktif memakai atribut `hidden`, bukan dilepas dari DOM.
 * `hidden` tetap menyertakan nilainya di FormData, jadi tidak ada state di
 * server yang perlu disimpan. Field tersembunyi juga tidak boleh memakai
 * atribut `required`: browser akan menolak submit karena input tak terlihat,
 * dan pesan errornya mengarahkan pengguna ke field yang tidak bisa dilihat.
 *
 * Validasi per langkah memakai `ctx.trigger([...])` — lihat alasannya di
 * src/components/zod-form.tsx.
 *
 * Setelah berhasil, arahkan ke /login, bukan ke dashboard: sesi belum ada,
 * dan `subscriptionStatus` masih `pending` sampai pembayaran masuk.
 */

type Period = "monthly" | "yearly";

/** Field yang harus sah sebelum boleh pindah dari langkah tertentu. */
const STEP_FIELDS: readonly (readonly string[])[] = [
  ["fullName", "phone", "email", "password", "confirmPassword"],
  ["workshopName", "slug"],
  ["plan", "period"],
  [],
];

const STEP_TITLES = [
  "Data akun",
  "Data workshop",
  "Pilih paket",
  "Ringkasan",
] as const;

function StepDots({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Tahap pendaftaran">
      {STEP_TITLES.map((title, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={title} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`grid size-7 shrink-0 place-items-center rounded-full border text-label-sm ${
                done
                  ? "border-status-settled bg-status-settled text-white"
                  : active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              {done ? <CheckIcon size={12} weight="bold" /> : index + 1}
            </span>
            {index < STEP_TITLES.length - 1 ? (
              <span
                aria-hidden
                className={`h-px w-4 ${done ? "bg-status-settled" : "bg-border"}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Field "Alamat toko" dengan pratinjau langsung dan cek ketersediaan.
 *
 * Dipisah jadi komponen sendiri karena butuh dua hal yang tidak boleh
 * dilakukan di dalam render `RegisterForm`:
 *   - `useWatch` untuk membaca nilai slug SEKARANG. Versi sebelumnya
 *     menyimpan slug di `useState` dan hanya sinkron saat tombol "Bikin dari
 *     nama workshop" ditekan, jadi pratinjau `/t/...` tidak pernah bergerak
 *     saat orang mengetik — persis hal yang ROADMAP minta ("live preview
 *     URL /t/<slug> saat pengetikan").
 *   - `useEffect` untuk debounce pemanggilan Server Action.
 *
 * Kenapa bukan `watch()` dari react-hook-form: `watch` adalah fungsi biasa,
 * bukan hook. Memanggilnya saat render membuat React Compiler melewati
 * memoisasi dan nilainya bisa basi. `useWatch` + `useFormContext` adalah
 * polanya yang benar (lihat src/components/payment-breakdown-live.tsx).
 */
function SlugField({ ctx }: { ctx: ZodFormContext }) {
  const { control } = useFormContext();
  const [workshopName, slug] = useWatch({ control, name: ["workshopName", "slug"] });
  const [status, setStatus] = useState<"idle" | "checking" | "free" | "taken">("idle");

  const value = (slug ?? "").toString();

  // Status yang tampil. Kasus "slug kosong" TIDAK dibersihkan dengan
  // setState di dalam effect — status `idle` cukup diturunkan di sini.
  // Memanggil `setState()` langsung dalam effect adalah pola yang di-ACRS oleh
  // eslint (react-hooks/set-state-in-effect), dan memang benar: nilainya bisa
  // dihitung tanpa efek sama sekali.
  const shown = value.trim() ? status : "idle";

  // Debounce 400ms: tanpa itu tiap ketikan menembak query, dan setiap
  // keystroke adalah satu request ke server. Umpan baliknya juga terasa lebih
  // cepat kalau request-nya tidak saling tumpang tindih.
  useEffect(() => {
    const candidate = value.trim().toLowerCase();
    if (!candidate) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setStatus("checking");
      checkSlugAvailability(candidate)
        .then((result) => {
          if (!cancelled) setStatus(result.available ? "free" : "taken");
        })
        .catch(() => {
          // Gagal mengecek TIDAK boleh memblokir pendaftaran; penggawanya ada
          // di server saat submit, jadi di sini cukup diamkan saja.
          if (!cancelled) setStatus("idle");
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <>
      <TextField
        ctx={ctx}
        label="Alamat toko"
        name="slug"
        placeholder="mebeljaya"
        aria-describedby="ringkasan-slug"
        hint={
          shown === "taken"
            ? "Alamat ini sudah dipakai. Coba nama lain."
            : value
              ? `Toko Anda akan berada di /t/${value}`
              : "Huruf kecil, angka, dan tanda hubung saja."
        }
      />
      <p id="ringkasan-slug" aria-live="polite" className="sr-only">
        {shown === "taken"
          ? "Alamat toko sudah dipakai."
          : shown === "free"
            ? "Alamat toko tersedia."
            : ""}
      </p>

      {/* Slug bisa diisi manual, atau dibuat dari nama workshop. Tidak
          dilakukan otomatis setiap ketikan: menimpa apa pun yang sudah
          diketik orang tanpa diminta. */}
      <button
        type="button"
        onClick={() => {
          const next = slugify((workshopName ?? "").toString());
          if (next) ctx.setValue("slug", next);
        }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 text-body-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <MagicWandIcon size={16} weight="light" aria-hidden />
        Bikin dari nama workshop
      </button>
    </>
  );
}

/**
 * Ringkasan di langkah terakhir.
 *
 * Nilai dibaca dengan `useWatch`, bukan `getValues()` saat render dan bukan
 * `watch()`: `watch` adalah fungsi biasa yang membuat React Compiler melewati
 * memoisasi, sedangkan `getValues()` di dalam render membaca nilai basi kalau
 * subtree-nya sudah dimemoisasi. `useWatch` + `useFormContext` adalah pola
 * yang benar dan sudah dipakai di src/components/payment-breakdown-live.tsx.
 */
function StepSummary() {
  const { control } = useFormContext();
  const [workshopName, slug, plan, period] = useWatch({
    control,
    name: ["workshopName", "slug", "plan", "period"],
  });

  const planId = (plan ?? "pro") as keyof typeof PLANS;
  const per = (period ?? "monthly") as Period;
  const price =
    per === "yearly" ? PLANS[planId].priceYearly : PLANS[planId].priceMonthly;

  return (
    <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-body-md text-muted-foreground">Workshop</dt>
        <dd className="truncate text-body-md text-foreground">
          {workshopName || "—"}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-body-md text-muted-foreground">Alamat toko</dt>
        <dd className="truncate text-body-sm text-foreground">
          {slug ? `/t/${slug}` : "—"}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-body-md text-muted-foreground">Paket</dt>
        <dd className="text-body-md text-foreground">
          {PLANS[planId].label} · {per === "yearly" ? "tahunan" : "bulanan"}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <dt className="text-body-md text-muted-foreground">Total dibayar</dt>
        <dd className="text-code-tabular text-foreground">{formatRupiah(price)}</dd>
      </div>
    </dl>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<keyof typeof PLANS>("pro");
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <ZodForm
      schema={registerFormSchema}
      action={registerOwner}
      defaultValues={{
        fullName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        workshopName: "",
        slug: "",
        plan: "pro",
        period: "monthly",
      }}
      submitLabel="Buat akun"
      onSuccess={(state) => {
        // Dua bentuk `redirectTo` harus ditangani berbeda.
        //   - URL Midtrans (https://app.midtrans.com/...): domain lain, perlu
        //     navigasi penuh supaya tagihannya benar-benar dibuka.
        //   - Path internal seperti /login?next=/dashboard: dipanggil saat
        //     provisioning berhasil tapi tagihan tidak bisa dibuat. Pakai
        //     router; memuat ulang seluruh halaman untuk pindah ke /login
        //     itu berlebihan.
        const target = state.redirectTo ?? "/login";
        if (/^https?:\/\//.test(target)) {
          window.location.assign(target);
        } else {
          router.push(target);
        }
      }}
    >
      {(ctx) => {
        const lastStep = STEP_TITLES.length - 1;

        const advance = async () => {
          const fields = STEP_FIELDS[step];
          const ok = await ctx.trigger([...fields]);
          if (ok) setStep((s) => Math.min(s + 1, lastStep));
        };

        return (
          <>
            <div className="flex items-center justify-between gap-4">
              <StepDots current={step} />
              <p className="text-label-sm text-muted-foreground">
                {step + 1} / {STEP_TITLES.length}
              </p>
            </div>

            {/* ---------- Langkah 1 ---------- */}
            <section
              hidden={step != 0}
              className="grid gap-4"
              aria-label="Data akun"
              data-step={1}
            >
              <TextField ctx={ctx} label="Nama lengkap" name="fullName" autoComplete="name" />
              <TextField
                ctx={ctx}
                label="Nomor WhatsApp"
                name="phone"
                type="tel"
                autoComplete="tel"
                hint="Dipakai untuk pemberitahuan pesanan masuk."
              />
              <TextField ctx={ctx} label="Email" name="email" type="email" autoComplete="email" />
              <TextField
                ctx={ctx}
                label="Kata sandi"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="Minimal 8 karakter, ada huruf besar, huruf kecil, dan angka."
              />
              <TextField
                ctx={ctx}
                label="Ulangi kata sandi"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
              />
            </section>

            {/* ---------- Langkah 2 ---------- */}
            <section
              hidden={step != 1}
              className="grid gap-4"
              aria-label="Data workshop"
              data-step={2}
            >
              <TextField
                ctx={ctx}
                label="Nama workshop"
                name="workshopName"
                hint="Nama yang muncul di toko online Anda."
              />
              <SlugField ctx={ctx} />
            </section>

            {/* ---------- Langkah 3 ---------- */}
            <section
              hidden={step != 2}
              className="grid gap-4"
              aria-label="Pilih paket"
              data-step={3}
            >
              <div
                role="group"
                aria-label="Periode pembayaran"
                className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1"
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
                      aria-pressed={active}
                      onClick={() => {
                        setPeriod(option.id);
                        ctx.setValue("period", option.id);
                      }}
                      className={`flex min-h-11 items-center justify-center gap-1 rounded-lg text-label-lg transition-colors ${
                        active
                          ? "bg-card text-foreground shadow-card"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                      {option.id === "yearly" ? (
                        <span className="text-label-sm text-status-settled">
                          hemat 10%
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <input type="hidden" name="period" value={period} />
              <input type="hidden" name="plan" value={plan} />

              <Field>
                <FieldLegend className="sr-only">Pilih paket</FieldLegend>
                <RadioGroup
                  value={plan}
                  onValueChange={(next) => {
                    setPlan(next as keyof typeof PLANS);
                    ctx.setValue("plan", next);
                  }}
                  className="grid gap-2"
                >
                  {PLAN_IDS.map((id) => {
                    const p = PLANS[id];
                    const price = period === "yearly" ? p.priceYearly : p.priceMonthly;
                    return (
                      <label
                        key={id}
                        htmlFor={`plan-${id}`}
                        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                          plan === id
                            ? "border-primary bg-accent/40"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <RadioGroupItem
                          id={`plan-${id}`}
                          value={id}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-title-md text-foreground">
                              {p.label}
                            </span>
                            <span className="text-code-tabular text-foreground">
                              {formatRupiah(price)}
                              <span className="text-body-sm text-muted-foreground">
                                /{period === "yearly" ? "tahun" : "bulan"}
                              </span>
                            </span>
                          </span>
                          <span className="mt-1 block text-body-sm text-muted-foreground">
                            {p.maxProducts === null
                              ? "Produk katalog tanpa batas"
                              : `${p.maxProducts} produk di katalog`}
                            {" · "}
                            {p.maxStaff === null
                              ? "staf tanpa batas"
                              : `${p.maxStaff} staf produksi`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </Field>

              <p className="text-body-sm text-muted-foreground">
                Tidak ada free trial. Langganan dibayar saat pendaftaran.
              </p>
            </section>

            {/* ---------- Langkah 4 ---------- */}
            <section
              hidden={step != lastStep}
              className="grid gap-4"
              aria-label="Ringkasan"
              data-step={4}
            >
              <StepSummary />
              {/*
               * Copy ini pernah menyebut "super admin perlu mengaktifkannya".
               * Salah sejak webhook Midtrans dibuat (app/api/webhooks/midtrans):
               * pengaktifannya otomatis begitu pembayaran masuk.
               * Menyebutkan super admin membuat orang menunda pembayaran dengan
               * alasan yang salah.
               */}
              <p className="text-body-sm text-muted-foreground">
                Akun dan toko langsung dibuat setelah tombol ditekan, lalu Anda
                diarahkan ke halaman pembayaran. Back-office terbuka otomatis
                setelah pembayaran masuk — tidak perlu menghubungi admin.
              </p>
            </section>

            {/* ---------- Navigasi ---------- */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-label-lg text-secondary transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeftIcon size={16} weight="light" aria-hidden />
                Kembali
              </button>

              {step < lastStep ? (
                <button
                  type="button"
                  onClick={advance}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Lanjut
                  <ArrowRightIcon size={16} weight="light" aria-hidden />
                </button>
              ) : null}
            </div>

            {step === lastStep ? (
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label-lg text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Buat akun
                <ArrowRightIcon size={16} weight="light" aria-hidden />
              </button>
            ) : null}
          </>
        );
      }}
    </ZodForm>
  );
}

/**
 * Sama persis dengan transformasi `slug` di src/lib/schemas/primitives.ts.
 * Disalin, bukan diimpor, supaya `primitives.ts` tidak perlu masuk ke bundle
 * klien hanya untuk satu helper string: slug dibersihkan di browser sebelum
 * dikirim, lalu divalidasi ULANG di server dengan skema yang sama.
 */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
