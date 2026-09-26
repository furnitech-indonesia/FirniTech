import { z } from "zod";

import { text } from "./primitives";

/** Skema Inbox CS (ROADMAP Sprint 3). */

export const CONVERSATION_STATUSES = ["open", "pending", "resolved"] as const;
export type ConversationStatusValue = (typeof CONVERSATION_STATUSES)[number];

export const conversationIdSchema = z.object({
  conversationId: z.uuid("Percakapan tidak valid."),
});

export const replyFormSchema = z.object({
  body: text("Pesan", 2000),
});

export const replySchema = replyFormSchema.extend({
  conversationId: z.uuid("Percakapan tidak valid."),
});

export const setConversationStatusFormSchema = z.object({
  status: z.enum(CONVERSATION_STATUSES, { message: "Status tidak valid." }),
});

export const setConversationStatusSchema =
  setConversationStatusFormSchema.extend({
    conversationId: z.uuid("Percakapan tidak valid."),
  });

export type ReplyInput = z.infer<typeof replySchema>;
