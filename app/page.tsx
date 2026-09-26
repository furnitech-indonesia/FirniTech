export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">FurniTech</h1>
      <p className="mt-2 text-slate-700">
        Sprint 1 — Foundation, DB Schema &amp; Multi-Tenant Routing.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Storefront</h2>
          <p className="text-sm text-slate-700">
            Katalog, ongkir otomatis, checkout Midtrans.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Back-Office</h2>
          <p className="text-sm text-slate-700">
            Order, RBAC, inventory, progress tracker.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="mt-6 rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
      >
        <span className="material-symbols-outlined mr-2 align-middle">
          chair
        </span>
        Primary CTA
      </button>
    </main>
  );
}
