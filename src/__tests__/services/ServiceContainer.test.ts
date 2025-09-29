// Tests for ServiceContainer

import { ServiceContainer } from "@/lib/services/ServiceContainer";
import { MessageRouter } from "@/lib/services/MessageRouter";
import { ReminderOrchestrator } from "@/lib/services/ReminderOrchestrator";
import { SchedulerService } from "@/lib/services/schedulerService";

// Mock the services
jest.mock("@/lib/services/MessageRouter");
jest.mock("@/lib/services/ReminderOrchestrator");
jest.mock("@/lib/services/schedulerService");

describe("ServiceContainer", () => {
  let serviceContainer: ServiceContainer;

  beforeEach(() => {
    // Clear the singleton instance
    (ServiceContainer as any).instance = undefined;
    serviceContainer = ServiceContainer.getInstance();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = ServiceContainer.getInstance();
      const instance2 = ServiceContainer.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ServiceContainer);
    });
  });

  describe("getMessageRouter", () => {
    it("should return MessageRouter instance", () => {
      const router = serviceContainer.getMessageRouter();

      expect(router).toBeInstanceOf(MessageRouter);
    });

    it("should return same instance on multiple calls", () => {
      const router1 = serviceContainer.getMessageRouter();
      const router2 = serviceContainer.getMessageRouter();

      expect(router1).toBe(router2);
    });
  });

  describe("getReminderOrchestrator", () => {
    it("should return ReminderOrchestrator instance", () => {
      const orchestrator = serviceContainer.getReminderOrchestrator();

      expect(orchestrator).toBeInstanceOf(ReminderOrchestrator);
    });

    it("should return same instance on multiple calls", () => {
      const orchestrator1 = serviceContainer.getReminderOrchestrator();
      const orchestrator2 = serviceContainer.getReminderOrchestrator();

      expect(orchestrator1).toBe(orchestrator2);
    });
  });

  describe("getSchedulerService", () => {
    it("should return SchedulerService instance", () => {
      const scheduler = serviceContainer.getSchedulerService();

      expect(scheduler).toBeInstanceOf(SchedulerService);
    });

    it("should return same instance on multiple calls", () => {
      const scheduler1 = serviceContainer.getSchedulerService();
      const scheduler2 = serviceContainer.getSchedulerService();

      expect(scheduler1).toBe(scheduler2);
    });
  });

  describe("getSharedServices", () => {
    it("should return SMSService instance", () => {
      const smsService = serviceContainer.getSMSService();

      expect(smsService).toBeDefined();
      expect(smsService).toHaveProperty("sendMessage");
      expect(smsService).toHaveProperty("formatPhoneNumber");
      expect(smsService).toHaveProperty("normalizePhoneNumber");
      expect(smsService).toHaveProperty("validatePhoneNumber");
    });

    it("should return MessageParserService instance", () => {
      const messageParser = serviceContainer.getMessageParser();

      expect(messageParser).toBeDefined();
      expect(messageParser).toHaveProperty("parseMessageAction");
      expect(messageParser).toHaveProperty("isConfirmationMessage");
      expect(messageParser).toHaveProperty("normalizeMessage");
      expect(messageParser).toHaveProperty("extractMessageInfo");
    });

    it("should return AssignmentService instance", () => {
      const assignmentService = serviceContainer.getAssignmentService();

      expect(assignmentService).toBeDefined();
      expect(assignmentService).toHaveProperty("getActiveAssignments");
      expect(assignmentService).toHaveProperty("determineConfirmationStatus");
      expect(assignmentService).toHaveProperty("updateAssignmentStatus");
      expect(assignmentService).toHaveProperty("updateMultipleAssignments");
    });

    it("should return MessageGeneratorService instance", () => {
      const messageGenerator = serviceContainer.getMessageGenerator();

      expect(messageGenerator).toBeDefined();
      expect(messageGenerator).toHaveProperty("generateReminderMessage");
      expect(messageGenerator).toHaveProperty("generateConfirmationResponse");
      expect(messageGenerator).toHaveProperty("generateNoAssignmentsMessage");
      expect(messageGenerator).toHaveProperty("generateHelpMessage");
      expect(messageGenerator).toHaveProperty("generateOptOutMessage");
      expect(messageGenerator).toHaveProperty("generateUnknownMessageResponse");
    });

    it("should return DateTimeService instance", () => {
      const dateTimeService = serviceContainer.getDateTimeService();

      expect(dateTimeService).toBeDefined();
      expect(dateTimeService).toHaveProperty("combineDateTime");
      expect(dateTimeService).toHaveProperty("formatTime");
      expect(dateTimeService).toHaveProperty("getHoursDifference");
      expect(dateTimeService).toHaveProperty("getCurrentDateString");
      expect(dateTimeService).toHaveProperty("getDateStringFromNow");
      expect(dateTimeService).toHaveProperty("isToday");
      expect(dateTimeService).toHaveProperty("isTomorrow");
      expect(dateTimeService).toHaveProperty("getTimezoneOffset");
      expect(dateTimeService).toHaveProperty("delay");
    });
  });

  describe("getHealthStatus", () => {
    it("should return health status for all services", () => {
      const health = serviceContainer.getHealthStatus();

      expect(health).toHaveProperty("messageRouter");
      expect(health).toHaveProperty("reminderOrchestrator");
      expect(health).toHaveProperty("schedulerService");
      expect(health).toHaveProperty("sharedServices");

      expect(health.sharedServices).toHaveProperty("smsService");
      expect(health.sharedServices).toHaveProperty("messageParser");
      expect(health.sharedServices).toHaveProperty("assignmentService");
      expect(health.sharedServices).toHaveProperty("messageGenerator");
      expect(health.sharedServices).toHaveProperty("dateTimeService");

      // All services should be healthy
      expect(health.messageRouter).toBe(true);
      expect(health.reminderOrchestrator).toBe(true);
      expect(health.schedulerService).toBe(true);
      expect(health.sharedServices.smsService).toBe(true);
      expect(health.sharedServices.messageParser).toBe(true);
      expect(health.sharedServices.assignmentService).toBe(true);
      expect(health.sharedServices.messageGenerator).toBe(true);
      expect(health.sharedServices.dateTimeService).toBe(true);
    });
  });
});
