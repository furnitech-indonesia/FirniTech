import { desc, eq } from "drizzle-orm";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { db } from "@/db";
import { materialAdjustments, materials } from "@/db/schema";
import { ActionForm } from "@/components/action-form";
import { AdjustStockForm, CreateMaterialForm } from "@/components/material-forms";
import { EditMaterialForm } from "@/components/edit-material-form";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { requireTenantWrite } from "@/lib/auth/guard";
import { deleteMaterial } from "@/lib/actions/materials";
import { formatDateID } from "@/lib/format";

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
    <main id="konten-utama" className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Inventaris Bahan Baku</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stok hanya berubah lewat penyesuaian yang tercatat, supaya bisa
        dipertanggungjawabkan saat stock opname.
      </p>

      {lowStock.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-status-pending bg-status-pending-bg p-4">
          <div className="flex items-center gap-2">
            <WarningIcon size={20} weight="light" className="text-status-pending" aria-hidden />
            <h2 className="font-semibold text-status-pending">
              Stok menipis ({lowStock.length})
            </h2>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-status-pending sm:grid-cols-2">
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
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Belum ada bahan baku.
          </p>
        ) : (
          rows.map((material) => {
            const qty = Number(material.quantity);
            const min = Number(material.minStockAlert);
            const isLow = qty <= min;

            return (
              <SectionCard key={material.id} bare>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-foreground">{material.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {material.category} · {qty} {material.unit} (minimum {min})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Diperbarui {formatDateID(material.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLow ? (
                      <Badge variant="pending">stok menipis</Badge>
                    ) : (
                      <Badge variant="settled">aman</Badge>
                    )}
                  </div>
                </div>

                {canEdit ? (
                  <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
                    <div className="grid gap-3">
                      <p className="text-sm font-medium text-secondary">
                        Penyesuaian stok
                      </p>
                      <AdjustStockForm materialId={material.id} />
                    </div>

                    <div className="grid gap-3">
                      <p className="text-sm font-medium text-secondary">
                        Data bahan
                      </p>
                      <EditMaterialForm
                        material={{
                          id: material.id,
                          name: material.name,
                          category: material.category,
                          unit: material.unit,
                          minStockAlert: String(min),
                        }}
                      />
                    </div>

                    {isOwner ? (
                      // Form hapus berada di luar dua form di atas: HTML
                      // tidak mengizinkan <form> bersarang, dan browser akan
                      // merusak form yang ada di dalamnya.
                      <ActionForm
                        action={deleteMaterial}
                        hidden={{ id: material.id }}
                        submitLabel="Hapus bahan"
                        tone="danger"
                        className="border-t border-border pt-4 lg:col-span-2"
                      >
                        <p className="text-sm text-secondary">
                          Menghapus bahan juga menghapus riwayat penyesuaiannya.
                        </p>
                      </ActionForm>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>
            );
          })
        )}

        {canEdit ? (
          <SectionCard title="Tambah bahan baku">
            <CreateMaterialForm />
          </SectionCard>
        ) : null}

        {recentAdjustments.length > 0 ? (
          <SectionCard title="Penyesuaian terbaru" description="Jejak audit stok.">
            <ul className="grid gap-1 text-sm text-secondary">
              {recentAdjustments.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>
                    {a.materialName ?? "bahan dihapus"} ·{" "}
                    {Number(a.delta) > 0 ? "+" : ""}
                    {a.delta} ({a.reason})
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateID(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
      </div>
    </main>
  );
}
