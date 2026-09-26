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
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
