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
   */
  async processIncomingMessage(
    fromNumber: string,
    messageBody: string
  ): Promise<IncomingMessageResult> {
    try {
      this.logger.info(
        `Processing message from ${fromNumber}: "${messageBody}"`
      );

      const normalizedPhone = this.normalizePhoneNumber(fromNumber);
      const associate = await this.associateRepository.getAssociateByPhone(
        normalizedPhone
      );

      if (!associate) {
        this.logger.warn(
          `No associate found for phone number: ${normalizedPhone}`
        );
        return {
          success: false,
          action: MessageAction.UNKNOWN,
          phone_number: normalizedPhone,
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
          normalizedPhone
        );
      }

      return await handler.handle(associate, messageBody, normalizedPhone);
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
    phoneNumber: string
  ): Promise<IncomingMessageResult> {
    const unknownMessage = `Hi ${associate.first_name}!\n\nI didn't understand that message.\n\nReply "C" to confirm, "HELP" for help, or call us directly.`;

    await this.messageService.sendSMS({
      to: phoneNumber,
      body: unknownMessage,
    });

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
