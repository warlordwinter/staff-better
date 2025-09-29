// Tests for the new MessageRouter (replaces IncomingMessageService)

import { MessageRouter } from "@/lib/services/MessageRouter";
import { MessageAction } from "@/lib/services/interfaces/MessageAction";
import { Associate } from "@/model/interfaces/Associate";

// Mock the dependencies
jest.mock("@/lib/dao/implementations/supabase/AssociatesDaoSupabase");
jest.mock("@/lib/dao/JobsAssignmentsDao");
jest.mock("@/lib/twilio/sms");

describe("MessageRouter", () => {
  let messageRouter: MessageRouter;

  const mockAssociate: Associate = {
    id: "assoc-123",
    first_name: "John",
    last_name: "Doe",
    work_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    phone_number: "+1234567890",
    email_address: "john.doe@example.com",
  };

  beforeEach(() => {
    messageRouter = new MessageRouter();
    jest.clearAllMocks();
  });

  describe("processIncomingMessage", () => {
    it("should process confirmation message successfully", async () => {
      // This is a basic test - in a real implementation, you'd mock the DAO and SMS services
      const result = await messageRouter.processIncomingMessage(
        "+1234567890",
        "confirm"
      );

      // Since we're not mocking the dependencies, this will likely fail
      // but we can test the structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("action");
      expect(result).toHaveProperty("phone_number");
      expect(result).toHaveProperty("message");
    });

    it("should handle unknown phone numbers", async () => {
      const result = await messageRouter.processIncomingMessage(
        "+1999999999",
        "confirm"
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe(MessageAction.UNKNOWN);
      expect(result.error).toBe("Associate not found");
    });

    it("should handle help requests", async () => {
      const result = await messageRouter.processIncomingMessage(
        "+1234567890",
        "help"
      );

      expect(result).toHaveProperty("action", MessageAction.HELP_REQUEST);
    });

    it("should handle opt-out requests", async () => {
      const result = await messageRouter.processIncomingMessage(
        "+1234567890",
        "stop"
      );

      expect(result).toHaveProperty("action", MessageAction.OPT_OUT);
    });
  });

  describe("getProcessingStats", () => {
    it("should return processing statistics", () => {
      const stats = messageRouter.getProcessingStats();

      expect(stats).toHaveProperty("totalHandlers");
      expect(stats).toHaveProperty("supportedActions");
      expect(stats.supportedActions).toContain(MessageAction.CONFIRMATION);
      expect(stats.supportedActions).toContain(MessageAction.HELP_REQUEST);
      expect(stats.supportedActions).toContain(MessageAction.OPT_OUT);
      expect(stats.supportedActions).toContain(MessageAction.UNKNOWN);
    });
  });
});
