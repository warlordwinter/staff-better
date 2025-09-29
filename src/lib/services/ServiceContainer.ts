// Service container for dependency injection and service management

import { MessageRouter } from "./MessageRouter";
import { ReminderOrchestrator } from "./ReminderOrchestrator";
import { SchedulerService } from "./schedulerService";

// Shared services
import { SMSService } from "./shared/SMSService";
import { MessageParserService } from "./shared/MessageParserService";
import { AssignmentService } from "./shared/AssignmentService";
import { MessageGeneratorService } from "./shared/MessageGeneratorService";
import { DateTimeService } from "./shared/DateTimeService";

export class ServiceContainer {
  private static instance: ServiceContainer;

  // Shared services (singletons)
  private smsService: SMSService;
  private messageParser: MessageParserService;
  private assignmentService: AssignmentService;
  private messageGenerator: MessageGeneratorService;
  private dateTimeService: DateTimeService;

  // Main services
  private messageRouter: MessageRouter;
  private reminderOrchestrator: ReminderOrchestrator;
  private schedulerService: SchedulerService | null = null;

  private constructor() {
    // Initialize shared services
    this.smsService = new SMSService();
    this.messageParser = new MessageParserService();
    this.assignmentService = new AssignmentService();
    this.messageGenerator = new MessageGeneratorService();
    this.dateTimeService = new DateTimeService();

    // Initialize main services
    this.messageRouter = new MessageRouter();
    this.reminderOrchestrator = new ReminderOrchestrator();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Get the message router for processing incoming messages
   */
  getMessageRouter(): MessageRouter {
    return this.messageRouter;
  }

  /**
   * Get the reminder orchestrator for processing scheduled reminders
   */
  getReminderOrchestrator(): ReminderOrchestrator {
    return this.reminderOrchestrator;
  }

  /**
   * Get the scheduler service (creates if not exists)
   */
  getSchedulerService(): SchedulerService {
    if (!this.schedulerService) {
      this.schedulerService = new SchedulerService(this.reminderOrchestrator);
    }
    return this.schedulerService;
  }

  /**
   * Get shared services (for testing or advanced usage)
   */
  getSMSService(): SMSService {
    return this.smsService;
  }

  getMessageParser(): MessageParserService {
    return this.messageParser;
  }

  getAssignmentService(): AssignmentService {
    return this.assignmentService;
  }

  getMessageGenerator(): MessageGeneratorService {
    return this.messageGenerator;
  }

  getDateTimeService(): DateTimeService {
    return this.dateTimeService;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    messageRouter: boolean;
    reminderOrchestrator: boolean;
    schedulerService: boolean;
    sharedServices: {
      smsService: boolean;
      messageParser: boolean;
      assignmentService: boolean;
      messageGenerator: boolean;
      dateTimeService: boolean;
    };
  } {
    return {
      messageRouter: !!this.messageRouter,
      reminderOrchestrator: !!this.reminderOrchestrator,
      schedulerService: !!this.schedulerService,
      sharedServices: {
        smsService: !!this.smsService,
        messageParser: !!this.messageParser,
        assignmentService: !!this.assignmentService,
        messageGenerator: !!this.messageGenerator,
        dateTimeService: !!this.dateTimeService,
      },
    };
  }
}

// Convenience functions for easy access
export function getMessageRouter(): MessageRouter {
  return ServiceContainer.getInstance().getMessageRouter();
}

export function getReminderOrchestrator(): ReminderOrchestrator {
  return ServiceContainer.getInstance().getReminderOrchestrator();
}

export function getSchedulerService(): SchedulerService {
  return ServiceContainer.getInstance().getSchedulerService();
}
