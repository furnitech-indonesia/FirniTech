import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Komposisi tingkat halaman di atas primitif shadcn/ui.
 *
 * Bedanya jelas dan disengaja:
 *   - PRIMITIF (Card, Badge, Button, Field, …) milik shadcn/ui di
 *     `src/components/ui/`. Jangan buat ulang di sini.
 *   - File ini hanya menyusun primitif itu menjadi pola yang berulang di
 *     halaman-halaman kita. `SectionCard` misalnya menjawab "judul, deskripsi,
 *     dan konten" yang dipakai di 6 halaman — itu pola aplikasi, bukan
 *     primitif universal.
 */

/**
 * Kartu dengan judul & deskripsi opsional.
 *
 * `bare` dipakai untuk kartu yang isinya daftar/tabel: header dan padding
 * dikosongkan supaya tabel bisa menempel penuh ke tepi kartu.
 */
export function SectionCard({
  title,
  description,
  children,
  className,
  bare,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Tanpa padding — untuk kartu yang berisi daftar atau tabel. */
  bare?: boolean;
}) {
  return (
    <Card className={className ?? (bare ? "gap-0 py-0" : undefined)}>
      {title && !bare ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Placeholder saat belum ada data. Satu props `message` supaya call site
 * tetap pendek; gayanya berasal dari primitif Empty.
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <Empty className="rounded-2xl border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyTitle className="text-sm font-medium text-muted-foreground">
          {message}
        </EmptyTitle>
        <EmptyDescription className="sr-only">
          Belum ada data yang ditampilkan.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
