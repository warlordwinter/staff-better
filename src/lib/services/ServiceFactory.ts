// Factory for creating properly configured services

import { ReminderService } from "./reminderService";
import { SchedulerService } from "./schedulerService";
import {
  IReminderRepository,
  IMessageService,
  ILogger,
} from "./interfaces/index";
import { ScheduleConfig } from "./types";

export class ServiceFactory {
  static createReminderService(
    reminderRepository: IReminderRepository,
    messageService: IMessageService,
    logger: ILogger
  ): ReminderService {
    return new ReminderService(reminderRepository, messageService, logger);
  }

  // Removed createIncomingMessageService - now using Twilio Studio

  static createSchedulerService(
    reminderService: ReminderService,
    config: ScheduleConfig
  ): SchedulerService {
    return new SchedulerService(reminderService, config);
  }
}
