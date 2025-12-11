import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { IEventBridgeScheduleService } from "./interfaces/IEventBridgeScheduleService";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import { addDaysISO, localDateTimeToUTCDate } from "@/utils/timeServer";

/**
 * EventBridge Schedule Service
 * Manages EventBridge schedules for reminders
 * One schedule per (job_id, work_date, start_time, reminder_type) combination
 */
export class EventBridgeScheduleService implements IEventBridgeScheduleService {
  private schedulerClient: SchedulerClient;
  private lambdaArn: string;
  private eventBridgeRoleArn: string;
  private scheduleGroupName: string;

  constructor() {
    const region = process.env.AWS_REGION || "us-east-1";
    this.schedulerClient = new SchedulerClient({ region });

    this.lambdaArn = process.env.EVENTBRIDGE_LAMBDA_ARN || "";
    this.eventBridgeRoleArn = process.env.EVENTBRIDGE_ROLE_ARN || "";
    this.scheduleGroupName =
      process.env.EVENTBRIDGE_SCHEDULE_GROUP || "default";

    if (!this.lambdaArn || !this.eventBridgeRoleArn) {
      console.warn(
        "EventBridge Lambda ARN or Role ARN not configured. Schedule creation will fail."
      );
    }
  }

  /**
   * Normalize startTime for DB queries (HH:MM:SS)
   */
  private normalizeStartTime(startTime: string) {
    if (!startTime) return "";
    // Accepts HH:MM:SS or ISO string, returns HH:MM:SS
    if (startTime.includes("T")) {
      const timePart = startTime.split("T")[1].replace("Z", "").split(".")[0];
      // Ensure we have seconds (HH:MM -> HH:MM:00)
      if (timePart.split(":").length === 2) {
        return `${timePart}:00`;
      }
      return timePart;
    }
    // Ensure we have seconds if missing
    if (startTime.split(":").length === 2) {
      return `${startTime}:00`;
    }
    return startTime;
  }

  /**
   * Normalize workDate for DB queries (YYYY-MM-DD)
   */
  private normalizeWorkDate(workDate: string): string {
    // Accepts YYYY-MM-DD or ISO string, returns YYYY-MM-DD
    if (workDate.includes("T")) {
      return workDate.split("T")[0];
    }
    return workDate;
  }

  /**
   * Create reminder schedules for a job assignment
   */
  async createReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string,
    maxNumReminders: number,
    nightBeforeTime?: string | null,
    dayOfTime?: string | null
  ): Promise<string[]> {
    const createdArns: string[] = [];
    const normalizedWorkDate = this.normalizeWorkDate(workDate);
    const normalizedStartTime = this.normalizeStartTime(startTime);

    const dayBeforeArn = await this.createScheduleIfNotExists(
      jobId,
      normalizedWorkDate,
      normalizedStartTime,
      "DAY_BEFORE",
      nightBeforeTime
    );
    if (dayBeforeArn) createdArns.push(dayBeforeArn);

    const twoHoursBeforeArn = await this.createScheduleIfNotExists(
      jobId,
      normalizedWorkDate,
      normalizedStartTime,
      "TWO_HOURS_BEFORE",
      dayOfTime
    );
    if (twoHoursBeforeArn) createdArns.push(twoHoursBeforeArn);

    return createdArns;
  }

  private async createScheduleIfNotExists(
    jobId: string,
    workDate: string,
    startTime: string,
    reminderType: "DAY_BEFORE" | "TWO_HOURS_BEFORE",
    reminderTime?: string | null
  ): Promise<string | null> {
    const supabase = createAdminClient();
    const normalizedWorkDate = this.normalizeWorkDate(workDate);
    const normalizedStartTime = this.normalizeStartTime(startTime);

    // Check if schedule exists in DB
    const { data: existing } = await supabase
      .from("reminder_schedules")
      .select("schedule_arn")
      .eq("job_id", jobId)
      .eq("work_date", normalizedWorkDate)
      .eq("start_time", normalizedStartTime)
      .eq("reminder_type", reminderType)
      .single();

    if (existing?.schedule_arn) return existing.schedule_arn;

    let scheduledTime = this.calculateScheduledTime(
      normalizedWorkDate,
      normalizedStartTime,
      reminderType,
      reminderTime
    );

    // Round seconds to 00 for EventBridge compatibility
    scheduledTime.setUTCSeconds(0, 0);

    // Add 2-minute buffer to ensure EventBridge doesn't see it as "past"
    const now = new Date();
    const bufferMs = 2 * 60 * 1000; // 2 minutes
    const minScheduledTime = new Date(now.getTime() + bufferMs);

    // If the calculated time is too soon, adjust it to be at least 2 minutes in the future
    if (scheduledTime.getTime() <= minScheduledTime.getTime()) {
      scheduledTime = new Date(minScheduledTime);
      scheduledTime.setUTCSeconds(0, 0);
    }

    // Final check - if still in the past after adjustment, skip
    if (scheduledTime.getTime() <= now.getTime() + bufferMs) {
      console.warn(
        `Skipping schedule creation for ${reminderType} reminder: scheduled time ${scheduledTime.toISOString()} is in the past or too soon (current time: ${now.toISOString()})`
      );
      return null;
    }

    const scheduleName = this.generateScheduleName(
      jobId,
      normalizedWorkDate,
      normalizedStartTime,
      reminderType
    );
    const payload = {
      job_id: jobId,
      work_date: normalizedWorkDate,
      start_time: normalizedStartTime,
      reminder_type: reminderType,
    };

    // Format for EventBridge: at() expression requires format: at(yyyy-mm-ddThh:mm:ss)
    // EventBridge assumes UTC by default, so we don't include the Z suffix
    // Remove milliseconds and Z timezone indicator
    const isoString = scheduledTime.toISOString().replace(/\.\d{3}Z$/, "");
    const scheduleExpression = `at(${isoString})`;

    // Log the exact expression being sent for debugging
    console.log("Creating schedule with payload:", {
      Name: scheduleName,
      GroupName: this.scheduleGroupName,
      ScheduleExpression: scheduleExpression,
      LambdaArn: this.lambdaArn,
      RoleArn: this.eventBridgeRoleArn,
      Description: `Reminder schedule for job ${jobId}, ${reminderType}`,
      Payload: payload,
      ScheduledTimeISO: isoString,
      ScheduledTimeUTC: scheduledTime.toISOString(),
      CurrentTimeUTC: now.toISOString(),
      TimeDifferenceMs: scheduledTime.getTime() - now.getTime(),
    });

    try {
      const command = new CreateScheduleCommand({
        Name: scheduleName,
        GroupName: this.scheduleGroupName,
        ScheduleExpression: scheduleExpression,
        FlexibleTimeWindow: { Mode: "OFF" },
        ActionAfterCompletion: "DELETE",
        Target: {
          Arn: this.lambdaArn,
          RoleArn: this.eventBridgeRoleArn,
          Input: JSON.stringify(payload),
        },
        Description: `Reminder schedule for job ${jobId}, ${reminderType}`,
      });

      const response = await this.schedulerClient.send(command);
      const scheduleArn = response.ScheduleArn;
      if (!scheduleArn)
        throw new Error("Failed to get schedule ARN from EventBridge response");

      const { error: insertError } = await supabase
        .from("reminder_schedules")
        .insert({
          job_id: jobId,
          work_date: normalizedWorkDate,
          start_time: normalizedStartTime,
          reminder_type: reminderType,
          schedule_arn: scheduleArn,
          scheduled_time: scheduledTime.toISOString(),
        });

      if (insertError) {
        console.error("Error storing schedule ARN in DB:", insertError);
        try {
          await this.schedulerClient.send(
            new DeleteScheduleCommand({
              Name: scheduleName,
              GroupName: this.scheduleGroupName,
            })
          );
        } catch (deleteError) {
          console.error("Error cleaning up schedule:", deleteError);
        }
        throw new Error(`Failed to store schedule ARN: ${insertError.message}`);
      }

      console.log(`Created schedule ${scheduleName} with ARN ${scheduleArn}`);
      return scheduleArn;
    } catch (error: any) {
      if (
        error.name === "ValidationException" ||
        (error.message &&
          typeof error.message === "string" &&
          (error.message.includes("Invalid Schedule Expression") ||
            error.message.includes("past")))
      ) {
        console.warn(
          `Skipping schedule creation for ${reminderType}: ${error.message}`
        );
        return null;
      }

      if (
        error.name === "ConflictException" ||
        error.name === "ResourceAlreadyExistsException"
      ) {
        try {
          const getResponse = await this.schedulerClient.send(
            new GetScheduleCommand({
              Name: scheduleName,
              GroupName: this.scheduleGroupName,
            })
          );
          const existingArn = getResponse.Arn;
          if (existingArn) {
            await supabase.from("reminder_schedules").insert({
              job_id: jobId,
              work_date: normalizedWorkDate,
              start_time: normalizedStartTime,
              reminder_type: reminderType,
              schedule_arn: existingArn,
              scheduled_time: scheduledTime.toISOString(),
            });
            return existingArn;
          }
        } catch (getError) {
          console.error("Error fetching existing schedule:", getError);
        }
      }

      console.error(`Error creating schedule ${scheduleName}:`, error);
      throw error;
    }
  }

  private calculateScheduledTime(
    workDate: string,
    startTime: string,
    reminderType: "DAY_BEFORE" | "TWO_HOURS_BEFORE",
    reminderTime?: string | null
  ): Date {
    // Ensure workDate is in YYYY-MM-DD format (extract date portion if it's a full timestamp)
    const dateOnly = workDate.split("T")[0];
    const workDateObj = new Date(dateOnly + "T00:00:00Z");

    if (reminderType === "DAY_BEFORE") {
      const dayBeforeIso = addDaysISO(workDate, -1);
      // Use custom reminder time if provided, otherwise default to 19:00:00
      const timeToUse = reminderTime || "19:00:00";
      // Ensure time has seconds if missing (HH:MM -> HH:MM:00)
      const timeWithSeconds =
        timeToUse.split(":").length === 2 ? `${timeToUse}:00` : timeToUse;
      return localDateTimeToUTCDate(dayBeforeIso, timeWithSeconds);
    }

    // TWO_HOURS_BEFORE: Use custom reminder time if provided, otherwise calculate as start_time - 2 hours
    if (reminderTime) {
      // Use the custom day_of_time
      const timeWithSeconds =
        reminderTime.split(":").length === 2
          ? `${reminderTime}:00`
          : reminderTime;
      return localDateTimeToUTCDate(workDate, timeWithSeconds);
    }

    // Default: start_time - 2 hours on work_date
    const [hours, minutes, seconds] = startTime.split(":").map(Number);
    const jobStartTime = new Date(workDateObj);
    jobStartTime.setUTCHours(hours, minutes || 0, seconds || 0, 0);
    const twoHoursBefore = new Date(jobStartTime);
    twoHoursBefore.setUTCHours(twoHoursBefore.getUTCHours() - 2);
    return twoHoursBefore;
  }

  private generateScheduleName(
    jobId: string,
    workDate: string,
    startTime: string,
    reminderType: string
  ): string {
    const prefix = "reminder-";
    const maxHashLength = 64 - prefix.length;
    const uniqueString = `${jobId}-${workDate}-${startTime}-${reminderType}`;
    const hash = createHash("sha256")
      .update(uniqueString)
      .digest("hex")
      .substring(0, maxHashLength);
    return `${prefix}${hash}`;
  }

  async deleteReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string
  ): Promise<void> {
    const supabase = createAdminClient();
    const normalizedWorkDate = this.normalizeWorkDate(workDate);
    const normalizedStartTime = this.normalizeStartTime(startTime);

    // Ensure normalizedStartTime has seconds (HH:MM -> HH:MM:00)
    let timeWithSeconds = normalizedStartTime;
    if (timeWithSeconds && timeWithSeconds.split(":").length === 2) {
      timeWithSeconds = `${timeWithSeconds}:00`;
    }

    // For job_assignments, start_time is TIMESTAMPTZ, so we need to construct a full timestamp
    // Use normalized values to ensure consistency
    if (!normalizedWorkDate || !timeWithSeconds) {
      console.warn(
        `Cannot delete schedules: missing workDate (${normalizedWorkDate}) or startTime (${timeWithSeconds})`
      );
      return;
    }

    // Validate time format (should be HH:MM:SS)
    const timePattern = /^\d{2}:\d{2}:\d{2}$/;
    if (!timePattern.test(timeWithSeconds)) {
      console.warn(
        `Cannot delete schedules: invalid time format (${timeWithSeconds}). Expected HH:MM:SS`
      );
      return;
    }

    let timestampForJobAssignments: string;
    try {
      const dateObj = new Date(`${normalizedWorkDate}T${timeWithSeconds}Z`);
      if (isNaN(dateObj.getTime())) {
        console.warn(
          `Cannot delete schedules: invalid date/time combination (${normalizedWorkDate}T${timeWithSeconds}Z)`
        );
        return;
      }
      timestampForJobAssignments = dateObj.toISOString();
    } catch (error) {
      console.error(
        `Error constructing timestamp for job assignments:`,
        error,
        `workDate: ${normalizedWorkDate}, startTime: ${timeWithSeconds}`
      );
      return;
    }

    // Query job_assignments using the normalized work_date (YYYY-MM-DD) and constructed timestamp
    // Note: work_date in job_assignments might be stored as DATE or TIMESTAMPTZ, so we use a range query
    const startOfDay = `${normalizedWorkDate}T00:00:00.000Z`;
    const endOfDay = `${normalizedWorkDate}T23:59:59.999Z`;

    const { data: otherAssignments, error: checkError } = await supabase
      .from("job_assignments")
      .select("job_id")
      .eq("job_id", jobId)
      .gte("work_date", startOfDay)
      .lte("work_date", endOfDay)
      .eq("start_time", timestampForJobAssignments)
      .limit(1);

    if (checkError) throw checkError;
    if (otherAssignments && otherAssignments.length > 0) return;

    // Query reminder_schedules using normalized values
    const { data: schedules, error: fetchError } = await supabase
      .from("reminder_schedules")
      .select("schedule_arn, reminder_type")
      .eq("job_id", jobId)
      .eq("work_date", normalizedWorkDate)
      .eq("start_time", normalizedStartTime);

    if (fetchError) throw fetchError;
    if (!schedules || schedules.length === 0) return;

    for (const schedule of schedules) {
      const scheduleName = this.generateScheduleName(
        jobId,
        normalizedWorkDate,
        normalizedStartTime,
        schedule.reminder_type
      );
      try {
        await this.schedulerClient.send(
          new DeleteScheduleCommand({
            Name: scheduleName,
            GroupName: this.scheduleGroupName,
          })
        );
        console.log(`Deleted schedule ${scheduleName}`);
      } catch (error: any) {
        if (error.name !== "ResourceNotFoundException")
          console.error(`Error deleting schedule ${scheduleName}:`, error);
      }
    }

    const { error: deleteError } = await supabase
      .from("reminder_schedules")
      .delete()
      .eq("job_id", jobId)
      .eq("work_date", normalizedWorkDate)
      .eq("start_time", normalizedStartTime);

    if (deleteError) throw deleteError;
    console.log(
      `Deleted ${schedules.length} schedules for ${jobId}/${normalizedWorkDate}/${normalizedStartTime}`
    );
  }

  async updateReminderSchedules(
    jobId: string,
    oldWorkDate: string,
    oldStartTime: string,
    newWorkDate: string,
    newStartTime: string,
    maxNumReminders: number,
    nightBeforeTime?: string | null,
    dayOfTime?: string | null
  ): Promise<string[]> {
    // Normalize all values to ensure consistency
    const normalizedOldWorkDate = this.normalizeWorkDate(oldWorkDate);
    const normalizedOldStartTime = this.normalizeStartTime(oldStartTime);
    const normalizedNewWorkDate = this.normalizeWorkDate(newWorkDate);
    const normalizedNewStartTime = this.normalizeStartTime(newStartTime);

    // Create new schedules first, then delete old ones
    const newSchedules = await this.createReminderSchedules(
      jobId,
      normalizedNewWorkDate,
      normalizedNewStartTime,
      maxNumReminders,
      nightBeforeTime,
      dayOfTime
    );
    await this.deleteReminderSchedules(
      jobId,
      normalizedOldWorkDate,
      normalizedOldStartTime
    );
    return newSchedules;
  }
}
