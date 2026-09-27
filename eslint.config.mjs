import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Dua rule di bawah adalah aturan Pages Router (mereka mengecek
      // pages/_document.js). Repo ini memakai App Router, sehingga `<link>`
      // di app/layout.tsx sudah idiomatik dan tidak perlu di-_document.
      "@next/next/google-font-display": "off",
      "@next/next/no-page-custom-font": "off",

      /*
       * Prefiks `_` berarti "sengaja tidak dipakai".
       *
       * Repo ini sudah memakai konvensi itu di mana-mana — hampir setiap
       * Server Action punya `_prev` karena `useActionState` mengirim state
       * sebagai argumen pertama, dan bentuk itu tidak boleh diubah. Tanpa
       * aturan ini, `no-unused-vars` dengan `after-used` (default) hanya
       * memperingatkan parameter TERAKHIR, jadi hasilnya tidak konsisten:
       * `(_prev, formData)` yang memakai formData-nya diam-diam, sedangkan
       * `(_prev)` yang sendirian diperingatkan. Aturan yang lebih ketat tidak
       * akan membantu — ia hanya membuat pengecualian yang disengaja
       * terlihat seperti kesalahan.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
      // Konten skill pihak ketiga (dipasang via uipro init) — bukan kode kita.
      ".opencode/**",
    ],
  },
];

export default eslintConfig;
