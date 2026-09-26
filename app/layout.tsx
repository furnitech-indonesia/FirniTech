import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FurniTech",
  description:
    "SaaS multi-tenant untuk pengrajin dan UMKM mebel: storefront, back-office, dan progress tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        {/*
          Material Symbols (Outlined) TIDAK tersedia di next/font/google —
          font-data.json Next hanya memuat 1942 family tanpa Material Symbols.
          Karena itu dimuat lewat link resmi Google, sesuai DESIGN.md §5.
        */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
