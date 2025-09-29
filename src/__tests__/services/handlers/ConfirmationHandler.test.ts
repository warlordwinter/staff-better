// Tests for ConfirmationHandler

import { ConfirmationHandler } from "@/lib/services/handlers/ConfirmationHandler";
import { AssignmentService } from "@/lib/services/shared/AssignmentService";
import { SMSService } from "@/lib/services/shared/SMSService";
import { MessageGeneratorService } from "@/lib/services/shared/MessageGeneratorService";
import { Associate } from "@/model/interfaces/Associate";
import { MessageAction } from "@/lib/services/interfaces/MessageAction";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { ActiveAssignment } from "@/lib/services/interfaces/ActiveAssignment";

// Mock the shared services
jest.mock("@/lib/services/shared/AssignmentService");
jest.mock("@/lib/services/shared/SMSService");
jest.mock("@/lib/services/shared/MessageGeneratorService");

describe("ConfirmationHandler", () => {
  let confirmationHandler: ConfirmationHandler;
  let mockAssignmentService: jest.Mocked<AssignmentService>;
  let mockSMSService: jest.Mocked<SMSService>;
  let mockMessageGenerator: jest.Mocked<MessageGeneratorService>;

  const mockAssociate: Associate = {
    id: "assoc-123",
    first_name: "John",
    last_name: "Doe",
    phone_number: "+1234567890",
    email_address: "john.doe@example.com",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockActiveAssignment: ActiveAssignment = {
    job_id: "job-123",
    associate_id: "assoc-456",
    work_date: new Date("2023-10-01"),
    start_time: "09:00",
    confirmation_status: ConfirmationStatus.UNCONFIRMED,
  };

  beforeEach(() => {
    mockAssignmentService = {
      getActiveAssignments: jest.fn(),
      determineConfirmationStatus: jest.fn(),
      updateMultipleAssignments: jest.fn(),
    } as unknown as jest.Mocked<AssignmentService>;

    mockSMSService = {
      sendMessage: jest.fn(),
    } as unknown as jest.Mocked<SMSService>;

    mockMessageGenerator = {
      generateNoAssignmentsMessage: jest.fn(),
      generateConfirmationResponse: jest.fn(),
    } as unknown as jest.Mocked<MessageGeneratorService>;

    confirmationHandler = new ConfirmationHandler(
      mockAssignmentService,
      mockSMSService,
      mockMessageGenerator
    );

    jest.clearAllMocks();
  });

  describe("handle", () => {
    it("should handle confirmation with active assignments", async () => {
      // Arrange
      const activeAssignments = [mockActiveAssignment];
      const responseMessage = "Thanks John! Your assignment is confirmed.";
      
      mockAssignmentService.getActiveAssignments.mockResolvedValue(activeAssignments);
      mockAssignmentService.determineConfirmationStatus.mockReturnValue(ConfirmationStatus.CONFIRMED);
      mockAssignmentService.updateMultipleAssignments.mockResolvedValue(1);
      mockMessageGenerator.generateConfirmationResponse.mockReturnValue(responseMessage);
      mockSMSService.sendMessage.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+1234567890",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      const result = await confirmationHandler.handle(
        mockAssociate,
        "+1234567890",
        "confirm"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe(MessageAction.CONFIRMATION);
      expect(result.associate_id).toBe("assoc-123");
      expect(result.response_sent).toBe(responseMessage);
      expect(mockAssignmentService.getActiveAssignments).toHaveBeenCalledWith("assoc-123");
      expect(mockAssignmentService.updateMultipleAssignments).toHaveBeenCalledWith(
        activeAssignments,
        ConfirmationStatus.CONFIRMED
      );
      expect(mockSMSService.sendMessage).toHaveBeenCalledWith("+1234567890", responseMessage);
    });

    it("should handle confirmation with no active assignments", async () => {
      // Arrange
      const noAssignmentsMessage = "Hi John! We don't have any upcoming assignments.";
      
      mockAssignmentService.getActiveAssignments.mockResolvedValue([]);
      mockMessageGenerator.generateNoAssignmentsMessage.mockReturnValue(noAssignmentsMessage);
      mockSMSService.sendMessage.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+1234567890",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      const result = await confirmationHandler.handle(
        mockAssociate,
        "+1234567890",
        "confirm"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe(MessageAction.CONFIRMATION);
      expect(result.response_sent).toBe(noAssignmentsMessage);
      expect(mockAssignmentService.updateMultipleAssignments).not.toHaveBeenCalled();
    });

    it("should handle multiple assignments", async () => {
      // Arrange
      const activeAssignments = [mockActiveAssignment, { ...mockActiveAssignment, job_id: "job-456" }];
      const responseMessage = "Thanks John! Your 2 assignments are confirmed.";
      
      mockAssignmentService.getActiveAssignments.mockResolvedValue(activeAssignments);
      mockAssignmentService.determineConfirmationStatus.mockReturnValue(ConfirmationStatus.CONFIRMED);
      mockAssignmentService.updateMultipleAssignments.mockResolvedValue(2);
      mockMessageGenerator.generateConfirmationResponse.mockReturnValue(responseMessage);
      mockSMSService.sendMessage.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+1234567890",
        from: "+15559876543",
        sentAt: new Date(),
      });

      // Act
      const result = await confirmationHandler.handle(
        mockAssociate,
        "+1234567890",
        "confirm"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.response_sent).toBe(responseMessage);
      expect(mockAssignmentService.updateMultipleAssignments).toHaveBeenCalledWith(
        activeAssignments,
        ConfirmationStatus.CONFIRMED
      );
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      const error = new Error("Database error");
      mockAssignmentService.getActiveAssignments.mockRejectedValue(error);

      // Act & Assert
      await expect(
        confirmationHandler.handle(mockAssociate, "+1234567890", "confirm")
      ).rejects.toThrow("Database error");
    });
  });
});
