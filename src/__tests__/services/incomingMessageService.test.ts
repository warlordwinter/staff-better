import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";
import { IncomingMessageService } from "@/lib/services/IncomingMessageService";
import { MessageAction } from "@/lib/services/IncomingMessageService";
import { sendSMS } from "@/lib/twilio/sms";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

// Mock the dependencies
jest.mock("@/lib/dao/implementations/supabase/AssociatesDaoSupabase");
jest.mock("@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase");
jest.mock("@/lib/twilio/sms");

const mockAssociatesDao = AssociatesDaoSupabase as jest.MockedClass<
  typeof AssociatesDaoSupabase
>;
const mockJobAssignmentsDao = JobsAssignmentsDaoSupabase as jest.MockedClass<
  typeof JobsAssignmentsDaoSupabase
>;
const mockGetAssociateByPhone = jest.fn();
const mockOptOutAssociate = jest.fn();
const mockGetActiveAssignmentsFromDatabase = jest.fn();
const mockUpdateJobAssignment = jest.fn();
const mockSendSMS = sendSMS as jest.MockedFunction<typeof sendSMS>;

describe("IncomingMessageService", () => {
  let service: IncomingMessageService;

  beforeEach(() => {
    service = new IncomingMessageService();
    jest.clearAllMocks();

    // Set up mock instance methods
    const mockAssociatesInstance = {
      getAssociateByPhone: mockGetAssociateByPhone,
      optOutAssociate: mockOptOutAssociate,
    };
    const mockJobAssignmentsInstance = {
      getActiveAssignmentsFromDatabase: mockGetActiveAssignmentsFromDatabase,
      updateJobAssignment: mockUpdateJobAssignment,
    };
    mockAssociatesDao.mockImplementation(
      () => mockAssociatesInstance as unknown as AssociatesDaoSupabase
    );
    mockJobAssignmentsDao.mockImplementation(
      () => mockJobAssignmentsInstance as unknown as JobsAssignmentsDaoSupabase
    );
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
