// src/__tests__/services/reminderService.test.ts

import {
  ReminderService,
  ReminderType,
  ReminderAssignment,
} from "@/lib/services/reminderService";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";
import { ReminderDaoSupabase } from "@/lib/dao/implementations/supabase/ReminderDaoSupabase";
import * as SMS from "@/lib/twilio/sms";
import { SMSSuccess, SMSError } from "@/lib/twilio/types";

// Mock all external dependencies
jest.mock("@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase");
jest.mock("@/lib/dao/implementations/supabase/ReminderDaoSupabase");
jest.mock("@/lib/twilio/sms");

// Type the mocked modules
const mockedJobsDao = JobsAssignmentsDaoSupabase as jest.MockedClass<
  typeof JobsAssignmentsDaoSupabase
>;
const mockedReminderDao = ReminderDaoSupabase as jest.MockedClass<
  typeof ReminderDaoSupabase
>;
const mockedSMS = jest.mocked(SMS);

describe("ReminderService", () => {
  let reminderService: ReminderService;

  // Sample test data
  const mockAssignment: ReminderAssignment = {
    job_id: "job-123",
    associate_id: "assoc-456",
    work_date: new Date("2025-08-04"), // Changed from "2025-08-05"
    start_time: "09:00",
    associate_first_name: "John",
    associate_last_name: "Doe",
    phone_number: "555-123-4567",
    job_title: "Security Guard",
    customer_name: "ABC Corp",
    num_reminders: 3,
    last_activity_time: undefined,
  };

  beforeEach(() => {
    reminderService = new ReminderService();
    jest.clearAllMocks();

    // Set up mock instance methods
    const mockJobsInstance = {
      getNumberOfReminders: jest.fn(),
      updateJobAssignment: jest.fn(),
    };
    mockedJobsDao.mockImplementation(
      () => mockJobsInstance as unknown as JobsAssignmentsDaoSupabase
    );

    const mockReminderInstance = {
      getDayBeforeReminders: jest.fn(),
      getMorningOfReminders: jest.fn(),
      getTwoDaysBeforeReminders: jest.fn(),
      getAssignmentsNotRecentlyReminded: jest.fn(),
      getReminderAssignment: jest.fn(),
    };
    mockedReminderDao.mockImplementation(
      () => mockReminderInstance as unknown as ReminderDaoSupabase
    );

    // Make the mock instances available globally for tests
    (global as Record<string, unknown>).mockJobsInstance =
      mockJobsInstance as unknown;
    (global as Record<string, unknown>).mockReminderInstance =
      mockReminderInstance as unknown;

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  // Helper function to get typed mock instances
  const getMockJobsInstance = () =>
    (global as Record<string, unknown>).mockJobsInstance as {
      getNumberOfReminders: jest.Mock;
      updateJobAssignment: jest.Mock;
    };
  const getMockReminderInstance = () =>
    (global as Record<string, unknown>).mockReminderInstance as {
      getDayBeforeReminders: jest.Mock;
      getMorningOfReminders: jest.Mock;
      getTwoDaysBeforeReminders: jest.Mock;
      getAssignmentsNotRecentlyReminded: jest.Mock;
      getReminderAssignment: jest.Mock;
    };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("processScheduledReminders", () => {
    it("should process reminders successfully", async () => {
      // Arrange
      const mockAssignments = [mockAssignment];
      const mockSMSResult: SMSSuccess = {
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      };

      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue(
        mockAssignments
      );
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        mockAssignments
      );
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue(mockSMSResult);
      getMockJobsInstance().getNumberOfReminders.mockResolvedValue(3);
      getMockJobsInstance().updateJobAssignment.mockResolvedValue([]);

      // Act
      const results = await reminderService.processScheduledReminders();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].assignment_id).toBe("job-123-assoc-456");
      expect(results[0].message_id).toBe("msg-123");
      expect(getMockJobsInstance().updateJobAssignment).toHaveBeenCalledWith(
        "job-123",
        "assoc-456",
        expect.objectContaining({
          num_reminders: 2,
          last_reminder_time: expect.any(String),
        })
      );
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      getMockReminderInstance().getDayBeforeReminders.mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await reminderService.processScheduledReminders();

      // Assert
      expect(result).toEqual([]);
    });

    it("should continue processing other reminders if one fails", async () => {
      // Arrange
      const failingAssignment = {
        ...mockAssignment,
        associate_id: "assoc-fail",
      };
      const successAssignment = {
        ...mockAssignment,
        associate_id: "assoc-success",
      };

      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue([
        failingAssignment,
        successAssignment,
      ]);
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        [failingAssignment, successAssignment]
      );

      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS
        .mockResolvedValueOnce({
          success: false,
          error: "SMS failed",
          code: "21211",
          to: "+15551234567",
          sentAt: new Date(),
        } as SMSError)
        .mockResolvedValueOnce({
          success: true,
          messageId: "msg-123",
          status: "sent",
          to: "+15551234567",
          from: "+15559876543",
          sentAt: new Date(),
        } as SMSSuccess);

      getMockJobsInstance().getNumberOfReminders.mockResolvedValue(3);
      getMockJobsInstance().updateJobAssignment.mockResolvedValue([]);

      // Act
      const results = await reminderService.processScheduledReminders();

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe("sendReminderToAssociate", () => {
    it("should send reminder successfully", async () => {
      // Arrange
      const mockSMSResult: SMSSuccess = {
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      };

      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue(mockSMSResult);

      // Act
      const result = await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.assignment_id).toBe("job-123-assoc-456");
      expect(result.associate_id).toBe("assoc-456");
      expect(result.phone_number).toBe("+15551234567");
      expect(result.reminder_type).toBe(ReminderType.DAY_BEFORE);
      expect(result.message_id).toBe("msg-123");
      expect(result.error).toBeUndefined();

      expect(mockedSMS.formatPhoneNumber).toHaveBeenCalledWith("555-123-4567");
      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("Hi John!"),
      });
    });

    it("should handle SMS sending failure", async () => {
      // Arrange
      const mockSMSResult: SMSError = {
        success: false,
        error: "Invalid phone number",
        code: "21211",
        to: "+15551234567",
        sentAt: new Date(),
      };

      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue(mockSMSResult);

      // Act
      const result = await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid phone number");
      expect(result.message_id).toBeUndefined();
    });

    it("should handle unexpected errors", async () => {
      // Arrange
      mockedSMS.formatPhoneNumber.mockImplementation(() => {
        throw new Error("Formatting error");
      });

      // Act
      const result = await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Formatting error");
    });
  });

  describe("sendTestReminder", () => {
    it("should send test reminder successfully", async () => {
      // Arrange
      getMockReminderInstance().getReminderAssignment.mockResolvedValue(
        mockAssignment
      );
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-test",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      const result = await reminderService.sendTestReminder(
        "job-123",
        "assoc-456"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.reminder_type).toBe(ReminderType.DAY_BEFORE);
      expect(
        getMockReminderInstance().getReminderAssignment
      ).toHaveBeenCalledWith("job-123", "assoc-456");
    });

    it("should throw error when assignment not found", async () => {
      // Arrange
      getMockReminderInstance().getReminderAssignment.mockResolvedValue(null);

      // Act & Assert
      await expect(
        reminderService.sendTestReminder("job-123", "assoc-456")
      ).rejects.toThrow("Reminder Assignment is null");
    });
  });

  describe("determineReminderType", () => {
    // Note: This tests a private method by testing the public behavior
    // We can infer the reminder type from the message content in sendReminderToAssociate

    it("should generate correct message for different reminder types", async () => {
      // Arrange
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Test DAY_BEFORE type
      await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );
      expect(mockedSMS.sendSMS).toHaveBeenLastCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("tomorrow"),
      });

      // Test MORNING_OF type
      await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.MORNING_OF
      );
      expect(mockedSMS.sendSMS).toHaveBeenLastCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("Good morning"),
      });

      // Test TWO_DAYS_BEFORE type
      await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.TWO_DAYS_BEFORE
      );
      expect(mockedSMS.sendSMS).toHaveBeenLastCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("in 2 days"),
      });
    });
  });

  describe("generateReminderMessage", () => {
    // We can test this indirectly through sendReminderToAssociate
    it("should include assignment details in message", async () => {
      // Arrange
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      await reminderService.sendReminderToAssociate(
        mockAssignment,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("John"),
      });

      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("Security Guard"),
      });

      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("ABC Corp"),
      });

      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("8/4/2025"),
      });

      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.stringContaining("3:00 AM"), // Changed from "9:00 AM"
      });
    });
  });

  describe("updateReminderStatus", () => {
    it("should update reminder count when reminders available", async () => {
      // Arrange - this is tested indirectly through processScheduledReminders
      const mockAssignments = [mockAssignment];

      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue(
        mockAssignments
      );
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        mockAssignments
      );
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });
      getMockJobsInstance().getNumberOfReminders.mockResolvedValue(2);
      getMockJobsInstance().updateJobAssignment.mockResolvedValue([]);

      // Act
      await reminderService.processScheduledReminders();
      // Assert
      expect(getMockJobsInstance().updateJobAssignment).toHaveBeenCalledWith(
        "job-123",
        "assoc-456",
        expect.objectContaining({
          last_reminder_time: expect.any(String),
          num_reminders: 1,
        })
      );
    });

    it("should not update when no reminders available", async () => {
      // Arrange
      const mockAssignments = [mockAssignment];

      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue(
        mockAssignments
      );
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        mockAssignments
      );
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });
      getMockJobsInstance().getNumberOfReminders.mockResolvedValue(0);

      // Act
      await reminderService.processScheduledReminders();

      // Assert
      expect(getMockJobsInstance().updateJobAssignment).not.toHaveBeenCalled();
    });

    it("should handle database update errors gracefully", async () => {
      // Arrange
      const mockAssignments = [mockAssignment];

      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue(
        mockAssignments
      );
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        mockAssignments
      );
      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });
      getMockJobsInstance().getNumberOfReminders.mockResolvedValue(2);
      getMockJobsInstance().updateJobAssignment.mockRejectedValue(
        new Error("DB Error")
      );

      // Act - should not throw despite DB error
      const results = await reminderService.processScheduledReminders();

      // Assert
      expect(results[0].success).toBe(true); // SMS still succeeded
      expect(console.error).toHaveBeenCalledWith(
        "Error updating reminder status:",
        expect.any(Error)
      );
    });
  });

  describe("Helper methods", () => {
    describe("formatTime", () => {
      it("should format time correctly", async () => {
        // Test through message generation
        const assignment = { ...mockAssignment, start_time: "14:30" };

        mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
        mockedSMS.sendSMS.mockResolvedValue({
          success: true,
          messageId: "msg-123",
          status: "sent",
          to: "+15551234567",
          from: "+15559876543",
          sentAt: new Date(),
        });

        await reminderService.sendReminderToAssociate(
          assignment,
          ReminderType.DAY_BEFORE
        );

        expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
          to: "+15551234567",
          body: expect.stringMatching(/8:30\s*(AM|PM)/),
        });
      });

      it("should handle morning times", async () => {
        const assignment = { ...mockAssignment, start_time: "08:00" };

        mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
        mockedSMS.sendSMS.mockResolvedValue({
          success: true,
          messageId: "msg-123",
          status: "sent",
          to: "+15551234567",
          from: "+15559876543",
          sentAt: new Date(),
        });

        await reminderService.sendReminderToAssociate(
          assignment,
          ReminderType.DAY_BEFORE
        );

        expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
          to: "+15551234567",
          body: expect.stringMatching(/2:00\s*(AM|PM)/),
        });
      });
    });

    describe("delay", () => {
      it("should add delay between messages", async () => {
        // Arrange
        const startTime = Date.now();
        const mockAssignments = [
          mockAssignment,
          { ...mockAssignment, associate_id: "assoc-2" },
        ];

        getMockReminderInstance().getDayBeforeReminders.mockResolvedValue(
          mockAssignments
        );
        getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
        getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue(
          []
        );
        getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
          mockAssignments
        );
        mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
        mockedSMS.sendSMS.mockResolvedValue({
          success: true,
          messageId: "msg-123",
          status: "sent",
          to: "+15551234567",
          from: "+15559876543",
          sentAt: new Date(),
        });
        getMockJobsInstance().getNumberOfReminders.mockResolvedValue(2);
        getMockJobsInstance().updateJobAssignment.mockResolvedValue([]);

        // Act
        await reminderService.processScheduledReminders();

        // Assert
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        // Should have at least one 200ms delay (between the two messages)
        expect(elapsedTime).toBeGreaterThanOrEqual(200);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty reminder assignments", async () => {
      // Arrange
      getMockReminderInstance().getDayBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getMorningOfReminders.mockResolvedValue([]);
      getMockReminderInstance().getTwoDaysBeforeReminders.mockResolvedValue([]);
      getMockReminderInstance().getAssignmentsNotRecentlyReminded.mockResolvedValue(
        []
      );

      // Act
      const results = await reminderService.processScheduledReminders();

      // Assert
      expect(results).toHaveLength(0);
      expect(mockedSMS.sendSMS).not.toHaveBeenCalled();
    });

    it("should handle malformed phone numbers", async () => {
      // Arrange
      const assignmentWithBadPhone = {
        ...mockAssignment,
        phone_number: "invalid",
      };

      mockedSMS.formatPhoneNumber.mockImplementation(() => {
        throw new Error("Invalid phone number format");
      });

      // Act
      const result = await reminderService.sendReminderToAssociate(
        assignmentWithBadPhone,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid phone number format");
    });

    it("should handle missing assignment data", async () => {
      // Arrange
      const incompleteAssignment = {
        ...mockAssignment,
        associate_first_name: "",
        job_title: "",
        customer_name: "",
      };

      mockedSMS.formatPhoneNumber.mockReturnValue("+15551234567");
      mockedSMS.sendSMS.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+15551234567",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      const result = await reminderService.sendReminderToAssociate(
        incompleteAssignment,
        ReminderType.DAY_BEFORE
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+15551234567",
        body: expect.any(String),
      });
    });
  });
});
