import { ArmchairIcon, StorefrontIcon } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">FurniTech</h1>
      <p className="mt-2 text-secondary">
        Sprint 1 — Foundation, DB Schema &amp; Multi-Tenant Routing.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <StorefrontIcon size={22} weight="light" className="text-primary" aria-hidden />
          <h2 className="mt-2 font-semibold text-foreground">Storefront</h2>
          <p className="text-sm text-muted-foreground">
            Katalog, ongkir otomatis, checkout Midtrans.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <ArmchairIcon size={22} weight="light" className="text-primary" aria-hidden />
          <h2 className="mt-2 font-semibold text-foreground">Back-Office</h2>
          <p className="text-sm text-muted-foreground">
            Order, RBAC, inventory, progress tracker.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <ArmchairIcon size={20} weight="light" aria-hidden />
        Primary CTA
      </button>
    </main>
  );
}
