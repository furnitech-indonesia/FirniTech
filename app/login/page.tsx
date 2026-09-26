import { redirect } from "next/navigation";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/permissions";

export const metadata = { title: "Masuk — FurniTech" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Sudah punya session → jangan tampilkan form lagi.
  const session = await getSession();
  if (session) {
    redirect(homeForRole(session.role));
  }

  const { next } = await searchParams;

  return (
    <main id="konten-utama" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-foreground">Masuk ke FurniTech</h1>
      <p className="mt-1 text-sm text-secondary">
        Akun pengrajin, staf produksi, atau super admin platform.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <LoginForm nextPath={next} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/" className="text-accent-foreground hover:underline">
          ← Kembali ke beranda
        </Link>
      </p>
    </main>
  );
}
