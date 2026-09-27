/**
 * Skema validasi bersama.
 *
 * Satu skema dipakai dua kali: di browser (react-hook-form) untuk umpan balik
 * instan, dan lagi di Server Action sebagai Missed check terakhir. Jangan
 * pernah memindahkan aturan validasi hanya ke satu sisi.
 *
 * Lihat juga docs/validasi.md untuk penjelasan pola ini.
 */
export * from "./primitives";
export * from "./product";
export * from "./material";
export * from "./order";
export * from "./chat";
export * from "./auth";
export * from "./address";
export * from "./register";
