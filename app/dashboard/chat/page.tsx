import Link from "next/link";
import { requireTenantWrite } from "@/lib/auth/guard";
import { listConversations, lastMessagePreview } from "@/lib/actions/chat";
import { formatDateID } from "@/lib/format";
import { CONVERSATION_STATUS_LABELS } from "@/lib/labels";
import { Badge, EmptyState } from "@/components/ui";

/** Inbox Customer Service (ROADMAP Sprint 3). */
export default async function ChatInboxPage() {
  const actor = await requireTenantWrite(["owner", "admin_penjualan"]);

  const conversations = await listConversations(actor.tenantId);
  const previews = await lastMessagePreview(conversations.map((c) => c.id));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Inbox Customer Service</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Percakapan pembeli masuk lewat widget storefront (Sprint 5). Untuk sekarang
        halaman ini siap menerima dan membalas pesan.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="Belum ada percakapan masuk." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/dashboard/chat/${conversation.id}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {conversation.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.customerPhone}
                      {conversation.assignee
                        ? ` · ditangani ${conversation.assignee}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {conversation.unreadCount > 0 ? (
                      <Badge tone="pending">
                        {conversation.unreadCount} belum dibalas
                      </Badge>
                    ) : null}
                    <Badge
                      tone={
                        conversation.status === "open" ? "production" : "neutral"
                      }
                    >
                      {CONVERSATION_STATUS_LABELS[conversation.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateID(conversation.lastMessageAt)}
                    </span>
                  </div>
                </div>

                {previews[conversation.id] ? (
                  <p className="mt-2 truncate text-sm text-secondary">
                    {previews[conversation.id]}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Belum ada pesan.</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Urutan: percakapan baru dan menunggu pembeli didahulukan, lalu berdasarkan
        pesan terakhir.
      </p>
    </main>
  );
}
