// import { IncomingMessageService } from "@/lib/services/IncomingMessageService";
// import { MessageAction } from "@/lib/services/types";
// import {
//   IAssignmentRepository,
//   IAssociateRepository,
//   ILogger,
//   IMessageService,
// } from "@/lib/services/interfaces";
// import { SMSMessage, SMSResult } from "@/lib/twilio/types";

// const mockAssociateRepository: jest.Mocked<IAssociateRepository> = {
//   getAssociateByPhone: jest.fn(),
//   optOutAssociate: jest.fn(),
// };

// const mockAssignmentRepository: jest.Mocked<IAssignmentRepository> = {
//   getActiveAssignments: jest.fn(),
//   updateAssignmentStatus: jest.fn(),
// };

// const mockMessageService: jest.Mocked<IMessageService> = {
//   sendSMS: jest.fn<Promise<SMSResult>, [SMSMessage]>(),
//   sendReminderSMS: jest.fn<Promise<SMSResult>, [Omit<SMSMessage, "from">]>(),
//   formatPhoneNumber: jest.fn<string, [string]>(),
// };
// const mockMessageService: jest.Mocked<IMessageService> = {
//   sendSMS: jest.fn<Promise<SMSResult>, [SMSMessage]>(),
//   formatPhoneNumber: jest.fn<string, [string]>(),
// };

// const mockLogger: jest.Mocked<ILogger> = {
//   info: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
//   debug: jest.fn(),
// };

// let service: IncomingMessageService;
// beforeAll(async () => {
//   jest.clearAllMocks();

//   service = new IncomingMessageService(
//     mockAssociateRepository,
//     mockAssignmentRepository,
//     mockMessageService,
//     mockLogger
//   );
// });

// beforeEach(() => {
//   jest.resetAllMocks();
// });

// it("Processing an incoming message should return a success result", async () => {
//   mockAssociateRepository.getAssociateByPhone.mockResolvedValue({
//     id: "1",
//     first_name: "Wile E.",
//     last_name: "Coyote",
//     work_date: "2025-01-01",
//     start_time: "09:00",
//     phone_number: "+11234567890",
//     email_address: "wile@acme.com",
//   } as any);

//   mockAssignmentRepository.getActiveAssignments.mockResolvedValue([
//     {
//       job_id: "job-1",
//       associate_id: "1",
//       confirmation_status: "PENDING",
//       last_activity_time: new Date().toISOString(),
//       work_date: new Date(),
//       start_time: "09:00",
//       num_reminders: 0,
//     },
//   ] as any);

// mockAssignmentRepository.updateAssignmentStatus.mockResolvedValue(void 0);
// mockMessageService.sendReminderSMS.mockResolvedValue({ success: true } as any);
//   mockAssignmentRepository.updateAssignmentStatus.mockResolvedValue(void 0);
//   mockMessageService.sendSMS.mockResolvedValue({ success: true } as any);

//   const result = await service.processIncomingMessage("1234567890", "C");
//   expect(result.success).toBe(true);
//   expect(mockAssignmentRepository.getActiveAssignments).toHaveBeenCalledWith(
//     "1"
//   );
//   expect(mockAssignmentRepository.updateAssignmentStatus).toHaveBeenCalled();
//   expect(mockMessageService.sendReminderSMS).toHaveBeenCalled();
// });
//   const result = await service.processIncomingMessage("1234567890", "C");
//   expect(result.success).toBe(true);
//   expect(mockAssignmentRepository.getActiveAssignments).toHaveBeenCalledWith(
//     "1"
//   );
//   expect(mockAssignmentRepository.updateAssignmentStatus).toHaveBeenCalled();
//   expect(mockMessageService.sendSMS).toHaveBeenCalled();
// });

// it("Processing an incoming message should return a failure result", async () => {
//   mockAssociateRepository.getAssociateByPhone.mockResolvedValue(null);

//   const result = await service.processIncomingMessage("1234567890", "Hello");
//   expect(result.success).toBe(false);
// });

// it("Processing an incoming message for help should return success and HELP action", async () => {
//   mockAssociateRepository.getAssociateByPhone.mockResolvedValue({
//     id: "1",
//     first_name: "Wile E.",
//     last_name: "Coyote",
//     work_date: "2025-01-01",
//     start_time: "09:00",
//     phone_number: "+11234567890",
//     email_address: "wile@acme.com",
//   } as any);

//   mockMessageService.sendReminderSMS.mockResolvedValue({ success: true } as any);
//   mockMessageService.sendSMS.mockResolvedValue({ success: true } as any);

//   const result = await service.processIncomingMessage("1234567890", "help");
//   expect(result.success).toBe(true);
//   expect(result.action).toBe(MessageAction.HELP_REQUEST);
//   expect(mockMessageService.sendReminderSMS).toHaveBeenCalled();
//   expect(
//     mockMessageService.sendReminderSMS.mock.calls[0][0].body
//   ).toContain("801-361-0540");
// });
//   const result = await service.processIncomingMessage("1234567890", "help");
//   expect(result.success).toBe(true);
//   expect(result.action).toBe(MessageAction.HELP_REQUEST);
//   expect(mockMessageService.sendSMS).toHaveBeenCalled();
// });

// // TODO: Add a test for processing an unknown message
