// Service for handling incoming SMS messages with improved design

import {
  IAssociateRepository,
  IAssignmentRepository,
  IMessageService,
  ILogger,
} from "./interfaces/index";
import { MessageAction, IncomingMessageResult } from "./types";
import { Associate } from "@/model/interfaces/Associate";
import { IMessageHandler } from "./messageHandlers/IMessageHandler";
import { ConfirmationHandler } from "./messageHandlers/ConfirmationHandler";
import { HelpHandler } from "./messageHandlers/HelpHandler";
import { OptOutHandler } from "./messageHandlers/OptOutHandler";
import { OptInHandler } from "./messageHandlers/OptInHandler";

// Re-export from the types file
export type { IncomingMessageResult } from "./types";
export { MessageAction } from "./types";

export class IncomingMessageService {
  private messageHandlers: Map<MessageAction, IMessageHandler> = new Map();

  constructor(
    private readonly associateRepository: IAssociateRepository,
    private readonly assignmentRepository: IAssignmentRepository,
    private readonly messageService: IMessageService,
    private readonly logger: ILogger
  ) {
    this.registerHandlers();
  }

  /**
   * Main method to process incoming SMS messages
   * This should be called by your Twilio webhook endpoint
   * @param fromNumber The phone number that sent the message
   * @param messageBody The message content
   * @param toNumber The phone number that received the message (optional)
   * @param companyId The company ID associated with the associate (optional)
   */
  async processIncomingMessage(
    fromNumber: string,
    messageBody: string,
    toNumber?: string,
    companyId?: string
  ): Promise<IncomingMessageResult> {
    try {
      this.logger.info(
        `Processing message from ${fromNumber}: "${messageBody}"`
      );

      // Don't normalize here - let getAssociateByPhone handle normalization
      // It uses normalizePhoneForLookup which is consistent with the route handler
      const associate = await this.associateRepository.getAssociateByPhone(
        fromNumber
      );

      if (!associate) {
        this.logger.warn(`No associate found for phone number: ${fromNumber}`);
        return {
          success: false,
          action: MessageAction.UNKNOWN,
          phone_number: fromNumber,
          message: messageBody,
          error: "Associate not found",
        };
      }

      const action = this.parseMessageAction(messageBody);
      const handler = this.messageHandlers.get(action);

      if (!handler) {
        return this.handleUnknownMessage(
          associate,
          messageBody,
          fromNumber,
          toNumber,
          companyId
        );
      }

      return await handler.handle(
        associate,
        messageBody,
        fromNumber,
        toNumber,
        companyId
      );
    } catch (error) {
      this.logger.error("Error processing incoming message", error as Error);
      return {
        success: false,
        action: MessageAction.UNKNOWN,
        phone_number: fromNumber,
        message: messageBody,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private registerHandlers(): void {
    this.messageHandlers.set(
      MessageAction.CONFIRMATION,
      new ConfirmationHandler(
        this.assignmentRepository,
        this.messageService,
        this.logger
      )
    );
    this.messageHandlers.set(
      MessageAction.HELP_REQUEST,
      new HelpHandler(this.messageService, this.logger)
    );
    this.messageHandlers.set(
      MessageAction.OPT_OUT,
      new OptOutHandler(
        this.associateRepository,
        this.messageService,
        this.logger
      )
    );
    this.messageHandlers.set(
      MessageAction.OPT_IN,
      new OptInHandler(
        this.associateRepository,
        this.messageService,
        this.logger
      )
    );
  }

  /**
   * Parse the incoming message to determine what action to take
   */
  private parseMessageAction(messageBody: string): MessageAction {
    const normalizedMessage = messageBody.trim().toLowerCase();

    if (this.isConfirmationMessage(normalizedMessage)) {
      return MessageAction.CONFIRMATION;
    }

    if (normalizedMessage === "help") {
      return MessageAction.HELP_REQUEST;
    }

    // Check for opt-in keywords before opt-out to avoid conflicts
    if (
      normalizedMessage === "start" ||
      normalizedMessage === "subscribe" ||
      normalizedMessage === "yes" ||
      normalizedMessage === "optin" ||
      normalizedMessage === "opt-in"
    ) {
      return MessageAction.OPT_IN;
    }

    if (normalizedMessage === "stop" || normalizedMessage === "unsubscribe") {
      return MessageAction.OPT_OUT;
    }

    //TODO: Add a way to handle other messages

    return MessageAction.UNKNOWN;
  }

  /**
   * Check if message is a confirmation
   */
  private isConfirmationMessage(message: string): boolean {
    const confirmationKeywords = [
      "c",
      "confirm",
      "confirmed",
      "yes",
      "y",
      "ok",
      "okay",
      "sure",
      "will be there",
      "i'll be there",
      "ill be there",
    ];

    return confirmationKeywords.some(
      (keyword) => message.includes(keyword) || message === keyword
    );
  }

  private async handleUnknownMessage(
    associate: Associate,
    message: string,
    phoneNumber: string,
    toNumber?: string,
    companyId?: string
  ): Promise<IncomingMessageResult> {
    const unknownMessage = `Hi ${associate.first_name}!\n\nI didn't understand that message.\n\nReply "C" to confirm, "HELP" for help, or call us directly.`;

    // Determine which number to reply from
    const { TWILIO_PHONE_NUMBER_REMINDERS } = await import(
      "@/lib/twilio/client"
    );
    const { getCompanyPhoneNumberAdmin } = await import(
      "@/lib/auth/getCompanyId"
    );

    if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
      await this.messageService.sendReminderSMS({
        to: phoneNumber,
        body: unknownMessage,
      });
    } else if (companyId) {
      const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);
      if (companyPhoneNumber) {
        await this.messageService.sendTwoWaySMS(
          { to: phoneNumber, body: unknownMessage },
          companyPhoneNumber
        );
      } else {
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: unknownMessage,
        });
      }
    } else {
      await this.messageService.sendReminderSMS({
        to: phoneNumber,
        body: unknownMessage,
      });
    }

    return {
      success: true,
      action: MessageAction.UNKNOWN,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: message,
      response_sent: unknownMessage,
    };
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return "+1" + digitsOnly.substring(1);
    }

    if (digitsOnly.length === 10) {
      return "+1" + digitsOnly;
    }

    return phoneNumber;
  }
}
