import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { conversations } from "@/db/schema";
import { requireTenantWrite } from "@/lib/auth/guard";
import { listMessages, markConversationRead } from "@/lib/actions/chat";
import {
  ChatReplyForm,
  ConversationStatusForm,
} from "@/components/chat-reply-form";
import { formatDateID } from "@/lib/format";
import { CONVERSATION_STATUS_LABELS } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { SectionCard } from "@/components/panels";
import { Badge } from "@/components/ui/badge";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantWrite(["owner", "admin_penjualan"]);

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, id),
        eq(conversations.tenantId, actor.tenantId),
      ),
    )
    .limit(1);

  if (!conversation) notFound();

  const messages = await listMessages(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm">
        <Link href="/dashboard/chat" className="text-accent-foreground hover:underline">
          ← Kembali ke inbox
        </Link>
      </p>

      <header className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {conversation.customerName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {conversation.customerPhone}
          </p>
        </div>
        <Badge variant="neutral">
          {CONVERSATION_STATUS_LABELS[conversation.status]}
        </Badge>
      </header>

      <SectionCard title="Percakapan">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
        ) : (
          <ul className="grid gap-3">
            {messages.map((message) => {
              const fromStaff = message.senderUserId !== null;
              return (
                <li
                  key={message.id}
                  className={
                    fromStaff
                      ? "ml-auto max-w-[80%] rounded-2xl bg-accent p-3"
                      : "mr-auto max-w-[80%] rounded-2xl bg-muted p-3"
                  }
                >
                  <p className="text-sm text-foreground">{message.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fromStaff ? message.senderName : conversation.customerName}
                    {" · "}
                    {formatDateID(message.createdAt)}
                    {message.readAt ? " · dibaca" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <div className="mt-6 grid gap-4">
        <SectionCard title="Balas">
          <ChatReplyForm conversationId={id} />
        </SectionCard>

        <SectionCard title="Tindakan">
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionForm
              action={markConversationRead}
              hidden={{ conversationId: id }}
              submitLabel="Tandai sudah dibaca"
              tone="ghost"
            />

            <ConversationStatusForm
                conversationId={id}
                current={conversation.status}
              />
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
