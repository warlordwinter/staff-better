// Orchestrates incoming message processing with improved architecture

import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "./interfaces/IncomingMessageResult";
import { MessageAction } from "./interfaces/MessageAction";
import { AssociateDaoSupabase } from "../dao/implementations/supabase/AssociatesDaoSupabase";

// Shared services
import { SMSService } from "./shared/SMSService";
import { MessageParserService } from "./shared/MessageParserService";
import { AssignmentService } from "./shared/AssignmentService";
import { MessageGeneratorService } from "./shared/MessageGeneratorService";

// Handlers
import { MessageActionHandler } from "./handlers/MessageActionHandler";
import { ConfirmationHandler } from "./handlers/ConfirmationHandler";
import { HelpRequestHandler } from "./handlers/HelpRequestHandler";
import { OptOutHandler } from "./handlers/OptOutHandler";
import { UnknownMessageHandler } from "./handlers/UnknownMessageHandler";

export class MessageRouter {
  private associatesDao: AssociateDaoSupabase;
  private smsService: SMSService;
  private messageParser: MessageParserService;
  private assignmentService: AssignmentService;
  private messageGenerator: MessageGeneratorService;
  private handlers: Map<MessageAction, MessageActionHandler>;

  constructor() {
    // Initialize shared services
    this.associatesDao = new AssociateDaoSupabase();
    this.smsService = new SMSService();
    this.messageParser = new MessageParserService();
    this.assignmentService = new AssignmentService();
    this.messageGenerator = new MessageGeneratorService();

    // Initialize handlers
    this.handlers = new Map();
    this.initializeHandlers();
  }

  /**
   * Main method to process incoming SMS messages
   * This should be called by your Twilio webhook endpoint
   */
  async processIncomingMessage(
    fromNumber: string,
    messageBody: string
  ): Promise<IncomingMessageResult> {
    try {
      console.log(`Processing message from ${fromNumber}: "${messageBody}"`);

      // Normalize the phone number format
      const normalizedPhone = this.smsService.normalizePhoneNumber(fromNumber);

      // Find the associate by phone number
      const associate = await this.associatesDao.getAssociateByPhone(
        normalizedPhone
      );

      if (!associate) {
        console.log(`No associate found for phone number: ${normalizedPhone}`);
        return {
          success: false,
          action: MessageAction.UNKNOWN,
          phone_number: normalizedPhone,
          message: messageBody,
          error: "Associate not found",
        };
      }

      // Determine the action based on message content
      const action = this.messageParser.parseMessageAction(messageBody);

      // Get the appropriate handler and process the action
      const handler = this.handlers.get(action);
      if (!handler) {
        throw new Error(`No handler found for action: ${action}`);
      }

      return await handler.handle(associate, normalizedPhone, messageBody);
    } catch (error) {
      console.error("Error processing incoming message:", error);

      return {
        success: false,
        action: MessageAction.UNKNOWN,
        phone_number: fromNumber,
        message: messageBody,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Initialize all message action handlers
   */
  private initializeHandlers(): void {
    // Create handler instances with their dependencies
    const confirmationHandler = new ConfirmationHandler(
      this.assignmentService,
      this.smsService,
      this.messageGenerator
    );

    const helpRequestHandler = new HelpRequestHandler(
      this.smsService,
      this.messageGenerator
    );

    const optOutHandler = new OptOutHandler(
      this.smsService,
      this.messageGenerator,
      this.associatesDao
    );

    const unknownMessageHandler = new UnknownMessageHandler(
      this.smsService,
      this.messageGenerator
    );

    // Register handlers
    this.handlers.set(MessageAction.CONFIRMATION, confirmationHandler);
    this.handlers.set(MessageAction.HELP_REQUEST, helpRequestHandler);
    this.handlers.set(MessageAction.OPT_OUT, optOutHandler);
    this.handlers.set(MessageAction.UNKNOWN, unknownMessageHandler);
  }

  /**
   * Get statistics about message processing (for monitoring)
   */
  getProcessingStats(): {
    totalHandlers: number;
    supportedActions: MessageAction[];
  } {
    return {
      totalHandlers: this.handlers.size,
      supportedActions: Array.from(this.handlers.keys()),
    };
  }
}
