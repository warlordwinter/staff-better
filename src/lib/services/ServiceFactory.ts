// Factory for creating properly configured services

import { ReminderService } from "./reminderService";
import { IncomingMessageService } from "./IncomingMessageService";
import { SchedulerService } from "./schedulerService";
import {
  IReminderRepository,
  IMessageService,
  ILogger,
  IAssociateRepository,
  IAssignmentRepository,
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

  static createIncomingMessageService(
    associateRepository: IAssociateRepository,
    assignmentRepository: IAssignmentRepository,
    messageService: IMessageService,
    logger: ILogger
  ): IncomingMessageService {
    return new IncomingMessageService(
      associateRepository,
      assignmentRepository,
      messageService,
      logger
    );
  }

  static createSchedulerService(
    reminderService: ReminderService,
    config: ScheduleConfig
  ): SchedulerService {
    return new SchedulerService(reminderService, config);
  }
}
