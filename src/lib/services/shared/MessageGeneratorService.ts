// Shared message generation functionality

import { convertUTCTimeToLocal } from "@/utils/timezoneUtils";
import { ReminderType } from "../reminderService";
import { ReminderAssignment } from "../reminderService";
import { DateTimeService } from "./DateTimeService";

export class MessageGeneratorService {
  private dateTimeService: DateTimeService;

  constructor() {
    this.dateTimeService = new DateTimeService();
  }

  /**
   * Generate reminder message text based on assignment and reminder type
   */
  generateReminderMessage(
    assignment: ReminderAssignment,
    reminderType: ReminderType
  ): string {
    const {
      associate_first_name,
      job_title,
      customer_name,
      work_date,
      start_time,
    } = assignment;

    const workDateStr = work_date.toLocaleDateString("en-US", {
      timeZone: "UTC",
    });

    const localTime = convertUTCTimeToLocal(start_time, work_date);
    const timeStr = this.dateTimeService.formatTime(localTime);

    const baseInfo = `${job_title} for ${customer_name} on ${workDateStr} at ${timeStr}`;

    switch (reminderType) {
      case ReminderType.TWO_DAYS_BEFORE:
        return `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} in 2 days.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`;

      case ReminderType.DAY_BEFORE:
        return `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} tomorrow.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`;

      case ReminderType.MORNING_OF:
        return `Good morning ${associate_first_name}!\n\nDon't forget your ${baseInfo} today.\n\nPlease confirm that you will be able to make it, if not please inform us ASAP!\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`;

      case ReminderType.HOUR_BEFORE:
        return `Hi ${associate_first_name}!\n\nYour ${baseInfo} starts in about an hour.\n\nHope you're ready!`;

      case ReminderType.FOLLOW_UP:
        return `Hi ${associate_first_name}!\n\nJust checking - are you on your way to ${baseInfo}?\n\nLet us know if you need anything!`;

      default:
        return `Hi ${associate_first_name}!\n\nReminder about your ${baseInfo}.`;
    }
  }

  /**
   * Generate confirmation response message
   */
  generateConfirmationResponse(
    associateFirstName: string,
    assignmentCount: number
  ): string {
    if (assignmentCount === 1) {
      return `Thanks ${associateFirstName}!\n\nYour assignment is confirmed.\n\nWe'll see you there!`;
    } else {
      return `Thanks ${associateFirstName}!\n\nYour ${assignmentCount} assignments are confirmed.\n\nWe'll see you there!`;
    }
  }

  /**
   * Generate no assignments message
   */
  generateNoAssignmentsMessage(associateFirstName: string): string {
    return `Hi ${associateFirstName}!\n\nWe don't have any upcoming assignments for you to confirm right now.\n\nIf you think this is an error, please call us.`;
  }

  /**
   * Generate help message
   */
  generateHelpMessage(
    associateFirstName: string,
    phoneNumber?: string
  ): string {
    const phoneText = phoneNumber
      ? `\n\nQuestions? Call us at ${phoneNumber}`
      : "";

    return (
      `Hi ${associateFirstName}!\n\nHere's how to use our text system:\n\n` +
      `• Reply "C" or "Confirm" to confirm your assignment\n` +
      `• Reply "HELP" for this message\n` +
      `• Reply "STOP" to stop receiving texts${phoneText}`
    );
  }

  /**
   * Generate opt-out confirmation message
   */
  generateOptOutMessage(associateFirstName: string): string {
    return (
      `${associateFirstName}, you have been unsubscribed from our text reminders. ` +
      `You can still receive calls about your assignments. To re-subscribe, please call us.`
    );
  }

  /**
   * Generate unknown message response
   */
  generateUnknownMessageResponse(associateFirstName: string): string {
    return (
      `Hi ${associateFirstName}!\n\nI didn't understand that message.\n\n` +
      `Reply "C" to confirm, "HELP" for help, or call us directly.`
    );
  }
}
