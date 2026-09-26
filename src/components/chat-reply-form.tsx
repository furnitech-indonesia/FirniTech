"use client";

import { ZodForm } from "@/components/zod-form";
import { TextAreaField } from "@/components/rhf-fields";
import { replyFormSchema } from "@/lib/schemas/chat";
import { replyToConversation } from "@/lib/actions/chat";

/** Form balasan percakapan di Inbox CS. */
export function ChatReplyForm({ conversationId }: { conversationId: string }) {
  return (
    <ZodForm
      schema={replyFormSchema}
      action={replyToConversation}
      hidden={{ conversationId }}
      defaultValues={{ body: "" }}
      submitLabel="Kirim balasan"
    >
      {(ctx) => (
        <TextAreaField
          ctx={ctx}
          label="Pesan"
          name="body"
          rows={3}
          required
          placeholder="Tulis balasan untuk pembeli…"
        />
      )}
    </ZodForm>
  );
}
