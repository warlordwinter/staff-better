// Service container for dependency injection

import { ServiceFactory } from "./ServiceFactory";
import {
  ConsoleLogger,
  TwilioMessageService,
  ReminderRepositorySupabase,
  AssociateRepositorySupabase,
  AssignmentRepositorySupabase,
} from "./implementations/index";
import { ReminderService } from "./reminderService";
import { SchedulerService } from "./schedulerService";
import { StudioService } from "./studioService";
import { StudioReminderService } from "./studioReminderService";
import { ScheduleConfig, StudioFlowConfig } from "./types";

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  private initializeServices(): void {
    // Create core dependencies
    const logger = new ConsoleLogger();
    const messageService = new TwilioMessageService();
    const reminderRepository = new ReminderRepositorySupabase();
    const associateRepository = new AssociateRepositorySupabase();
    const assignmentRepository = new AssignmentRepositorySupabase();

    // Create services
    const reminderService = ServiceFactory.createReminderService(
      reminderRepository,
      messageService,
      logger
    );

    // Create Studio service for confirmation calls
    const studioConfig: StudioFlowConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      flowSid: process.env.TWILIO_STUDIO_FLOW_SID || "",
      fromNumber: process.env.TWILIO_PHONE_NUMBER || "",
    };

    const studioService = new StudioService(studioConfig, logger);
    const studioReminderService = new StudioReminderService(
      studioService,
      logger
    );

    const schedulerService = ServiceFactory.createSchedulerService(
      reminderService,
      {
        enabled: true,
        intervalMinutes: 15,
        maxRetries: 3,
        retryDelayMinutes: 5,
      }
    );

    // Store services
    this.services.set("logger", logger);
    this.services.set("messageService", messageService);
    this.services.set("reminderRepository", reminderRepository);
    this.services.set("associateRepository", associateRepository);
    this.services.set("assignmentRepository", assignmentRepository);
    this.services.set("reminderService", reminderService);
    this.services.set("studioService", studioService);
    this.services.set("studioReminderService", studioReminderService);
    this.services.set("schedulerService", schedulerService);
  }

  getReminderService(): ReminderService {
    return this.services.get("reminderService");
  }

  getAssignmentRepository() {
    return this.services.get("assignmentRepository");
  }

  getStudioService(): StudioService {
    return this.services.get("studioService");
  }

  getStudioReminderService(): StudioReminderService {
    return this.services.get("studioReminderService");
  }

  getSchedulerService(): SchedulerService {
    return this.services.get("schedulerService");
  }

  getLogger() {
    return this.services.get("logger");
  }

  // Method to update scheduler configuration
  updateSchedulerConfig(config: Partial<ScheduleConfig>): void {
    const schedulerService = this.getSchedulerService();
    schedulerService.updateConfig(config);
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();
