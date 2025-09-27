import { getAssociateByPhone, optOutAssociate } from "@/lib/dao/AssociatesDao";
import {
  getActiveAssignmentsFromDatabase,
  updateJobAssignment,
} from "@/lib/dao/JobsAssignmentsDao";
import { IncomingMessageService } from "@/lib/services/incomingMessageService";
import { MessageAction } from "@/lib/services/incomingMessageService";
import { sendSMS } from "@/lib/twilio/sms";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

// Mock the dependencies
jest.mock("@/lib/dao/AssociatesDao");
jest.mock("@/lib/dao/JobsAssignmentsDao");
jest.mock("@/lib/twilio/sms");

const mockGetAssociateByPhone = getAssociateByPhone as jest.MockedFunction<
  typeof getAssociateByPhone
>;
const mockOptOutAssociate = optOutAssociate as jest.MockedFunction<
  typeof optOutAssociate
>;
const mockGetActiveAssignmentsFromDatabase =
  getActiveAssignmentsFromDatabase as jest.MockedFunction<
    typeof getActiveAssignmentsFromDatabase
  >;
const mockUpdateJobAssignment = updateJobAssignment as jest.MockedFunction<
  typeof updateJobAssignment
>;
const mockSendSMS = sendSMS as jest.MockedFunction<typeof sendSMS>;

describe("IncomingMessageService", () => {
  let service: IncomingMessageService;

  beforeEach(() => {
    service = new IncomingMessageService();
    jest.clearAllMocks();
  });

  const mockAssociate = {
    id: "associate-123",
    first_name: "John",
    last_name: "Doe",
    phone_number: "+1234567890",
    email: "john@example.com",
    email_address: "john@example.com",
    is_opted_out: false,
    work_date: "2024-01-15",
    start_time: "09:00",
  };

  const mockActiveAssignment = {
    job_id: "job-123",
    associate_id: "associate-123",
    work_date: new Date("2024-01-15"),
    start_time: "09:00",
    confirmation_status: ConfirmationStatus.PENDING,
  };

  it("should process confirmation message successfully", async () => {
    // Arrange
    mockGetAssociateByPhone.mockResolvedValue(mockAssociate);
    mockGetActiveAssignmentsFromDatabase.mockResolvedValue([
      mockActiveAssignment,
    ]);
    mockUpdateJobAssignment.mockResolvedValue([]);
    mockSendSMS.mockResolvedValue({
      success: true,
      status: "delivered",
      to: "+1234567890",
      from: "+1234567890",
      messageId: "sms-123",
      sentAt: new Date(),
    });

    // Act
    const result = await service.processIncomingMessage("+1234567890", "C");

    // Assert
    expect(result.success).toBe(true);
    expect(result.action).toBe(MessageAction.CONFIRMATION);
    expect(result.associate_id).toBe("associate-123");
    expect(mockUpdateJobAssignment).toHaveBeenCalledWith(
      "job-123",
      "associate-123",
      {
        last_activity_time: expect.any(String),
      }
    );
    expect(mockSendSMS).toHaveBeenCalled();
  });

  it("should process help request successfully", async () => {
    // Arrange
    mockGetAssociateByPhone.mockResolvedValue(mockAssociate);
    mockGetActiveAssignmentsFromDatabase.mockResolvedValue([]);
    mockSendSMS.mockResolvedValue({
      success: true,
      status: "delivered",
      to: "+1234567890",
      from: "+1234567890",
      messageId: "sms-123",
      sentAt: new Date(),
    });

    // Act
    const result = await service.processIncomingMessage("+1234567890", "help");

    // Assert
    expect(result.success).toBe(true);
    expect(result.action).toBe(MessageAction.HELP_REQUEST);
    expect(mockSendSMS).toHaveBeenCalledWith({
      to: "+11234567890",
      body: expect.stringContaining("text system"),
    });
  });

  it("should handle associate not found", async () => {
    // Arrange
    mockGetAssociateByPhone.mockResolvedValue(null);

    // Act
    const result = await service.processIncomingMessage("+1234567890", "C");

    // Assert
    expect(result.success).toBe(false);
    expect(result.action).toBe(MessageAction.UNKNOWN);
    expect(result.error).toBe("Associate not found");
  });
});
