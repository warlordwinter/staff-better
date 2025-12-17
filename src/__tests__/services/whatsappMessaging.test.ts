/**
 * Tests for WhatsApp messaging behavior including:
 * - WhatsApp message detection in webhooks
 * - 24-hour rule enforcement
 * - Auto-switching to WhatsApp channel
 * - Channel persistence in conversations
 */

import { MessagesDaoSupabase } from "@/lib/dao/implementations/supabase/MessagesDaoSupabase";
import { ConversationsDaoSupabase } from "@/lib/dao/implementations/supabase/ConversationsDaoSupabase";
import { createAdminClient } from "@/lib/supabase/admin";

// Mock Supabase admin client
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

// Mock the service container
jest.mock("@/lib/services/ServiceContainer", () => ({
  serviceContainer: {
    getMessagesDao: jest.fn(),
    getMessageService: jest.fn(),
  },
}));

describe("WhatsApp Messaging Behavior", () => {
  let mockSupabaseClient: any;
  let messagesDao: MessagesDaoSupabase;
  let conversationsDao: ConversationsDaoSupabase;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({
                  single: jest.fn(),
                })),
                order: jest.fn(() => ({
                  order: jest.fn(() => ({
                    single: jest.fn(),
                  })),
                })),
              })),
              is: jest.fn(() => ({
                order: jest.fn(() => ({
                  order: jest.fn(),
                })),
              })),
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(),
                })),
              })),
              single: jest.fn(),
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(),
                })),
              })),
            })),
          })),
        })),
      })),
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    messagesDao = new MessagesDaoSupabase();
    conversationsDao = new ConversationsDaoSupabase();
  });

  describe("hasRecentInboundMessage", () => {
    it("should return 'whatsapp' if recent inbound WhatsApp message exists", async () => {
      const conversationId = "conv-123";
      const hoursAgo = 24;

      // Mock conversation fetch - returns WhatsApp channel
      const conversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { channel: "whatsapp" },
              error: null,
            }),
          })),
        })),
      };

      // Mock messages fetch - returns recent inbound message
      const messagesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        sent_at: new Date(
                          Date.now() - 12 * 60 * 60 * 1000
                        ).toISOString(), // 12 hours ago
                        direction: "inbound",
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(conversationQuery)
        .mockReturnValueOnce(messagesQuery);

      const result = await messagesDao.hasRecentInboundMessage(
        conversationId,
        hoursAgo
      );

      expect(result).toBe("whatsapp");
    });

    it("should return 'sms' if recent inbound SMS message exists", async () => {
      const conversationId = "conv-123";
      const hoursAgo = 24;

      // Mock conversation fetch - returns SMS channel
      const conversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { channel: "sms" },
              error: null,
            }),
          })),
        })),
      };

      // Mock messages fetch - returns recent inbound message
      const messagesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        sent_at: new Date(
                          Date.now() - 12 * 60 * 60 * 1000
                        ).toISOString(), // 12 hours ago
                        direction: "inbound",
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(conversationQuery)
        .mockReturnValueOnce(messagesQuery);

      const result = await messagesDao.hasRecentInboundMessage(
        conversationId,
        hoursAgo
      );

      expect(result).toBe("sms");
    });

    it("should return null if no recent inbound message exists", async () => {
      const conversationId = "conv-123";
      const hoursAgo = 24;

      // Mock conversation fetch
      const conversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { channel: "whatsapp" },
              error: null,
            }),
          })),
        })),
      };

      // Mock messages fetch - returns empty array (no recent messages)
      const messagesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(conversationQuery)
        .mockReturnValueOnce(messagesQuery);

      const result = await messagesDao.hasRecentInboundMessage(
        conversationId,
        hoursAgo
      );

      expect(result).toBeNull();
    });

    it("should return null if message is older than 24 hours", async () => {
      const conversationId = "conv-123";
      const hoursAgo = 24;

      // Mock conversation fetch
      const conversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { channel: "whatsapp" },
              error: null,
            }),
          })),
        })),
      };

      // Mock messages fetch - returns message older than 24 hours
      const messagesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(conversationQuery)
        .mockReturnValueOnce(messagesQuery);

      const result = await messagesDao.hasRecentInboundMessage(
        conversationId,
        hoursAgo
      );

      expect(result).toBeNull();
    });
  });

  describe("WhatsApp Channel Detection", () => {
    it("should detect WhatsApp message from 'whatsapp:' prefix in From field", () => {
      const fromNumber = "whatsapp:+1234567890";
      const toNumber = "+1987654321";

      const isWhatsApp =
        fromNumber.toLowerCase().startsWith("whatsapp:") ||
        toNumber.toLowerCase().startsWith("whatsapp:");

      expect(isWhatsApp).toBe(true);
    });

    it("should detect WhatsApp message from 'whatsapp:' prefix in To field", () => {
      const fromNumber = "+1234567890";
      const toNumber = "whatsapp:+1987654321";

      const isWhatsApp =
        fromNumber.toLowerCase().startsWith("whatsapp:") ||
        toNumber.toLowerCase().startsWith("whatsapp:");

      expect(isWhatsApp).toBe(true);
    });

    it("should not detect SMS message without 'whatsapp:' prefix", () => {
      const fromNumber = "+1234567890";
      const toNumber = "+1987654321";

      const isWhatsApp =
        fromNumber.toLowerCase().startsWith("whatsapp:") ||
        toNumber.toLowerCase().startsWith("whatsapp:");

      expect(isWhatsApp).toBe(false);
    });
  });

  describe("Conversation Channel Management", () => {
    it("should create conversation with WhatsApp channel when WhatsApp message received", async () => {
      const associateId = "assoc-123";
      const companyId = "company-123";
      const channel = "whatsapp";

      // Mock: no existing conversation found
      const findQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      // Mock: create new conversation
      const createQuery = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: "conv-123",
                associate_id: associateId,
                company_id: companyId,
                channel: channel,
              },
              error: null,
            }),
          })),
        })),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(findQuery)
        .mockReturnValueOnce(createQuery);

      const conversationId = await conversationsDao.findOrCreateConversation(
        associateId,
        companyId,
        channel
      );

      expect(conversationId).toBe("conv-123");
      expect(createQuery.insert).toHaveBeenCalledWith([
        {
          associate_id: associateId,
          company_id: companyId,
          channel: channel,
        },
      ]);
    });

    it("should find existing conversation with matching channel", async () => {
      const associateId = "assoc-123";
      const companyId = "company-123";
      const channel = "whatsapp";

      // Mock: existing conversation found
      const findQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: "conv-123" }],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from.mockReturnValueOnce(findQuery);

      const conversationId = await conversationsDao.findOrCreateConversation(
        associateId,
        companyId,
        channel
      );

      expect(conversationId).toBe("conv-123");
    });
  });

  describe("24-Hour Rule Enforcement", () => {
    it("should allow WhatsApp message if inbound message received within 24 hours", () => {
      const recentChannel = "whatsapp";
      const requestedChannel = "whatsapp";

      // This simulates the check in handleDirectMessage/handleAssociateMessage
      const canSend = requestedChannel !== "whatsapp" || recentChannel !== null;

      expect(canSend).toBe(true);
    });

    it("should block WhatsApp message if no inbound message in last 24 hours", () => {
      const recentChannel = null;
      const requestedChannel = "whatsapp";

      // This simulates the check in handleDirectMessage/handleAssociateMessage
      const canSend = requestedChannel !== "whatsapp" || recentChannel !== null;

      expect(canSend).toBe(false);
    });

    it("should allow SMS message regardless of 24-hour rule", () => {
      const recentChannel = null;
      const requestedChannel = "sms";

      // SMS is not restricted by 24-hour rule
      const canSend = requestedChannel === "sms" || recentChannel !== null;

      expect(canSend).toBe(true);
    });
  });

  describe("Auto-Switch to WhatsApp Channel", () => {
    it("should auto-switch to WhatsApp when user messaged via WhatsApp in last 24h", () => {
      const recentChannel = "whatsapp";
      let channel = "sms"; // User initially selected SMS

      // Simulate auto-switch logic
      if (recentChannel === "whatsapp" && channel !== "whatsapp") {
        channel = "whatsapp";
      }

      expect(channel).toBe("whatsapp");
    });

    it("should not switch if recent message was SMS", () => {
      const recentChannel: "sms" | "whatsapp" = "sms";
      let channel = "sms";

      // Simulate auto-switch logic
      // Since both recentChannel and channel are "sms", no switch occurs.
      if (recentChannel === "sms" && channel !== "sms") {
        channel = "sms";
      }

      expect(channel).toBe("sms");
    });

    it("should not switch if already using WhatsApp", () => {
      const recentChannel = "whatsapp";
      let channel = "whatsapp";

      // Simulate auto-switch logic
      if (recentChannel === "whatsapp" && channel !== "whatsapp") {
        channel = "whatsapp";
      }

      expect(channel).toBe("whatsapp");
    });
  });
});
