"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages, conversations, users } from "@/db/schema";
import { requireTenantWrite, guard } from "@/lib/auth/guard";
import { parseForm } from "@/lib/schemas/primitives";
import {
  conversationIdSchema,
  replySchema,
  setConversationStatusSchema,
} from "@/lib/schemas/chat";

/**
 * Inbox Customer Service (ROADMAP Sprint 3).
 *
 * Catatan keamanan: policy RLS TIDAK mengizinkan INSERT percakapan dari anon,
 * karena pembeli tidak punya akun. Pesan masuk lewat Route Handler yang
 * memakai service_role (widget storefront, Sprint 5). Action di sini hanya
 * untuk sisi staf: membalas, menandai terbaca, dan mengubah status.
 */

const STAFF_ROLES = ["owner", "admin_penjualan"] as const;

export type ChatFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function replyToConversation(
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  return guard<ChatFormState>(
    async () => {
      const actor = await requireTenantWrite(STAFF_ROLES);

      const parsed = parseForm(replySchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { conversationId, body } = parsed.data;

      const [conversation] = await db
        .select({ id: conversations.id, status: conversations.status })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.tenantId, actor.tenantId),
          ),
        )
        .limit(1);

      if (!conversation) return { error: "Percakapan tidak ditemukan." };

      await db.transaction(async (tx) => {
        await tx.insert(chatMessages).values({
          conversationId,
          senderUserId: actor.userId,
          body,
        });

        // Balasan staf menutup hitungan belum-dibalas dan menggeser waktu pesan
        // terakhir supaya urutannya tidak berantakan di inbox.
        await tx
          .update(conversations)
          .set({
            lastMessageAt: new Date(),
            unreadCount: 0,
            status: conversation.status === "resolved" ? "open" : conversation.status,
          })
          .where(eq(conversations.id, conversationId));
      });

      revalidatePath(`/dashboard/chat/${conversationId}`);
      revalidatePath("/dashboard/chat");
      return { message: "Balasan terkirim." };
    },
    (error) => ({ error }),
  );
}

export async function markConversationRead(
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  return guard<ChatFormState>(
    async () => {
      const actor = await requireTenantWrite(STAFF_ROLES);

      const parsed = parseForm(conversationIdSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { conversationId } = parsed.data;

      const [conversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (!conversation) return { error: "Percakapan tidak ditemukan." };

      await db.transaction(async (tx) => {
        // Hanya pesan dari pembeli yang ditandai terbaca.
        await tx
          .update(chatMessages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(chatMessages.conversationId, conversationId),
              isNull(chatMessages.senderUserId),
            ),
          );
        await tx
          .update(conversations)
          .set({ unreadCount: 0 })
          .where(eq(conversations.id, conversationId));
      });

      revalidatePath(`/dashboard/chat/${conversationId}`);
      revalidatePath("/dashboard/chat");
      return {};
    },
    (error) => ({ error }),
  );
}

export async function setConversationStatus(
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  return guard<ChatFormState>(
    async () => {
      const actor = await requireTenantWrite(STAFF_ROLES);

      const parsed = parseForm(setConversationStatusSchema, formData);
      if (!parsed.success) {
        return { error: parsed.message, fieldErrors: parsed.fieldErrors };
      }
      const { conversationId, status } = parsed.data;

      await db
        .update(conversations)
        .set({ status })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.tenantId, actor.tenantId),
          ),
        );

      revalidatePath(`/dashboard/chat/${conversationId}`);
      revalidatePath("/dashboard/chat");
      return { message: "Status percakapan diperbarui." };
    },
    (error) => ({ error }),
  );
}

/**
 * Daftar percakapan untuk inbox, urut dari yang paling perlu dilihat.
 * Query ini memakai join untuk menampilkan nama staf penugas.
 */
export async function listConversations(tenantId: string) {
  return db
    .select({
      id: conversations.id,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      status: conversations.status,
      unreadCount: conversations.unreadCount,
      lastMessageAt: conversations.lastMessageAt,
      assignee: users.fullName,
    })
    .from(conversations)
    .leftJoin(users, eq(users.id, conversations.assignedToUserId))
    .where(eq(conversations.tenantId, tenantId))
    .orderBy(
      sql`case ${conversations.status} when 'open' then 0 when 'pending' then 1 else 2 end`,
      desc(conversations.lastMessageAt),
    );
}

/** Pesan dalam satu percakapan. */
export async function listMessages(conversationId: string) {
  return db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      senderUserId: chatMessages.senderUserId,
      createdAt: chatMessages.createdAt,
      readAt: chatMessages.readAt,
      senderName: users.fullName,
    })
    .from(chatMessages)
    .leftJoin(users, eq(users.id, chatMessages.senderUserId))
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);
}

/** Pesan terakhir per percakapan untuk pratinjau di daftar inbox. */
export async function lastMessagePreview(
  conversationIds: readonly string[],
): Promise<Record<string, string>> {
  if (conversationIds.length === 0) return {};

  const rows = await db
    .select({
      conversationId: chatMessages.conversationId,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(inArray(chatMessages.conversationId, [...conversationIds]))
    .orderBy(desc(chatMessages.createdAt));

  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!map[row.conversationId]) map[row.conversationId] = row.body;
  }
  return map;
}
