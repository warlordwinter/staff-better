// Shared message parsing functionality

import { MessageAction } from "../interfaces/MessageAction";

export class MessageParserService {
  /**
   * Parse the incoming message to determine what action to take
   */
  parseMessageAction(messageBody: string): MessageAction {
    const normalizedMessage = this.normalizeMessage(messageBody);

    // Check for confirmation keywords
    if (this.isConfirmationMessage(normalizedMessage)) {
      return MessageAction.CONFIRMATION;
    }

    // Check for help request
    if (normalizedMessage === "help") {
      return MessageAction.HELP_REQUEST;
    }

    // Check for opt-out request
    if (normalizedMessage === "stop" || normalizedMessage === "unsubscribe") {
      return MessageAction.OPT_OUT;
    }

    return MessageAction.UNKNOWN;
  }

  /**
   * Check if message is a confirmation
   */
  isConfirmationMessage(message: string): boolean {
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

  /**
   * Normalize message text for consistent processing
   */
  normalizeMessage(message: string): string {
    return message.trim().toLowerCase();
  }

  /**
   * Extract key information from message (for future extensibility)
   */
  extractMessageInfo(message: string): {
    originalMessage: string;
    normalizedMessage: string;
    wordCount: number;
    hasNumbers: boolean;
  } {
    const normalized = this.normalizeMessage(message);
    const hasNumbers = /\d/.test(message);

    return {
      originalMessage: message,
      normalizedMessage: normalized,
      wordCount: normalized.split(/\s+/).length,
      hasNumbers,
    };
  }
}
