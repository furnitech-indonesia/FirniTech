# Validasi form

## Prinsip

Satu skema zod dipakai **dua kali** untuk setiap form:

1. **Di browser** — `react-hook-form` + `zodResolver` memberi umpan balik per
   field tanpa menunggu round-trip ke server.
2. **Di Server Action** — skema yang sama dijalankan lagi terhadap `FormData`.

Yang kedua bukan redundansi. Klien bisa dimanipulasi, dan validasi browser
bisa dilewati; tetapi menggunakan skema yang sama menjamin aturan tidak berbeda
antara yang dilihat pengguna dan yang dijalankan server.

## Kontrak Server Action

Setiap Server Action mengembalikan bentuk ini:

```ts
type FormState = {
  error?: string;                       // pesan umum
  message?: string;                     // pesan sukses
  fieldErrors?: Record<string, string>; // pesan per field
};
```

`fieldErrors` diisi memakai `parseForm()` dari
`src/lib/schemas/primitives.ts`, yang mengembalikan error per field berdasarkan
`path` dari zod.

## Pola

```ts
"use server";
export async function createProduct(prev: FormState, formData: FormData) {
  return guard<ProductFormState>(async () => {
    const actor = await requireTenantWrite(WRITE_ROLES);   // otorisasi DULUAN
    const parsed = parseForm(productSchema, formData);
    if (!parsed.success) {
      return { error: parsed.message, fieldErrors: parsed.fieldErrors };
    }
    const data = parsed.data;
    // ... tulis data. tenantId SELALU dari actor, bukan dari data.
  }, (error) => ({ error }));
}
```

Urutannya penting: **otorisasi lebih dulu, baru validasi.** Kalau validasi
dijalankan lebih dulu, server membocorkan informasi tentang bentuk data yang
diterima meskipun pemanggil tidak berhak.

## Angka uang

Uang **tidak boleh** di-transform tanpa guard:

```ts
Number("abc".replace(/[^0-9]/g, ""))  // → 0  ← input buruk jadi valid!
```

Karena itu `rupiah` di `primitives.ts` menolak string tanpa digit dan
menolak tanda minus di depan, sebelum transformasi. `"-5"` tidak boleh berubah
jadi `5`.

## Aturan khusus

- **Checkbox** hanya ada di `FormData` saat tercentang. `formDataToObject()`
  membacanya lewat `.has()`/nilai `"on"` → boolean.
- **File** tidak ikut di `FormData` → objek; divalidasi terpisah di
  `src/lib/storage.ts` (MIME + ukuran).
- **Tipe dari skema**, bukan ditulis ulang: `z.infer<typeof productSchema>`.
  Kalau kolom berubah, TypeScript menunjuk tempat yang harus diperbaiki.
