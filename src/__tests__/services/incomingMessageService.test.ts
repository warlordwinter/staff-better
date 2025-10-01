import { IncomingMessageService } from "@/lib/services/IncomingMessageService";
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
  service = new IncomingMessageService(
    mockAssociateRepository,
    mockAssignmentRepository,
    mockMessageService,
    mockLogger
  );
});

it("Processing an incoming message should return a success result", async () => {
  const result = await service.processIncomingMessage("1234567890", "Hello");
  expect(result.success).toBe(true);
});

it("Processing an incoming message should return a failure result", async () => {
  const result = await service.processIncomingMessage("1234567890", "Hello");
  expect(result.success).toBe(false);
});
