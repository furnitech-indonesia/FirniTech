import Link from "next/link";
import { LockIcon } from "@phosphor-icons/react/dist/ssr";

import { getSession } from "@/lib/auth/session";
import { ROLE_LABELS, homeForRole } from "@/lib/auth/permissions";

export const metadata = { title: "Akses ditolak — FurniTech" };

/**
 * 403: user sudah masuk, tapi role-nya tidak berhak untuk halaman tersebut.
 * Sengaja berbeda dari 404 agar tidak menyamarkan bug navigasi.
 */
export default async function ForbiddenPage() {
  const session = await getSession();

  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <LockIcon size={56} weight="light" className="text-primary" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Akses tidak diizinkan
      </h1>
      <p className="mt-2 text-secondary">
        {session
          ? `Anda masuk sebagai ${ROLE_LABELS[session.role]}, dan halaman ini bukan untuk peran tersebut.`
          : "Anda harus masuk terlebih dahulu."}
      </p>

      <Link
        href={session ? homeForRole(session.role) : "/login"}
        className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Kembali
      </Link>
    </main>
  );
}
