// Tests for MessageParserService

import { MessageParserService } from "@/lib/services/shared/MessageParserService";
import { MessageAction } from "@/lib/services/interfaces/MessageAction";

describe("MessageParserService", () => {
  let messageParser: MessageParserService;

  beforeEach(() => {
    messageParser = new MessageParserService();
  });

  describe("parseMessageAction", () => {
    it("should parse confirmation messages", () => {
      const confirmationMessages = [
        "c",
        "confirm",
        "confirmed",
        "yes",
        "y",
        "ok",
        "okay",
        "sure",
        "will be there",
        "i'll be there",
        "ill be there",
        "C",
        "CONFIRM",
        "Yes",
        "OK",
      ];

      confirmationMessages.forEach((message) => {
        const result = messageParser.parseMessageAction(message);
        expect(result).toBe(MessageAction.CONFIRMATION);
      });
    });

    it("should parse help requests", () => {
      const helpMessages = ["help", "HELP", "Help"];

      helpMessages.forEach((message) => {
        const result = messageParser.parseMessageAction(message);
        expect(result).toBe(MessageAction.HELP_REQUEST);
      });
    });

    it("should parse opt-out requests", () => {
      const optOutMessages = [
        "stop",
        "unsubscribe",
        "STOP",
        "UNSUBSCRIBE",
        "Stop",
      ];

      optOutMessages.forEach((message) => {
        const result = messageParser.parseMessageAction(message);
        expect(result).toBe(MessageAction.OPT_OUT);
      });
    });

    it("should parse unknown messages", () => {
      const unknownMessages = [
        "hello",
        "random text",
        "123",
        "what is this?",
        "",
        "   ",
      ];

      unknownMessages.forEach((message) => {
        const result = messageParser.parseMessageAction(message);
        expect(result).toBe(MessageAction.UNKNOWN);
      });
    });
  });

  describe("isConfirmationMessage", () => {
    it("should identify confirmation messages", () => {
      const confirmationMessages = [
        "c",
        "confirm",
        "confirmed",
        "yes",
        "y",
        "ok",
        "okay",
        "sure",
        "will be there",
        "i'll be there",
        "ill be there",
      ];

      confirmationMessages.forEach((message) => {
        const result = messageParser.isConfirmationMessage(message);
        expect(result).toBe(true);
      });
    });

    it("should identify confirmation messages with extra text", () => {
      const confirmationMessages = [
        "yes, I'll be there",
        "confirm for tomorrow",
        "ok, sounds good",
        "sure thing",
      ];

      confirmationMessages.forEach((message) => {
        const result = messageParser.isConfirmationMessage(message);
        expect(result).toBe(true);
      });
    });

    it("should not identify non-confirmation messages", () => {
      const nonConfirmationMessages = [
        "help",
        "stop",
        "hello",
        "no",
        "maybe",
        "not sure",
      ];

      nonConfirmationMessages.forEach((message) => {
        const result = messageParser.isConfirmationMessage(message);
        expect(result).toBe(false);
      });
    });
  });

  describe("normalizeMessage", () => {
    it("should normalize message text", () => {
      expect(messageParser.normalizeMessage("  HELLO  ")).toBe("hello");
      expect(messageParser.normalizeMessage("Confirm")).toBe("confirm");
      expect(messageParser.normalizeMessage("YES")).toBe("yes");
      expect(messageParser.normalizeMessage("")).toBe("");
    });
  });

  describe("extractMessageInfo", () => {
    it("should extract message information", () => {
      const message = "Hello, I'll be there at 9 AM";
      const info = messageParser.extractMessageInfo(message);

      expect(info.originalMessage).toBe(message);
      expect(info.normalizedMessage).toBe("hello, i'll be there at 9 am");
      expect(info.wordCount).toBe(7);
      expect(info.hasNumbers).toBe(true);
    });

    it("should handle messages without numbers", () => {
      const message = "Hello world";
      const info = messageParser.extractMessageInfo(message);

      expect(info.hasNumbers).toBe(false);
    });

    it("should handle empty messages", () => {
      const message = "";
      const info = messageParser.extractMessageInfo(message);

      expect(info.originalMessage).toBe("");
      expect(info.normalizedMessage).toBe("");
      expect(info.wordCount).toBe(0);
      expect(info.hasNumbers).toBe(false);
    });
  });
});
