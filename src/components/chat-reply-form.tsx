"use client";

import { ZodForm } from "@/components/zod-form";
import { SelectField, TextAreaField } from "@/components/rhf-fields";
import {
  replyFormSchema,
  setConversationStatusFormSchema,
  type ConversationStatusValue,
} from "@/lib/schemas/chat";
import {
  replyToConversation,
  setConversationStatus,
} from "@/lib/actions/chat";

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

/** Ubah status percakapan dari Inbox CS. */
export function ConversationStatusForm({
  conversationId,
  current,
}: {
  conversationId: string;
  current: ConversationStatusValue;
}) {
  return (
    <ZodForm
      schema={setConversationStatusFormSchema}
      action={setConversationStatus}
      hidden={{ conversationId }}
      defaultValues={{ status: current }}
      submitLabel="Ubah status"
      tone="ghost"
    >
      {(ctx) => (
        <SelectField
          ctx={ctx}
          label="Status percakapan"
          name="status"
          defaultValue={current}
          options={[
            { value: "open", label: "Baru / ditangani" },
            { value: "pending", label: "Menunggu pembeli" },
            { value: "resolved", label: "Selesai" },
          ]}
        />
      )}
    </ZodForm>
  );
}
