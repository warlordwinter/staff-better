import type { Conversation } from "@/lib/services/messagesDataService";

/**
 * Compute a stable key that represents "new message arrived" or "conversation changed"
 * for auto-scroll purposes.
 *
 * Intentionally ignores message status changes (delivered/read) so we don't scroll
 * when only metadata updates.
 */
export function computeAutoScrollKey(
  conversation: Conversation | null
): string | null {
  if (!conversation) return null;

  const count = conversation.messages?.length ?? 0;
  const lastMessageId =
    count > 0 ? conversation.messages[count - 1]?.id ?? "" : "";

  return `${conversation.id}:${count}:${lastMessageId}`;
}

/**
 * Determine whether `selectedConversation` should be replaced with the newer
 * object reference from `conversations`.
 *
 * This is important because status updates (delivered/read) can update message
 * fields without changing message count or last message id.
 */
export function shouldSyncSelectedConversation(
  selectedConversation: Conversation | null,
  conversations: Conversation[]
): Conversation | null {
  if (!selectedConversation) return null;
  if (!conversations || conversations.length === 0) return null;

  const updated = conversations.find((c) => c.id === selectedConversation.id);
  if (!updated) return null;

  return updated !== selectedConversation ? updated : null;
}


