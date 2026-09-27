import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HourglassIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { saasInvoices, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/permissions";
import { signOut } from "@/lib/auth/actions";
import { PLANS } from "@/lib/plans";
import { formatDateID, formatRupiah } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Menunggu pembayaran — FurniTech" };

/**
 * Halaman penunggu pembayaran.
 *
 * Tenant purpose-nya memberi instructions yang bisa dilakukan, bukan
 * menampilkan kode error. Tiga hal yang harus selalu dijawab di sini:
 * uangnya sudah sampai mana, dan apa langkah berikutnya kalau tidak bisa
 * membayar lewat halaman tersebut.
 *
 * Halaman ini SENGAJA tidak punya tombol "buka dashboard". Seluruh
 * back-office di-redirect dari `app/dashboard/layout.tsx`, jadi tombol
 * seperti itu akan menuntun ke halaman yang langsung memantulkan balik —
 * tombol yang terlihat bisa dilakukan tapi tidak melakukan apa pun.
 */
export default async function MenungguPembayaranPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/menunggu-pembayaran");

  // Super admin tidak punya langganan, jadi tidak mungkin menunggu bayarnya.
  if (session.role === "super_admin") redirect("/admin");

  const [tenant] = session.tenantId
    ? await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, session.tenantId))
        .limit(1)
    : [null];

  // Sudah aktif (pembayarannya masuk setelah halaman ini dibuka): tidak ada
  // yang perlu ditunggu.
  if (tenant?.isActive && tenant.subscriptionStatus !== "pending") {
    redirect(homeForRole(session.role));
  }

  const [invoice] = tenant
    ? await db
        .select()
        .from(saasInvoices)
        .where(eq(saasInvoices.tenantId, tenant.id))
        .orderBy(desc(saasInvoices.createdAt))
        .limit(1)
    : [null];

  const plan = tenant ? PLANS[tenant.plan] : null;

  return (
    <main
      id="konten-utama"
      className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-center px-4 py-10"
    >
      <Card>
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"
            >
              <HourglassIcon size={22} weight="light" />
            </span>
            <h1 className="text-headline-md text-foreground">
              Menunggu pembayaran
            </h1>
            <p className="text-body-md text-muted-foreground">
              Akun <strong className="text-foreground">{tenant?.name}</strong>{" "}
              sudah dibuat. Back-office terbuka otomatis setelah pembayaran
              langganan masuk — tidak perlu mendaftar ulang.
            </p>
          </div>

          {invoice ? (
            <dl className="grid gap-2 rounded-xl border border-border bg-card p-4 text-body-md">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Paket</dt>
                <dd className="text-foreground">
                  {plan?.label ?? invoice.plan}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tagihan</dt>
                <dd className="text-code-tabular text-foreground">
                  {formatRupiah(invoice.amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">
                  {invoice.status === "paid"
                    ? "Sudah lunas"
                    : invoice.status === "failed"
                      ? "Gagal — hubungi admin untuk mencoba lagi"
                      : "Menunggu transfer"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Periode</dt>
                <dd className="text-foreground">
                  {formatDateID(invoice.periodStart)} –{" "}
                  {formatDateID(invoice.periodEnd)}
                </dd>
              </div>
            </dl>
          ) : null}

          {/*
           * Tidak ada tombol "bayar sekarang" di sini. Halaman pembayaran
           * Midtrans hanya hidup selama masa berlaku tagihan (satu hari), dan
           * tokennya tidak disimpan di database — menyimpan token Snap berarti
           * menyimpan handle yang bisa dipakai orang lain. Alur pembayaran
           * ulang dibangun sebagai endpoint tersendiri (Sprint 6), bukan
           * sebagai tautan yang harus ditebak di sini.
           */}
          <div className="grid gap-3">
            <p className="text-body-md text-muted-foreground">
              Pembayaran gagal atau Anda menutup tab sebelum membayar? Hubungi
              FurniTech dengan menyebut nama workshop di atas — tagihan Anda
              sudah tercatat dan tidak perlu didaftarkan ulang.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/*
               * `Link` + `buttonVariants`, bukan `<Button asChild>`. Button di
               * sini primitif Base UI, yang tidak punya `asChild` — itu
               * konvensi Radix. Base UI memakai prop `render`, tapi di sini
               * tidak perlu: yang terjadi hanya navigasi, dan `Link` sudah
               * menyediakan elemen yang benar. Gaya tetap dari satu sumber
               * lewat `buttonVariants`, supaya tidak ada tombol yang terlihat
               * berbeda karena ditulis manual.
               */}
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "touch" })}
              >
                Cek lagi
              </Link>
              <form action={signOut} className="flex-1">
                <Button
                  type="submit"
                  size="touch"
                  variant="ghost"
                  className="w-full"
                >
                  Keluar
                </Button>
              </form>
            </div>
          </div>

          <p className="text-body-sm text-muted-foreground">
            Sudah punya akun lain?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Masuk di sini
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
