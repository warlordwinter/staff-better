// Service for handling incoming SMS messages from associates

import {
  getActiveAssignmentsFromDatabase,
  updateJobAssignment,
} from "../dao/JobsAssignmentsDao";
import { getAssociateByPhone, optOutAssociate } from "../dao/AssociatesDao";
import { sendSMS } from "../twilio/sms";
import { SMSMessage } from "../twilio/types";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { Associate } from "@/model/interfaces/Associate";

export interface IncomingMessageResult {
  success: boolean;
  action: MessageAction;
  associate_id?: string;
  phone_number: string;
  message: string;
  response_sent?: string;
  error?: string;
}

export enum MessageAction {
  CONFIRMATION = "confirmation",
  HELP_REQUEST = "help_request",
  OPT_OUT = "opt_out",
  UNKNOWN = "unknown",
}

export interface ActiveAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  confirmation_status: ConfirmationStatus;
}

export class IncomingMessageService {
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
      const normalizedPhone = this.normalizePhoneNumber(fromNumber);

      // Find the associate by phone number
      const associate = await getAssociateByPhone(normalizedPhone);

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
      const action = this.parseMessageAction(messageBody);

      // Process the action
      return await this.processMessageAction(
        associate,
        action,
        messageBody,
        normalizedPhone
      );
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
   * Parse the incoming message to determine what action to take
   */
  private parseMessageAction(messageBody: string): MessageAction {
    const normalizedMessage = messageBody.trim().toLowerCase();

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

  /**
   * Process the determined action
   */
  private async processMessageAction(
    associate: Associate,
    action: MessageAction,
    originalMessage: string,
    phoneNumber: string
  ): Promise<IncomingMessageResult> {
    switch (action) {
      case MessageAction.CONFIRMATION:
        return await this.handleConfirmation(
          associate,
          phoneNumber,
          originalMessage
        );

      case MessageAction.HELP_REQUEST:
        return await this.handleHelpRequest(
          associate,
          phoneNumber,
          originalMessage
        );

      case MessageAction.OPT_OUT:
        return await this.handleOptOut(associate, phoneNumber, originalMessage);

      case MessageAction.UNKNOWN:
      default:
        return await this.handleUnknownMessage(
          associate,
          phoneNumber,
          originalMessage
        );
    }
  }

  /**
   * Handle confirmation messages
   */
  private async handleConfirmation(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    try {
      // Get the associate's active/upcoming assignments
      const activeAssignments = await this.getActiveAssignments(associate.id);

      if (activeAssignments.length === 0) {
        // No active assignments to confirm
        const response = `Hi ${associate.first_name}!\n\nWe don't have any upcoming assignments for you to confirm right now.\n\nIf you think this is an error, please call us.`;

        await this.sendResponse(phoneNumber, response);

        return {
          success: true,
          action: MessageAction.CONFIRMATION,
          associate_id: associate.id,
          phone_number: phoneNumber,
          message: originalMessage,
          response_sent: response,
        };
      }

      // Update confirmation status for all active assignments
      let updatedCount = 0;
      for (const assignment of activeAssignments) {
        const newStatus = this.determineConfirmationStatus(assignment);

        await updateJobAssignment(assignment.job_id, assignment.associate_id, {
          confirmation_status: newStatus,
          last_confirmation_time: new Date().toISOString(),
        });

        updatedCount++;
      }

      // Send confirmation response
      const response =
        updatedCount === 1
          ? `Thanks ${associate.first_name}!\n\nYour assignment is confirmed.\n\nWe'll see you there!`
          : `Thanks ${associate.first_name}!\n\nYour ${updatedCount} assignments are confirmed.\n\nWe'll see you there!`;

      await this.sendResponse(phoneNumber, response);

      return {
        success: true,
        action: MessageAction.CONFIRMATION,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: originalMessage,
        response_sent: response,
      };
    } catch (error) {
      console.error("Error handling confirmation:", error);
      throw error;
    }
  }

  /**
   * Handle help requests
   */
  private async handleHelpRequest(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    const helpMessage =
      `Hi ${associate.first_name}!\n\nHere's how to use our text system:\n\n` +
      `• Reply "C" or "Confirm" to confirm your assignment\n` +
      `• Reply "HELP" for this message\n` +
      `• Reply "STOP" to stop receiving texts\n\n` +
      `Questions? Call us at [YOUR_PHONE_NUMBER]`;

    await this.sendResponse(phoneNumber, helpMessage);

    return {
      success: true,
      action: MessageAction.HELP_REQUEST,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: originalMessage,
      response_sent: helpMessage,
    };
  }

  /**
   * Handle opt-out requests
   */
  private async handleOptOut(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    try {
      // Update associate to opt them out of SMS
      await optOutAssociate(associate.id);

      const optOutMessage =
        `${associate.first_name}, you have been unsubscribed from our text reminders. ` +
        `You can still receive calls about your assignments. To re-subscribe, please call us.`;

      await this.sendResponse(phoneNumber, optOutMessage);

      return {
        success: true,
        action: MessageAction.OPT_OUT,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: originalMessage,
        response_sent: optOutMessage,
      };
    } catch (error) {
      console.error("Error handling opt-out:", error);
      throw error;
    }
  }

  /**
   * Handle unknown/unrecognized messages
   */
  private async handleUnknownMessage(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    const unknownMessage =
      `Hi ${associate.first_name}!\n\nI didn't understand that message.\n\n` +
      `Reply "C" to confirm, "HELP" for help, or call us directly.`;

    await this.sendResponse(phoneNumber, unknownMessage);

    return {
      success: true,
      action: MessageAction.UNKNOWN,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: originalMessage,
      response_sent: unknownMessage,
    };
  }

  /**
   * Determine the appropriate confirmation status based on timing
   */
  private determineConfirmationStatus(
    assignment: ActiveAssignment
  ): ConfirmationStatus {
    const now = new Date();
    const workDateTime = this.combineDateTime(
      assignment.work_date,
      assignment.start_time
    );
    const hoursDifference =
      (workDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log("Work Date Time:", workDateTime);
    console.log("Now Time:", now);

    console.log("Calculating the hours difference to determine confirmation message:", hoursDifference);

    // If it's the day of the work (within 6 hours), mark as "Confirmed"
    // Otherwise, mark as "Soft Confirmed" or "Likely Confirmed"
    if (hoursDifference <= 6 && hoursDifference > 0) {
      return ConfirmationStatus.Confirmed;
    } else if (hoursDifference <= 24) {
      return ConfirmationStatus.LikelyConfirmed;
    } else {
      return ConfirmationStatus.SoftConfirmed;
    }
  }

  /**
   * Send a response SMS to the associate
   */
  private async sendResponse(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    const smsMessage: SMSMessage = {
      to: phoneNumber,
      body: message,
    };

    const result = await sendSMS(smsMessage);

    if (!result.success) {
      console.error(`Failed to send response to ${phoneNumber}:`, result.error);
      throw new Error(`Failed to send SMS response: ${result.error}`);
    }

    console.log(`Response sent to ${phoneNumber}: "${message}"`);
  }

  /**
   * Get active/upcoming assignments for an associate
   * This would need to be implemented in your DAO layer
   */
  private async getActiveAssignments(
    associateId: string
  ): Promise<ActiveAssignment[]> {
    // This is pseudocode - you'll need to implement this in your DAO
    // Should return assignments where:
    // 1. work_date >= today
    // 2. confirmation_status is not 'Declined'
    // 3. Maybe within next 7 days to avoid confirming very future assignments

    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysString = sevenDaysFromNow.toISOString().split("T")[0];

    console.log(`Getting active assignments for associate: ${associateId}`);
    console.log(`Date range: ${todayString} to ${sevenDaysString}`);

    const assignments = await getActiveAssignmentsFromDatabase(
      todayString,
      sevenDaysString,
      associateId
    );

    // Transform the data to match the ActiveAssignment interface
    const activeAssignments: ActiveAssignment[] = assignments.map(
      (assignment) => ({
        job_id: assignment.job_id,
        associate_id: assignment.associate_id,
        work_date: new Date(assignment.work_date),
        start_time: assignment.start_time,
        confirmation_status: this.mapConfirmationStatus(
          assignment.confirmation_status
        ),
      })
    );

    console.log(`Getting active assignments for associate: ${associateId}`);
    console.log("Active Assignments:", activeAssignments);
    return activeAssignments;
  }

  // Helper methods
  private mapConfirmationStatus(status: string): ConfirmationStatus {
    switch (status?.toLowerCase()) {
      case "unconfirmed":
        return ConfirmationStatus.Unconfirmed;
      case "soft confirmed":
        return ConfirmationStatus.SoftConfirmed;
      case "likely confirmed":
        return ConfirmationStatus.LikelyConfirmed;
      case "confirmed":
        return ConfirmationStatus.Confirmed;
      case "declined":
        return ConfirmationStatus.Declined;
      default:
        console.warn(
          `Unknown confirmation status: ${status}, defaulting to Unconfirmed`
        );
        return ConfirmationStatus.Unconfirmed;
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    // If it starts with 1 and is 11 digits, remove the 1
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return "+1" + digitsOnly.substring(1);
    }

    // If it's 10 digits, add +1
    if (digitsOnly.length === 10) {
      return "+1" + digitsOnly;
    }

    // Otherwise, assume it's already properly formatted
    return phoneNumber;
  }

  private combineDateTime(date: Date, timeString: string): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const [hours, minutes] = timeString.split(":").map(Number);

    return new Date(year, month, day, hours, minutes, 0, 0);
  }
}
