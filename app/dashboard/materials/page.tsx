import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { materialAdjustments, materials } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import {
  adjustStock,
  createMaterial,
  deleteMaterial,
  updateMaterial,
} from "@/lib/actions/materials";
import { formatDateID } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Select } from "@/components/ui";

const REASON_OPTIONS = [
  { value: "pembelian", label: "Pembelian (stok masuk)" },
  { value: "pemakaian", label: "Pemakaian (stok keluar)" },
  { value: "rusak", label: "Rusak / cacat" },
  { value: "koreksi", label: "Koreksi hasil hitung fisik" },
  { value: "retur", label: "Retur pelanggan" },
];

/** Inventaris bahan baku + Low Stock Alert (ROADMAP Sprint 3). */
export default async function MaterialsPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan", "tukang"]);

  const rows = await db
    .select()
    .from(materials)
    .where(eq(materials.tenantId, actor.tenantId))
    .orderBy(desc(materials.createdAt));

  const lowStock = rows.filter(
    (m) => Number(m.quantity) <= Number(m.minStockAlert),
  );

  const recentAdjustments = await db
    .select({
      id: materialAdjustments.id,
      delta: materialAdjustments.delta,
      reason: materialAdjustments.reason,
      materialName: materials.name,
      createdAt: materialAdjustments.createdAt,
    })
    .from(materialAdjustments)
    .leftJoin(materials, eq(materials.id, materialAdjustments.materialId))
    .where(eq(materialAdjustments.tenantId, actor.tenantId))
    .orderBy(desc(materialAdjustments.createdAt))
    .limit(10);

  const canEdit = actor.role === "owner" || actor.role === "admin_penjualan";
  const isOwner = actor.role === "owner";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Inventaris Bahan Baku</h1>
      <p className="mt-1 text-sm text-slate-600">
        Stok hanya berubah lewat penyesuaian yang tercatat, supaya bisa
        dipertanggungjawabkan saat stock opname.
      </p>

      {lowStock.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-100 p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-600">
              warning
            </span>
            <h2 className="font-semibold text-yellow-600">
              Stok menipis ({lowStock.length})
            </h2>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-yellow-600 sm:grid-cols-2">
            {lowStock.map((m) => (
              <li key={m.id}>
                {m.name}: {Number(m.quantity)} {m.unit} (minimum{" "}
                {Number(m.minStockAlert)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            Belum ada bahan baku.
          </p>
        ) : (
          rows.map((material) => {
            const qty = Number(material.quantity);
            const min = Number(material.minStockAlert);
            const isLow = qty <= min;

            return (
              <Card key={material.id} bare>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{material.name}</p>
                    <p className="text-sm text-slate-600">
                      {material.category} · {qty} {material.unit} (minimum {min})
                    </p>
                    <p className="text-xs text-slate-500">
                      Diperbarui {formatDateID(material.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLow ? (
                      <Badge tone="pending">stok menipis</Badge>
                    ) : (
                      <Badge tone="settled">aman</Badge>
                    )}
                    {canEdit ? (
                      <Link
                        href={`/dashboard/materials#bahan-${material.id}`}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Ubah
                      </Link>
                    ) : null}
                  </div>
                </div>

                {canEdit ? (
                  <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
                    <ActionForm
                      action={adjustStock}
                      hidden={{ materialId: material.id }}
                      submitLabel="Simpan penyesuaian"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        Penyesuaian stok
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Jumlah"
                          name="delta"
                          type="number"
                          step="0.001"
                          required
                          placeholder="+10 atau -2"
                          hint="Gunakan tanda plus untuk stok masuk."
                        />
                        <Select
                          label="Alasan"
                          name="reason"
                          options={REASON_OPTIONS}
                          required
                        />
                      </div>
                      <Field label="Catatan" name="note" />
                    </ActionForm>

                    <ActionForm
                      action={updateMaterial}
                      hidden={{ id: material.id }}
                      submitLabel="Simpan data bahan"
                    >
                      <div id={`bahan-${material.id}`} />
                      <p className="text-sm font-medium text-slate-700">
                        Data bahan
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Nama"
                          name="name"
                          defaultValue={material.name}
                          required
                        />
                        <Field
                          label="Kategori"
                          name="category"
                          defaultValue={material.category}
                          required
                        />
                        <Field
                          label="Satuan"
                          name="unit"
                          defaultValue={material.unit}
                          required
                        />
                        <Field
                          label="Ambang minimum"
                          name="minStockAlert"
                          type="number"
                          step="0.001"
                          defaultValue={min}
                          required
                        />
                      </div>
                    </ActionForm>

                    {isOwner ? (
                      // Form hapus HARUS di luar form update: HTML tidak
                      // mengizinkan <form> bersarang dan browser akan
                      // men-olah formnya sendiri.
                      <ActionForm
                        action={deleteMaterial}
                        hidden={{ id: material.id }}
                        submitLabel="Hapus bahan"
                        tone="danger"
                        className="mt-4 border-t border-slate-100 pt-4"
                      >
                        <p className="text-sm text-slate-700">
                          Menghapus bahan juga menghapus riwayat penyesuaiannya.
                        </p>
                      </ActionForm>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })
        )}

        {canEdit ? (
          <Card title="Tambah bahan baku">
            <ActionForm action={createMaterial} submitLabel="Tambah bahan">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama bahan" name="name" required placeholder="Papan Kayu Jati 200x20" />
                <Field
                  label="Kategori"
                  name="category"
                  required
                  placeholder="Kayu / Finishing / Hardware / Busa"
                />
                <Field label="Satuan" name="unit" required placeholder="m3, Liter, Pcs" />
                <Field
                  label="Stok awal"
                  name="quantity"
                  type="number"
                  step="0.001"
                  defaultValue={0}
                />
                <Field
                  label="Ambang minimum"
                  name="minStockAlert"
                  type="number"
                  step="0.001"
                  defaultValue={5}
                />
              </div>
            </ActionForm>
          </Card>
        ) : null}

        {recentAdjustments.length > 0 ? (
          <Card title="Penyesuaian terbaru" description="Jejak audit stok.">
            <ul className="grid gap-1 text-sm text-slate-700">
              {recentAdjustments.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>
                    {a.materialName ?? "bahan dihapus"} ·{" "}
                    {Number(a.delta) > 0 ? "+" : ""}
                    {a.delta} ({a.reason})
                  </span>
                  <span className="text-slate-500">{formatDateID(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
