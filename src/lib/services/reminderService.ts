// Core reminder business logic

import { convertUTCTimeToLocal } from "@/utils/timezoneUtils";
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
import { formatPhoneNumber, sendSMS } from "../twilio/sms";
import { SMSMessage, SMSResult } from "../twilio/types";

export interface ReminderAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  associate_first_name: string;
  associate_last_name: string;
  phone_number: string;
  job_title: string;
  customer_name: string;
  num_reminders: number;
  last_confirmation_time?: Date;
}

export interface ReminderResult {
  success: boolean;
  assignment_id: string;
  associate_id: string;
  phone_number: string;
  reminder_type: ReminderType;
  message_id?: string;
  error?: string;
}

export enum ReminderType {
  THREE_DAYS_BEFORE = "three_days_before",
  TWO_DAYS_BEFORE = "two_days_before", // Use this
  DAY_BEFORE = "day_before", // Use this
  MORNING_OF = "morning_of", // Use this
  HOUR_BEFORE = "hour_before", // Use this
  FOLLOW_UP = "follow_up",
}

export class ReminderService {
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
        await this.delay(200);
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
      const formattedPhone = formatPhoneNumber(assignment.phone_number);

      // Generate reminder message
      const messageBody = this.generateReminderMessage(
        assignment,
        reminderType
      );

      // Create SMS message
      const smsMessage: SMSMessage = {
        to: formattedPhone,
        body: messageBody,
      };

      // Send the SMS
      const smsResult: SMSResult = await sendSMS(smsMessage);

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

    // This is pseudocode - you'll need to implement the actual DAO queries
    // The logic should find assignments where:
    // 1. Work date is tomorrow (for day-before reminders)
    // 2. Work date is today and start time is in 1-2 hours (for morning-of reminders)
    // 3. Haven't exceeded max reminder attempts
    // 4. Haven't been reminded recently

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

    console.log(
      "Assignment for determinng reminder type",
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
   * Generate reminder message text based on assignment and reminder type
   */
  private generateReminderMessage(
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
    console.log("Work date:", work_date);
    const workDateStr = work_date.toLocaleDateString("en-US", {
      timeZone: "UTC",
    });
    console.log("Work Date String:", workDateStr);

    const localTime = convertUTCTimeToLocal(start_time, work_date);
    const timeStr = this.formatTime(localTime);

    const baseInfo = `${job_title} for ${customer_name} on ${workDateStr} at ${timeStr}`;

    switch (reminderType) {
      case ReminderType.TWO_DAYS_BEFORE:
        return `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} in 2 days.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReplay HELP for help, STOP to opt out.`;

      case ReminderType.DAY_BEFORE:
        return `Hi ${associate_first_name}!\n\nReminder: You have ${baseInfo} tomorrow.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReplay HELP for help, STOP to opt out.`;

      case ReminderType.MORNING_OF:
        return `Good morning ${associate_first_name}!\n\nDon't forget your ${baseInfo} today.\n\nPlease confirm that you will be able to make it, if not please inform us ASAP!\n\nReply C to confirm or call us.\n\nReplay HELP for help, STOP to opt out.`;

      case ReminderType.HOUR_BEFORE:
        return `Hi ${associate_first_name}!\n\nYour ${baseInfo} starts in about an hour.\n\nHope you're ready!`;

      case ReminderType.FOLLOW_UP:
        return `Hi ${associate_first_name}!\n\nJust checking - are you on your way to ${baseInfo}?\n\nLet us know if you need anything!`;

      default:
        return `Hi ${associate_first_name}!\n\nReminder about your ${baseInfo}.`;
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
          last_reminder_time: new Date().toISOString(), // Changed from last_confirmation_time
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
    // Get assignment details from database
    // const assignment = await this.getAssignmentDetails(jobId, associateId);
    // return await this.sendReminderToAssociate(assignment, ReminderType.DAY_BEFORE);

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
    const [hours, minutes] = timeString.split(":").map(Number);

    // Create UTC datetime since timeString is UTC from database
    return new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
  }

  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send SMS notification (consolidated from NotificationService)
   */
  async sendSMSNotification(
    phoneNumber: string,
    messageBody: string
  ): Promise<SMSResult> {
    const smsMessage: SMSMessage = {
      to: phoneNumber,
      body: messageBody,
    };

    try {
      const smsResult: SMSResult = await sendSMS(smsMessage);
      return smsResult;
    } catch (error) {
      console.error("Error sending SMS:", error);
      throw new Error("Failed to send SMS.");
    }
  }
}
