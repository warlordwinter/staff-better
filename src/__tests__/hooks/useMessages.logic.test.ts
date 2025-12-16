import {
  computeAutoScrollKey,
  shouldSyncSelectedConversation,
} from "@/hooks/useMessages.logic";
import type { Conversation, Message } from "@/lib/services/messagesDataService";

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  const messages: Message[] = overrides?.messages ?? [];
  return {
    id: overrides?.id ?? "conv-1",
    associateId: overrides?.associateId ?? "assoc-1",
    name: overrides?.name ?? "Test Person",
    initials: overrides?.initials ?? "TP",
    phoneNumber: overrides?.phoneNumber ?? "+15555555555",
    lastMessage: overrides?.lastMessage ?? (messages[messages.length - 1]?.text ?? ""),
    timestamp: overrides?.timestamp ?? "1:23 PM",
    unread: overrides?.unread ?? false,
    messages,
    channel: overrides?.channel ?? "whatsapp",
  };
}

function makeOutgoingMessage(overrides?: Partial<Message>): Message {
  return {
    id: overrides?.id ?? "msg-1",
    text: overrides?.text ?? "hello",
    sender: overrides?.sender ?? "outgoing",
    timestamp: overrides?.timestamp ?? "1:23 PM",
    status: overrides?.status ?? "delivered",
    deliveredAt: overrides?.deliveredAt ?? null,
    channel: overrides?.channel ?? "whatsapp",
    templateName: overrides?.templateName,
    templateContent: overrides?.templateContent,
    templateSid: overrides?.templateSid,
  };
}

describe("useMessages.logic", () => {
  test("computeAutoScrollKey ignores status-only changes", () => {
    const msg = makeOutgoingMessage({ id: "m1", status: "delivered" });
    const selected = makeConversation({
      id: "c1",
      messages: [msg],
    });

    // Same id/count/last id, only status differs
    const updated = makeConversation({
      id: "c1",
      messages: [makeOutgoingMessage({ id: "m1", status: "read" })],
    });

    expect(computeAutoScrollKey(selected)).toBe("c1:1:m1");
    expect(computeAutoScrollKey(updated)).toBe("c1:1:m1");
  });

  test("shouldSyncSelectedConversation returns updated conversation when reference changes (e.g., status update)", () => {
    const selected = makeConversation({
      id: "c1",
      messages: [makeOutgoingMessage({ id: "m1", status: "delivered" })],
    });

    const updated = makeConversation({
      id: "c1",
      messages: [makeOutgoingMessage({ id: "m1", status: "read" })],
    });

    const next = shouldSyncSelectedConversation(selected, [updated]);
    expect(next).toBe(updated);
  });

  test("shouldSyncSelectedConversation returns null when conversation reference is unchanged", () => {
    const selected = makeConversation({
      id: "c1",
      messages: [makeOutgoingMessage({ id: "m1", status: "delivered" })],
    });

    const next = shouldSyncSelectedConversation(selected, [selected]);
    expect(next).toBeNull();
  });
});


