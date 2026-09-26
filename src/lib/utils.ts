import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan class Tailwind dengan aman.
 *
 * `twMerge` menyelesaikan konflik utilitas (mis. `p-2` vs `p-4`) sehingga
 * class yang diberikan lewat prop selalu menang. Tanpa ini, menimpanya
 * `className` pada komponen shadcn tidak akan berhasil.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
