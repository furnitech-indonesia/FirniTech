import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Klien Supabase untuk Server Component / Route Handler.
 *
 * Catatan: key publishable/secret TIDAK boleh masuk ke bundle client.
 * Di sisi browser gunakan createBrowserClient (src/lib/supabase/client.ts).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset. Isi .env terlebih dahulu.",
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Cookie hanya bisa di-set dari Server Action atau Route Handler.
          // Diperpanggil dari Server Component (mis. setelah refresh token)
          // ini aman untuk diabaikan.
        }
      },
    },
  });
}
