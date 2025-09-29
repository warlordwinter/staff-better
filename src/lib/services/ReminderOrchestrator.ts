// Orchestrates reminder processing with improved architecture

import {
  getNumberOfReminders,
  updateJobAssignment,
} from "../dao/JobsAssignmentsDao";
import {
  getAssignmentsNotRecentlyReminded,
  getDayBeforeReminders,
  getMorningOfReminders,
  getReminderAssignment,
  getTwoDaysBeforeReminders,
} from "../dao/ReminderDao";
import {
  ReminderResult,
  ReminderType,
  ReminderAssignment,
} from "./reminderService";

// Shared services
import { SMSService } from "./shared/SMSService";
import { MessageGeneratorService } from "./shared/MessageGeneratorService";
import { DateTimeService } from "./shared/DateTimeService";

export class ReminderOrchestrator {
  private smsService: SMSService;
  private messageGenerator: MessageGeneratorService;
  private dateTimeService: DateTimeService;

  constructor() {
    this.smsService = new SMSService();
    this.messageGenerator = new MessageGeneratorService();
    this.dateTimeService = new DateTimeService();
  }

  /**
   * Main method to process all scheduled reminders
   * This should be called by a cron job or scheduled function
   */
  async processScheduledReminders(): Promise<ReminderResult[]> {
    const results: ReminderResult[] = [];

    try {
      // Find all assignments that need reminders
      const dueReminders = await this.findDueReminders();

      console.log(`Found ${dueReminders.length} reminders to process`);

      // Process each reminder
      for (const assignment of dueReminders) {
        const reminderType = this.determineReminderType(assignment);
        const result = await this.sendReminderToAssociate(
          assignment,
          reminderType
        );
        results.push(result);

        // Update the database with reminder attempt
        if (result.success) {
          await this.updateReminderStatus(
            assignment.job_id,
            assignment.associate_id
          );
        }

        // Add delay between messages to respect rate limits
        await this.dateTimeService.delay(200);
      }

      console.log(
        `Processed ${results.length} reminders. Success: ${
          results.filter((r) => r.success).length
        }`
      );
      return results;
    } catch (error) {
      console.error("Error processing scheduled reminders:", error);
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
      // Format phone number
      const formattedPhone = this.smsService.formatPhoneNumber(
        assignment.phone_number
      );

      // Generate reminder message
      const messageBody = this.messageGenerator.generateReminderMessage(
        assignment,
        reminderType
      );

      // Send the SMS
      const smsResult = await this.smsService.sendMessage(
        formattedPhone,
        messageBody
      );

      // Return result
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
      console.error(
        `Error sending reminder to associate ${assignment.associate_id}:`,
        error
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

  /**
   * Find assignments that need reminders sent
   */
  private async findDueReminders(): Promise<ReminderAssignment[]> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const dueAssignments: ReminderAssignment[] = [];
    console.log("Finding due reminders");

    try {
      // Get day-before reminders (for work happening tomorrow)
      const dayBeforeReminders = await getDayBeforeReminders(tomorrow);
      console.log("Day Before reminders from dao:", dayBeforeReminders);

      // Get morning-of reminders (for work happening today, starting in 1-2 hours)
      const morningOfReminders = await getMorningOfReminders(2);
      console.log("Morning of reminders from dao:", morningOfReminders);

      // Get two-days-before reminders (for work happening day after tomorrow)
      const twoDaysBeforeReminders = await getTwoDaysBeforeReminders(
        dayAfterTomorrow
      );
      console.log("Two days before reminders", twoDaysBeforeReminders);

      dueAssignments.push(
        ...dayBeforeReminders,
        ...morningOfReminders,
        ...twoDaysBeforeReminders
      );

      console.log("All due assignments", dueAssignments);

      // Optional: Filter out assignments that were reminded recently
      return await getAssignmentsNotRecentlyReminded(dueAssignments, 4);
    } catch (error) {
      console.error("Error finding due reminders:", error);
      return [];
    }
  }

  /**
   * Determine what type of reminder to send based on timing
   */
  private determineReminderType(assignment: ReminderAssignment): ReminderType {
    const now = new Date();
    const workDateTime = this.dateTimeService.combineDateTime(
      assignment.work_date,
      assignment.start_time
    );
    const hoursDifference = this.dateTimeService.getHoursDifference(
      now,
      workDateTime
    );

    console.log("=== DEBUGGING DATETIME ===");
    console.log("Current time (now):", now.toISOString());
    console.log("Current time (local):", now.toString());
    console.log("Work date from DB:", assignment.work_date);
    console.log("Start time from DB:", assignment.start_time);
    console.log("Combined work datetime (UTC):", workDateTime.toISOString());
    console.log("Combined work datetime (local):", workDateTime.toString());
    console.log("Hours difference:", hoursDifference);
    console.log("========================");

    console.log(
      "Assignment for determining reminder type",
      assignment.job_title
    );
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
   * Update reminder status in the database after sending
   */
  private async updateReminderStatus(
    job_id: string,
    associate_id: string
  ): Promise<void> {
    try {
      const currentReminders: number = await getNumberOfReminders(
        job_id,
        associate_id
      );

      if (currentReminders > 0) {
        await updateJobAssignment(job_id, associate_id, {
          num_reminders: currentReminders - 1, // Decrease the reminder count
          last_reminder_time: new Date().toISOString(),
        });
        console.log(
          `Updated reminder status for job ${job_id}, associate ${associate_id}`
        );
      }
    } catch (error) {
      console.error("Error updating reminder status:", error);
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
    const assignment: ReminderAssignment | null = await getReminderAssignment(
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
   */
  async getReminderStats(_startDate: Date, _endDate: Date) {
    return {
      totalSent: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
    };
  }
}
