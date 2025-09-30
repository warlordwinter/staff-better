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
import { IncomingMessageService } from "./IncomingMessageService";
import { SchedulerService } from "./schedulerService";
import { ScheduleConfig } from "./types";

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

    const incomingMessageService = ServiceFactory.createIncomingMessageService(
      associateRepository,
      assignmentRepository,
      messageService,
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
    this.services.set("incomingMessageService", incomingMessageService);
    this.services.set("schedulerService", schedulerService);
  }

  getReminderService(): ReminderService {
    return this.services.get("reminderService");
  }

  getIncomingMessageService(): IncomingMessageService {
    return this.services.get("incomingMessageService");
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
