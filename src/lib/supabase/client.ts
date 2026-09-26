"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Klien Supabase untuk komponen Client Component.
 * Hanya memakai publishable key — jangan pernah memakai service role di sini.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset.",
    );
  }

  return createBrowserClient(url, key);
}
