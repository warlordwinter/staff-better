// Core reminder business logic with improved design

import {
  IReminderRepository,
  IMessageService,
  ILogger,
  IAssociateRepository,
} from "./interfaces/index";
import { ReminderAssignment, ReminderResult, ReminderType } from "./types";
import { SMSResult } from "../twilio/types";

// Re-export types from the types file
export type { ReminderAssignment, ReminderResult, ReminderType } from "./types";

export class ReminderService {
  constructor(
    private readonly reminderRepository: IReminderRepository,
    private readonly messageService: IMessageService,
    private readonly logger: ILogger,
    private readonly associateRepository: IAssociateRepository
  ) {}

  /**
   * Main method to process all scheduled reminders
   * This should be called by a cron job or scheduled function
   */
  async processScheduledReminders(): Promise<ReminderResult[]> {
    const results: ReminderResult[] = [];

    try {
      this.logger.info("Starting scheduled reminder processing");

      const dueReminders = await this.reminderRepository.getDueReminders();
      this.logger.info(`Found ${dueReminders.length} reminders to process`);

      for (const assignment of dueReminders) {
        const reminderType = this.determineReminderType(assignment);
        const result = await this.sendReminderToAssociate(
          assignment,
          reminderType
        );
        results.push(result);

        if (result.success) {
          await this.updateReminderStatus(
            assignment.job_id,
            assignment.associate_id
          );
        }

        // Rate limiting
        await this.delay(200);
      }

      const successCount = results.filter((r) => r.success).length;
      this.logger.info(
        `Processed ${results.length} reminders. Success: ${successCount}`
      );

      return results;
    } catch (error) {
      this.logger.error("Error processing scheduled reminders", error as Error);
      throw error;
    }
  }

  /**
   * Send a reminder to a specific associate
   */
  async sendReminderToAssociate(
    assignment: ReminderAssignment,
    reminderType: ReminderType
  ): Promise<ReminderResult> {
    try {
      const formattedPhone = this.messageService.formatPhoneNumber(
        assignment.phone_number
      );
      const messageBody = this.generateReminderMessage(
        assignment,
        reminderType
      );

      const smsResult = await this.messageService.sendReminderSMS({
        to: formattedPhone,
        body: messageBody,
      });

      // Send opt-out message if this is the first reminder (after sending the reminder)
      if (smsResult.success) {
        try {
          // Get company_id via repository
          const companyId = await this.associateRepository.getAssociateCompanyId(
            assignment.associate_id
          );

          if (companyId) {
            const { sendReminderOptOutIfNeeded } = await import(
              "@/lib/utils/optOutUtils"
            );
            await sendReminderOptOutIfNeeded(
              assignment.associate_id,
              assignment.phone_number,
              companyId
            );
          }
        } catch (optOutError) {
          // Log error but don't fail the reminder send
          this.logger.error(
            `Failed to send opt-out message for reminder to associate ${assignment.associate_id}:`,
            optOutError as Error
          );
        }
      }

      return {
        success: smsResult.success,
        assignment_id: `${assignment.job_id}-${assignment.associate_id}`,
        associate_id: assignment.associate_id,
        phone_number: formattedPhone,
        reminder_type: reminderType,
        message_id: smsResult.success ? smsResult.messageId : undefined,
        error: smsResult.success ? undefined : smsResult.error,
      };
    } catch (error) {
      this.logger.error(
        `Error sending reminder to associate ${assignment.associate_id}`,
        error as Error
      );

      return {
        success: false,
        assignment_id: `${assignment.job_id}-${assignment.associate_id}`,
        associate_id: assignment.associate_id,
        phone_number: assignment.phone_number,
        reminder_type: reminderType,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // This method is now handled by the repository
  // The repository will implement the logic for finding due reminders

  /**
   * Determine what type of reminder to send based on timing
   * Examples for a job at Monday 9:00 AM:
   * - Two days before: Saturday (36-60 hours before)
   * - Day before: Sunday (12-36 hours before)
   * - Morning of: Monday morning (2-6 hours before)
   * - Hour before: Monday ~8 AM (0.5-2 hours before)
   */
  private determineReminderType(assignment: ReminderAssignment): ReminderType {
    const now = new Date();
    const workDateTime = this.combineDateTime(
      assignment.work_date,
      assignment.start_time
    );
    const hoursDifference =
      (workDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log("=== DEBUGGING DATETIME ===");
    console.log("Current time (now):", now.toISOString());
    console.log("Current time (local):", now.toString());
    console.log("Work date from DB:", assignment.work_date);
    console.log("Start time from DB:", assignment.start_time);
    console.log("Combined work datetime (UTC):", workDateTime.toISOString());
    console.log("Combined work datetime (local):", workDateTime.toString());
    console.log("Hours difference:", hoursDifference);
    console.log("========================");

    console.log("Assignment for determinng reminder type", assignment.title);

    console.log("Assignment's hour difference", hoursDifference);

    if (hoursDifference >= 36 && hoursDifference < 60) {
      // Two days before: 36-60 hours (1.5-2.5 days)
      return ReminderType.TWO_DAYS_BEFORE;
    } else if (hoursDifference >= 12 && hoursDifference < 36) {
      // Day before: 12-36 hours (0.5-1.5 days)
      return ReminderType.DAY_BEFORE;
    } else if (hoursDifference >= 2 && hoursDifference < 6) {
      // Morning of: 2-6 hours before (early morning for afternoon jobs, etc.)
      return ReminderType.MORNING_OF;
    } else if (hoursDifference >= 0.5 && hoursDifference < 2) {
      // Hour before: 30 minutes to 2 hours before
      return ReminderType.HOUR_BEFORE;
    } else {
      // Either too early, too late, or overdue
      return ReminderType.FOLLOW_UP;
    }
  }

  /**
   * Generate reminder message text based on assignment and reminder type
   */
  private generateReminderMessage(
    assignment: ReminderAssignment,
    reminderType: ReminderType
  ): string {
    const {
      associate_first_name,
      title: job_title,
      client_company: customer_name,
      work_date,
      start_time,
    } = assignment;
    const workDateStr = work_date.toLocaleDateString("en-US", {
      timeZone: "UTC",
    });
    const timeStr = this.formatTime(start_time);
    const baseInfo = `${job_title} for ${customer_name} on ${workDateStr} at ${timeStr}`;

    const messageTemplates: Record<ReminderType, string> = {
      [ReminderType.THREE_DAYS_BEFORE]: `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} in 3 days.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`,
      [ReminderType.TWO_DAYS_BEFORE]: `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} in 2 days.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`,
      [ReminderType.DAY_BEFORE]: `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} tomorrow.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`,
      [ReminderType.MORNING_OF]: `Good morning ${associate_first_name}!\n\nDon't forget your ${baseInfo} today.\n\nPlease confirm that you will be able to make it, if not please inform us ASAP!\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`,
      [ReminderType.HOUR_BEFORE]: `Hi ${associate_first_name}!\n\nYour ${baseInfo} starts in about an hour.\n\nHope you're ready!`,
      [ReminderType.FOLLOW_UP]: `Hi ${associate_first_name}!\n\nJust checking - are you on your way to ${baseInfo}?\n\nLet us know if you need anything!`,
    };

    return (
      messageTemplates[reminderType] ||
      `Hi ${associate_first_name}!\n\nReminder about your ${baseInfo}.`
    );
  }

  /**
   * Update reminder status in the database after sending
   */
  private async updateReminderStatus(
    job_id: string,
    associate_id: string
  ): Promise<void> {
    try {
      const currentReminders =
        await this.reminderRepository.getNumberOfReminders(
          job_id,
          associate_id
        );

      if (currentReminders > 0) {
        await this.reminderRepository.updateReminderStatus(
          job_id,
          associate_id,
          {
            num_reminders: currentReminders - 1,
            last_reminder_time: new Date(),
          }
        );
        this.logger.info(
          `Updated reminder status for job ${job_id}, associate ${associate_id}`
        );
      }
    } catch (error) {
      this.logger.error("Error updating reminder status", error as Error);
      // Don't throw - we don't want to fail the whole process if DB update fails
    }
  }

  /**
   * Send a test reminder to a specific assignment
   */
  async sendTestReminder(
    jobId: string,
    associateId: string
  ): Promise<ReminderResult> {
    const assignment = await this.reminderRepository.getReminderAssignment(
      jobId,
      associateId
    );

    if (!assignment) {
      throw new Error("Reminder Assignment is null");
    }

    return await this.sendReminderToAssociate(
      assignment,
      ReminderType.DAY_BEFORE
    );
  }

  /**
   * Get reminder statistics
   *
   * NOT IMPLEMENTED
   */
  // Keep the params but indicate they’re intentionally unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getReminderStats(_startDate: Date, _endDate: Date) {
    return {
      totalSent: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
    };
  }

  // Helper methods
  private combineDateTime(date: Date, timeString: string): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    let hours: number;
    let minutes: number;

    // Check if timeString is an ISO datetime string (e.g., "2025-10-24T19:00:00+00:00")
    if (timeString.includes("T")) {
      try {
        const isoDate = new Date(timeString);
        if (isNaN(isoDate.getTime())) {
          throw new Error(`Invalid ISO datetime: ${timeString}`);
        }
        hours = isoDate.getUTCHours();
        minutes = isoDate.getUTCMinutes();
      } catch (error) {
        throw new Error(
          `Failed to parse ISO datetime: ${timeString}. Error: ${error}`
        );
      }
    } else {
      // Parse time string with validation (e.g., "19:00:00")
      const timeParts = timeString.split(":");
      if (timeParts.length < 2) {
        throw new Error(
          `Invalid time format: ${timeString}. Expected HH:MM or HH:MM:SS`
        );
      }

      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);

      // Validate time values
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new Error(
          `Invalid time values: hours=${hours}, minutes=${minutes} from time string: ${timeString}`
        );
      }
    }

    // Create UTC datetime since timeString is UTC from database
    const result = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));

    // Validate the resulting date
    if (isNaN(result.getTime())) {
      throw new Error(
        `Invalid date created from date=${date.toISOString()}, time=${timeString}`
      );
    }

    return result;
  }

  private formatTime(timeString: string): string {
    let hours: number;
    let minutes: number;

    // Check if timeString is an ISO datetime string (e.g., "2025-10-24T19:00:00+00:00")
    if (timeString.includes("T")) {
      try {
        const isoDate = new Date(timeString);
        if (isNaN(isoDate.getTime())) {
          return timeString; // Return original if invalid
        }
        hours = isoDate.getUTCHours();
        minutes = isoDate.getUTCMinutes();
      } catch {
        return timeString; // Return original if parsing fails
      }
    } else {
      // Parse time string (e.g., "19:00:00")
      const timeParts = timeString.split(":");
      if (timeParts.length < 2) {
        return timeString; // Return original if invalid format
      }

      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);

      // Validate time values
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return timeString; // Return original if invalid values
      }
    }

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send SMS notification (consolidated from NotificationService)
   * Uses reminder phone number
   */
  async sendSMSNotification(
    phoneNumber: string,
    messageBody: string
  ): Promise<SMSResult> {
    try {
      const smsResult: SMSResult = await this.messageService.sendReminderSMS({
        to: phoneNumber,
        body: messageBody,
      });
      return smsResult;
    } catch (error) {
      this.logger.error("Error sending SMS:", error as Error);
      throw new Error("Failed to send SMS.");
    }
  }
}
