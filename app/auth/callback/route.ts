import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/permissions";

/**
 * Callback untuk magic link / OAuth.
 *
 * Supabase mengirim kode ke `redirect_to`; route ini menukarnya menjadi session
 * cookie, lalu mengarahkan user ke beranda sesuai perannya. Query `code`
 * DIBUANG dari URL sebelum redirect supaya tidak tinggal di riwayat browser
 * maupun log server.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const session = await getSession();
      if (session) {
        return NextResponse.redirect(
          new URL(next ?? homeForRole(session.role), origin),
        );
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}

function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}
