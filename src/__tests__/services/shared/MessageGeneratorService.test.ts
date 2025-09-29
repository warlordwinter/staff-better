// Tests for MessageGeneratorService

import { MessageGeneratorService } from "@/lib/services/shared/MessageGeneratorService";
import {
  ReminderType,
  ReminderAssignment,
} from "@/lib/services/reminderService";

// Mock the timezone utils
jest.mock("@/utils/timezoneUtils", () => ({
  convertUTCTimeToLocal: jest.fn((time: string) => time),
}));

describe("MessageGeneratorService", () => {
  let messageGenerator: MessageGeneratorService;

  const mockAssignment: ReminderAssignment = {
    job_id: "job-123",
    associate_id: "assoc-456",
    work_date: new Date("2023-10-01"),
    start_time: "09:00",
    associate_first_name: "John",
    associate_last_name: "Doe",
    phone_number: "+1234567890",
    job_title: "Security Guard",
    customer_name: "ABC Corp",
    num_reminders: 3,
    last_activity_time: undefined,
  };

  beforeEach(() => {
    messageGenerator = new MessageGeneratorService();
  });

  describe("generateReminderMessage", () => {
    it("should generate two days before message", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        ReminderType.TWO_DAYS_BEFORE
      );

      expect(message).toContain("John");
      expect(message).toContain("Security Guard");
      expect(message).toContain("ABC Corp");
      expect(message).toContain("in 2 days");
      expect(message).toContain("Reply C to confirm");
    });

    it("should generate day before message", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );

      expect(message).toContain("John");
      expect(message).toContain("tomorrow");
      expect(message).toContain("Reply C to confirm");
    });

    it("should generate morning of message", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        ReminderType.MORNING_OF
      );

      expect(message).toContain("Good morning John");
      expect(message).toContain("today");
      expect(message).toContain("ASAP");
    });

    it("should generate hour before message", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        ReminderType.HOUR_BEFORE
      );

      expect(message).toContain("John");
      expect(message).toContain("starts in about an hour");
      expect(message).toContain("Hope you're ready");
    });

    it("should generate follow up message", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        ReminderType.FOLLOW_UP
      );

      expect(message).toContain("John");
      expect(message).toContain("Just checking");
      expect(message).toContain("on your way");
    });

    it("should handle default case", () => {
      const message = messageGenerator.generateReminderMessage(
        mockAssignment,
        "UNKNOWN" as ReminderType
      );

      expect(message).toContain("John");
      expect(message).toContain("Reminder about your");
    });
  });

  describe("generateConfirmationResponse", () => {
    it("should generate single assignment confirmation", () => {
      const message = messageGenerator.generateConfirmationResponse("John", 1);

      expect(message).toContain("Thanks John");
      expect(message).toContain("Your assignment is confirmed");
      expect(message).toContain("We'll see you there");
    });

    it("should generate multiple assignments confirmation", () => {
      const message = messageGenerator.generateConfirmationResponse("John", 3);

      expect(message).toContain("Thanks John");
      expect(message).toContain("Your 3 assignments are confirmed");
      expect(message).toContain("We'll see you there");
    });
  });

  describe("generateNoAssignmentsMessage", () => {
    it("should generate no assignments message", () => {
      const message = messageGenerator.generateNoAssignmentsMessage("John");

      expect(message).toContain("Hi John");
      expect(message).toContain("don't have any upcoming assignments");
      expect(message).toContain("please call us");
    });
  });

  describe("generateHelpMessage", () => {
    it("should generate help message without phone number", () => {
      const message = messageGenerator.generateHelpMessage("John");

      expect(message).toContain("Hi John");
      expect(message).toContain('Reply "C" or "Confirm"');
      expect(message).toContain('Reply "HELP"');
      expect(message).toContain('Reply "STOP"');
      expect(message).not.toContain("Questions? Call us");
    });

    it("should generate help message with phone number", () => {
      const message = messageGenerator.generateHelpMessage(
        "John",
        "+1234567890"
      );

      expect(message).toContain("Hi John");
      expect(message).toContain("Questions? Call us at +1234567890");
    });
  });

  describe("generateOptOutMessage", () => {
    it("should generate opt-out message", () => {
      const message = messageGenerator.generateOptOutMessage("John");

      expect(message).toContain("John, you have been unsubscribed");
      expect(message).toContain("text reminders");
      expect(message).toContain("still receive calls");
      expect(message).toContain("re-subscribe");
    });
  });

  describe("generateUnknownMessageResponse", () => {
    it("should generate unknown message response", () => {
      const message = messageGenerator.generateUnknownMessageResponse("John");

      expect(message).toContain("Hi John");
      expect(message).toContain("didn't understand");
      expect(message).toContain('Reply "C" to confirm');
      expect(message).toContain("call us directly");
    });
  });
});
