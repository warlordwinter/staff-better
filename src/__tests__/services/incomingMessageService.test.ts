import {
  IncomingMessageService,
  MessageAction,
} from "@/lib/services/IncomingMessageService";
import {
  IAssignmentRepository,
  IAssociateRepository,
  ILogger,
  IMessageService,
} from "@/lib/services/interfaces";
import { SMSMessage, SMSResult } from "@/lib/twilio/types";

const mockAssociateRepository: jest.Mocked<IAssociateRepository> = {
  getAssociateByPhone: jest.fn(),
  optOutAssociate: jest.fn(),
};

const mockAssignmentRepository: jest.Mocked<IAssignmentRepository> = {
  getActiveAssignments: jest.fn(),
  updateAssignmentStatus: jest.fn(),
};

const mockMessageService: jest.Mocked<IMessageService> = {
  sendSMS: jest.fn<Promise<SMSResult>, [SMSMessage]>(),
  formatPhoneNumber: jest.fn<string, [string]>(),
};

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

let service: IncomingMessageService;
beforeAll(async () => {
  jest.clearAllMocks();

  service = new IncomingMessageService(
    mockAssociateRepository,
    mockAssignmentRepository,
    mockMessageService,
    mockLogger
  );
});

beforeEach(() => {
  jest.resetAllMocks();
});

it("Processing an incoming message should return a success result", async () => {
  mockAssociateRepository.getAssociateByPhone.mockResolvedValue({
    id: "1",
    first_name: "Wile E.",
  } as any);

  mockAssignmentRepository.getActiveAssignments.mockResolvedValue([
    {
      job_id: "job-1",
      associate_id: "1",
      work_date: new Date(),
      start_time: "09:00",
    },
  ] as any);

  mockAssignmentRepository.updateAssignmentStatus.mockResolvedValue(void 0);
  mockMessageService.sendSMS.mockResolvedValue({ success: true } as any);

  const result = await service.processIncomingMessage("1234567890", "C");
  expect(result.success).toBe(true);
  expect(mockAssignmentRepository.getActiveAssignments).toHaveBeenCalledWith(
    "1"
  );
  expect(mockAssignmentRepository.updateAssignmentStatus).toHaveBeenCalled();
  expect(mockMessageService.sendSMS).toHaveBeenCalled();
});

it("Processing an incoming message should return a failure result", async () => {
  mockAssociateRepository.getAssociateByPhone.mockResolvedValue(null);

  const result = await service.processIncomingMessage("1234567890", "Hello");
  expect(result.success).toBe(false);
});
