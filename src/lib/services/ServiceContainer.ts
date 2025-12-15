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
import { MessageService } from "./messageService";
import { ScheduleConfig } from "./types";
import { ConversationsDaoSupabase } from "../dao/implementations/supabase/ConversationsDaoSupabase";
import { MessagesDaoSupabase } from "../dao/implementations/supabase/MessagesDaoSupabase";
import { AssociatesDaoSupabase } from "../dao/implementations/supabase/AssociatesDaoSupabase";
import { GroupsDaoSupabase } from "../dao/implementations/supabase/GroupsDaoSupabase";
import { TwilioWhatsAppTemplateService } from "../twilio/adapters/TwilioWhatsAppTemplateService";
import { TwilioPhoneNumberService } from "../twilio/adapters/TwilioPhoneNumberService";
import { WhatsAppOnboardingService } from "../isv/services/WhatsAppOnboardingService";
import { NumberProvisioningService } from "../isv/services/NumberProvisioningService";
import { SubaccountService } from "../isv/services/SubaccountService";
import { TemplateDao } from "../isv/dao/TemplateDao";
import { ISVCustomerDao } from "../isv/dao/ISVCustomerDao";
import { ISVNumberDao } from "../isv/dao/ISVNumberDao";
import { CampaignDao } from "../isv/dao/CampaignDao";

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
    const twilioMessageService = new TwilioMessageService();
    const reminderRepository = new ReminderRepositorySupabase();
    const associateRepository = new AssociateRepositorySupabase();
    const assignmentRepository = new AssignmentRepositorySupabase();

    // Create DAOs
    const associatesDao = new AssociatesDaoSupabase();
    const groupsDao = new GroupsDaoSupabase();
    const conversationsDao = new ConversationsDaoSupabase();
    const messagesDao = new MessagesDaoSupabase();

    // Create Twilio adapters
    const twilioWhatsAppTemplateService = new TwilioWhatsAppTemplateService();
    const twilioPhoneNumberService = new TwilioPhoneNumberService();

    // Create ISV services dependencies
    const subaccountService = new SubaccountService();
    const templateDao = new TemplateDao();
    const customerDao = new ISVCustomerDao();
    const numberDao = new ISVNumberDao();
    const campaignDao = new CampaignDao();

    // Create services
    const reminderService = ServiceFactory.createReminderService(
      reminderRepository,
      twilioMessageService,
      logger,
      associateRepository
    );

    const incomingMessageService = ServiceFactory.createIncomingMessageService(
      associateRepository,
      assignmentRepository,
      twilioMessageService,
      logger
    );

    const messageService = ServiceFactory.createMessageService(
      twilioMessageService,
      associatesDao,
      groupsDao,
      conversationsDao,
      messagesDao
    );

    const whatsAppOnboardingService =
      ServiceFactory.createWhatsAppOnboardingService(
        twilioWhatsAppTemplateService,
        subaccountService,
        templateDao,
        customerDao
      );

    const numberProvisioningService =
      ServiceFactory.createNumberProvisioningService(
        twilioPhoneNumberService,
        subaccountService,
        numberDao,
        campaignDao
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
    this.services.set("twilioMessageService", twilioMessageService);
    this.services.set("reminderRepository", reminderRepository);
    this.services.set("associateRepository", associateRepository);
    this.services.set("assignmentRepository", assignmentRepository);
    this.services.set("associatesDao", associatesDao);
    this.services.set("groupsDao", groupsDao);
    this.services.set("conversationsDao", conversationsDao);
    this.services.set("messagesDao", messagesDao);
    this.services.set(
      "twilioWhatsAppTemplateService",
      twilioWhatsAppTemplateService
    );
    this.services.set("twilioPhoneNumberService", twilioPhoneNumberService);
    this.services.set("reminderService", reminderService);
    this.services.set("incomingMessageService", incomingMessageService);
    this.services.set("messageService", messageService);
    this.services.set("whatsAppOnboardingService", whatsAppOnboardingService);
    this.services.set("numberProvisioningService", numberProvisioningService);
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

  getMessageService(): MessageService {
    return this.services.get("messageService");
  }

  getWhatsAppOnboardingService(): WhatsAppOnboardingService {
    return this.services.get("whatsAppOnboardingService");
  }

  getNumberProvisioningService(): NumberProvisioningService {
    return this.services.get("numberProvisioningService");
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
