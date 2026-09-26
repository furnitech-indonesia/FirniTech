import { z } from "zod";

import { email } from "./primitives";

/** Skema login & magic link. Password TIDAK pernah divalidasi Clientside. */

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi.").max(200),
});

export const magicLinkSchema = z.object({
  email,
});

export type SignInInput = z.infer<typeof signInSchema>;
