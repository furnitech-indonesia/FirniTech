import "server-only";

/**
 * Entry point database untuk kode aplikasi.
 * Guard "server-only" di sini mencegah credentials DB ikut terbawa ke bundle
 * client. Script CLI (verify/seed) meng-import "@/db/client" langsung.
 */
export * from "./client";
export * from "./schema";
