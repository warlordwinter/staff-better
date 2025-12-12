// Factory for creating properly configured services

import { ReminderService } from "./reminderService";
import { IncomingMessageService } from "./IncomingMessageService";
import { SchedulerService } from "./schedulerService";
import { MessageService } from "./messageService";
import {
  IReminderRepository,
  IMessageService,
  ILogger,
  IAssociateRepository,
  IAssignmentRepository,
} from "./interfaces/index";
import { IAssociates } from "../dao/interfaces/IAssociates";
import { IGroups } from "../dao/interfaces/IGroups";
import { IConversations } from "../dao/interfaces/IConversations";
import { IMessages } from "../dao/interfaces/IMessages";
import { ScheduleConfig } from "./types";
import { WhatsAppOnboardingService } from "../isv/services/WhatsAppOnboardingService";
import { NumberProvisioningService } from "../isv/services/NumberProvisioningService";
import { IWhatsAppTemplateService } from "../twilio/adapters/IWhatsAppTemplateService";
import { IPhoneNumberService } from "../twilio/adapters/IPhoneNumberService";
import { SubaccountService } from "../isv/services/SubaccountService";
import { TemplateDao } from "../isv/dao/TemplateDao";
import { ISVCustomerDao } from "../isv/dao/ISVCustomerDao";
import { ISVNumberDao } from "../isv/dao/ISVNumberDao";
import { CampaignDao } from "../isv/dao/CampaignDao";

export class ServiceFactory {
  static createReminderService(
    reminderRepository: IReminderRepository,
    messageService: IMessageService,
    logger: ILogger,
    associateRepository: IAssociateRepository
  ): ReminderService {
    return new ReminderService(
      reminderRepository,
      messageService,
      logger,
      associateRepository
    );
  }

  static createMessageService(
    messageService: IMessageService,
    associatesDao: IAssociates,
    groupsDao: IGroups,
    conversationsDao: IConversations,
    messagesDao: IMessages
  ): MessageService {
    return new MessageService(
      messageService,
      associatesDao,
      groupsDao,
      conversationsDao,
      messagesDao
    );
  }

  static createWhatsAppOnboardingService(
    templateService: IWhatsAppTemplateService,
    subaccountService: SubaccountService,
    templateDao: TemplateDao,
    customerDao: ISVCustomerDao
  ): WhatsAppOnboardingService {
    return new WhatsAppOnboardingService(
      templateService,
      subaccountService,
      templateDao,
      customerDao
    );
  }

  static createNumberProvisioningService(
    phoneNumberService: IPhoneNumberService,
    subaccountService: SubaccountService,
    numberDao: ISVNumberDao,
    campaignDao: CampaignDao
  ): NumberProvisioningService {
    return new NumberProvisioningService(
      phoneNumberService,
      subaccountService,
      numberDao,
      campaignDao
    );
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
