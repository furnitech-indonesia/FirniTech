import Link from "next/link";

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
      <span className="material-symbols-outlined text-5xl text-amber-600">
        lock
      </span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Akses tidak diizinkan
      </h1>
      <p className="mt-2 text-slate-700">
        {session
          ? `Anda masuk sebagai ${ROLE_LABELS[session.role]}, dan halaman ini bukan untuk peran tersebut.`
          : "Anda harus masuk terlebih dahulu."}
      </p>

      <Link
        href={session ? homeForRole(session.role) : "/login"}
        className="mt-6 inline-block rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
      >
        Kembali
      </Link>
    </main>
  );
}
