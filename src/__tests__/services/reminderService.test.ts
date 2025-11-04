// import {
//   ILogger,
//   IMessageService,
//   IReminderRepository,
// } from "@/lib/services/interfaces";
// import {
//   ReminderAssignment,
//   ReminderService,
//   ReminderType,
// } from "@/lib/services/reminderService";

// let service: ReminderService;
// const mockReminderRepository: jest.Mocked<IReminderRepository> = {
//   getDueReminders: jest.fn(),
//   getReminderAssignment: jest.fn(),
//   updateReminderStatus: jest.fn(),
//   getNumberOfReminders: jest.fn(),
//   getDayBeforeReminders: jest.fn(),
//   getMorningOfReminders: jest.fn(),
//   getTwoDaysBeforeReminders: jest.fn(),
//   getAssignmentsNotRecentlyReminded: jest.fn(),
// };
// const mockMessageService: jest.Mocked<IMessageService> = {
//   sendSMS: jest.fn(),
//   formatPhoneNumber: jest.fn(),
// };
// const mockLogger: jest.Mocked<ILogger> = {
//   info: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
//   debug: jest.fn(),
// };

// beforeEach(() => {
//   jest.resetAllMocks();
//   service = new ReminderService(
//     mockReminderRepository,
//     mockMessageService,
//     mockLogger
//   );
// });

// it("Processes Scheduled Reminders", async () => {
//   // Mock reminder data
//   const mockReminders = [
//     {
//       job_id: "job-1",
//       associate_id: "assoc-1",
//       phone_number: "+11234567890",
//       associate_first_name: "Test",
//       associate_last_name: "User",
//       title: "Electrician",
//       client_company: "Acme Co",
//       work_date: new Date(),
//       start_time: "09:00",
//       num_reminders: 0,
//       last_activity_time: new Date().toISOString(),
//     },
//   ];
//   mockReminderRepository.getDueReminders.mockResolvedValue(
//     mockReminders as ReminderAssignment[]
//   );
//   mockMessageService.sendSMS.mockResolvedValue({
//     success: true,
//     messageId: "msg-123",
//     status: "sent",
//     to: "+11234567890",
//     from: "+15551234567",
//     sentAt: new Date(),
//   });
//   mockMessageService.formatPhoneNumber.mockReturnValue("+11234567890");
//   mockReminderRepository.getNumberOfReminders.mockResolvedValue(1);
//   mockReminderRepository.updateReminderStatus.mockResolvedValue();

//   const result = await service.processScheduledReminders();

//   expect(result).toHaveLength(1);
//   expect(result[0].success).toBe(true);
//   expect(result[0].associate_id).toBe("assoc-1");
//   expect(mockReminderRepository.getDueReminders).toHaveBeenCalled();
//   expect(mockMessageService.sendSMS).toHaveBeenCalled();
//   expect(mockReminderRepository.updateReminderStatus).toHaveBeenCalled();
//   expect(mockLogger.info).toHaveBeenCalledTimes(4);
// });

// it("Processes Scheduled Reminders with no reminders", async () => {
//   mockReminderRepository.getDueReminders.mockResolvedValue([]);
//   const result = await service.processScheduledReminders();
//   expect(result).toHaveLength(0);
//   expect(mockReminderRepository.getDueReminders).toHaveBeenCalled();
//   expect(mockMessageService.sendSMS).not.toHaveBeenCalled();
//   expect(mockReminderRepository.updateReminderStatus).not.toHaveBeenCalled();
//   expect(mockLogger.info).toHaveBeenCalledTimes(3);
// });

// it("Sends a reminder to an associate", async () => {
//   mockMessageService.formatPhoneNumber.mockReturnValue("+11234567890");
//   mockMessageService.sendSMS.mockResolvedValue({
//     success: true,
//     messageId: "msg-123",
//     status: "sent",
//     to: "+11234567890",
//     from: "+15551234567",
//     sentAt: new Date(),
//   });

//   const mockAssignment: ReminderAssignment = {
//     job_id: "job-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     work_date: new Date(),
//     start_time: "09:00",
//     associate_first_name: "Test",
//     associate_last_name: "User",
//     title: "Electrician",
//     client_company: "Acme Co",
//     num_reminders: 0,
//   };
//   const result = await service.sendReminderToAssociate(
//     mockAssignment,
//     "day_before" as ReminderType
//   );
//   expect(result).toEqual({
//     success: true,
//     assignment_id: "job-1-assoc-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     reminder_type: "day_before",
//     message_id: "msg-123",
//     error: undefined,
//   });
// });

// it("Handles error when sending reminder to associate", async () => {
//   mockMessageService.formatPhoneNumber.mockReturnValue("+11234567890");
//   mockMessageService.sendSMS.mockResolvedValue({
//     success: false,
//     error: "Failed to send message",
//     code: "30001",
//     to: "+11234567890",
//     sentAt: new Date(),
//   });

//   const mockAssignment: ReminderAssignment = {
//     job_id: "job-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     work_date: new Date(),
//     start_time: "09:00",
//     associate_first_name: "Test",
//     associate_last_name: "User",
//     title: "Electrician",
//     client_company: "Acme Co",
//     num_reminders: 0,
//   };

//   const result = await service.sendReminderToAssociate(
//     mockAssignment,
//     "day_before" as ReminderType
//   );

//   expect(result).toEqual({
//     success: false,
//     assignment_id: "job-1-assoc-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     reminder_type: "day_before",
//     message_id: undefined,
//     error: "Failed to send message",
//   });
// });

// it("Handles exception when sending reminder to associate", async () => {
//   mockMessageService.formatPhoneNumber.mockReturnValue("+11234567890");
//   mockMessageService.sendSMS.mockRejectedValue(new Error("Network error"));

//   const mockAssignment: ReminderAssignment = {
//     job_id: "job-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     work_date: new Date(),
//     start_time: "09:00",
//     associate_first_name: "Test",
//     associate_last_name: "User",
//     title: "Electrician",
//     client_company: "Acme Co",
//     num_reminders: 0,
//   };

//   const result = await service.sendReminderToAssociate(
//     mockAssignment,
//     "day_before" as ReminderType
//   );

//   expect(result).toEqual({
//     success: false,
//     assignment_id: "job-1-assoc-1",
//     associate_id: "assoc-1",
//     phone_number: "+11234567890",
//     reminder_type: "day_before",
//     error: "Network error",
//   });
//   expect(mockLogger.error).toHaveBeenCalledWith(
//     "Error sending reminder to associate assoc-1",
//     expect.any(Error)
//   );
// });

// it("Handles error when processing scheduled reminders", async () => {
//   const error = new Error("Database error");
//   mockReminderRepository.getDueReminders.mockRejectedValue(error);

//   await expect(service.processScheduledReminders()).rejects.toThrow(
//     "Database error"
//   );

//   expect(mockLogger.error).toHaveBeenCalledWith(
//     "Error processing scheduled reminders",
//     error
//   );
//   expect(mockMessageService.sendSMS).not.toHaveBeenCalled();
//   expect(mockReminderRepository.updateReminderStatus).not.toHaveBeenCalled();
// });
