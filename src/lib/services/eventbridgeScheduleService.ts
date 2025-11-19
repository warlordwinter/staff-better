import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { IEventBridgeScheduleService } from "./interfaces/IEventBridgeScheduleService";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // These should be set via environment variables or CloudFormation outputs
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
   * Create reminder schedules for a job assignment
   * Only creates schedules that don't already exist (deduplication)
   */
  async createReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string,
    maxNumReminders: number
  ): Promise<string[]> {
    const createdArns: string[] = [];

    // Always create DAY_BEFORE schedule (7 PM the day before)
    const dayBeforeArn = await this.createScheduleIfNotExists(
      jobId,
      workDate,
      startTime,
      "DAY_BEFORE"
    );
    if (dayBeforeArn) {
      createdArns.push(dayBeforeArn);
    }

    // Always create TWO_HOURS_BEFORE schedule (start_time - 2 hours)
    const twoHoursBeforeArn = await this.createScheduleIfNotExists(
      jobId,
      workDate,
      startTime,
      "TWO_HOURS_BEFORE"
    );
    if (twoHoursBeforeArn) {
      createdArns.push(twoHoursBeforeArn);
    }

    return createdArns;
  }

  /**
   * Create a schedule if it doesn't already exist
   * Returns the ARN if created, null if it already exists
   */
  private async createScheduleIfNotExists(
    jobId: string,
    workDate: string,
    startTime: string,
    reminderType: "DAY_BEFORE" | "TWO_HOURS_BEFORE"
  ): Promise<string | null> {
    // Check if schedule already exists in database
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("reminder_schedules")
      .select("schedule_arn")
      .eq("job_id", jobId)
      .eq("work_date", workDate)
      .eq("start_time", startTime)
      .eq("reminder_type", reminderType)
      .single();

    if (existing?.schedule_arn) {
      console.log(
        `Schedule already exists for ${jobId}/${workDate}/${startTime}/${reminderType}: ${existing.schedule_arn}`
      );
      return existing.schedule_arn;
    }

    // Calculate scheduled time
    const scheduledTime = this.calculateScheduledTime(
      workDate,
      startTime,
      reminderType
    );

    // Generate schedule name (sanitized)
    const scheduleName = this.generateScheduleName(
      jobId,
      workDate,
      startTime,
      reminderType
    );

    // Create payload for Lambda
    const payload = {
      job_id: jobId,
      work_date: workDate,
      start_time: startTime,
      reminder_type: reminderType,
    };

    try {
      // Create schedule in EventBridge
      const command = new CreateScheduleCommand({
        Name: scheduleName,
        GroupName: this.scheduleGroupName,
        ScheduleExpression: `at(${scheduledTime.toISOString()})`,
        FlexibleTimeWindow: {
          Mode: "OFF", // Exact time execution
        },
        Target: {
          Arn: this.lambdaArn,
          RoleArn: this.eventBridgeRoleArn,
          Input: JSON.stringify(payload),
        },
        Description: `Reminder schedule for job ${jobId}, ${reminderType}`,
      });

      const response = await this.schedulerClient.send(command);
      const scheduleArn = response.ScheduleArn;

      if (!scheduleArn) {
        throw new Error("Failed to get schedule ARN from EventBridge response");
      }

      // Store schedule ARN in database
      const { error: insertError } = await supabase
        .from("reminder_schedules")
        .insert({
          job_id: jobId,
          work_date: workDate,
          start_time: startTime,
          reminder_type: reminderType,
          schedule_arn: scheduleArn,
          scheduled_time: scheduledTime.toISOString(),
        });

      if (insertError) {
        console.error("Error storing schedule ARN in database:", insertError);
        // Try to delete the schedule from EventBridge
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
      // If schedule already exists in EventBridge (but not in our DB), try to get it
      if (
        error.name === "ConflictException" ||
        error.name === "ResourceAlreadyExistsException"
      ) {
        console.log(
          `Schedule ${scheduleName} already exists in EventBridge, fetching ARN`
        );
        try {
          const getCommand = new GetScheduleCommand({
            Name: scheduleName,
            GroupName: this.scheduleGroupName,
          });
          const getResponse = await this.schedulerClient.send(getCommand);
          const existingArn = getResponse.Arn;

          if (existingArn) {
            // Store in database
            await supabase.from("reminder_schedules").insert({
              job_id: jobId,
              work_date: workDate,
              start_time: startTime,
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

  /**
   * Calculate the scheduled time for a reminder
   */
  private calculateScheduledTime(
    workDate: string,
    startTime: string,
    reminderType: "DAY_BEFORE" | "TWO_HOURS_BEFORE"
  ): Date {
    const workDateObj = new Date(workDate + "T00:00:00Z");

    if (reminderType === "DAY_BEFORE") {
      // 7 PM (19:00) the day before work_date
      const dayBefore = new Date(workDateObj);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      dayBefore.setUTCHours(19, 0, 0, 0);
      return dayBefore;
    } else {
      // TWO_HOURS_BEFORE: start_time - 2 hours on work_date
      const [hours, minutes, seconds] = startTime.split(":").map(Number);
      const jobStartTime = new Date(workDateObj);
      jobStartTime.setUTCHours(hours, minutes || 0, seconds || 0, 0);

      const twoHoursBefore = new Date(jobStartTime);
      twoHoursBefore.setUTCHours(twoHoursBefore.getUTCHours() - 2);

      return twoHoursBefore;
    }
  }

  /**
   * Generate a sanitized schedule name
   */
  private generateScheduleName(
    jobId: string,
    workDate: string,
    startTime: string,
    reminderType: string
  ): string {
    // EventBridge schedule names must be alphanumeric, hyphens, and underscores
    // Max 64 characters
    const sanitized = `${jobId}-${workDate}-${startTime}-${reminderType}`
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 64);
    return `reminder-${sanitized}`;
  }

  /**
   * Delete reminder schedules for a job/date/time combination
   * Only deletes if no other assignments exist for the same combination
   */
  async deleteReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string
  ): Promise<void> {
    // Check if other assignments exist for the same job/date/time
    const supabase = createAdminClient();
    const { data: otherAssignments, error: checkError } = await supabase
      .from("job_assignments")
      .select("id")
      .eq("job_id", jobId)
      .eq("work_date", workDate)
      .eq("start_time", startTime)
      .limit(1);

    if (checkError) {
      console.error("Error checking for other assignments:", checkError);
      throw checkError;
    }

    // If other assignments exist, don't delete schedules
    if (otherAssignments && otherAssignments.length > 0) {
      console.log(
        `Other assignments exist for ${jobId}/${workDate}/${startTime}, not deleting schedules`
      );
      return;
    }

    // Get all schedules for this job/date/time
    const { data: schedules, error: fetchError } = await supabase
      .from("reminder_schedules")
      .select("schedule_arn, reminder_type")
      .eq("job_id", jobId)
      .eq("work_date", workDate)
      .eq("start_time", startTime);

    if (fetchError) {
      console.error("Error fetching schedules:", fetchError);
      throw fetchError;
    }

    if (!schedules || schedules.length === 0) {
      console.log(`No schedules found for ${jobId}/${workDate}/${startTime}`);
      return;
    }

    // Delete each schedule from EventBridge
    for (const schedule of schedules) {
      const scheduleName = this.generateScheduleName(
        jobId,
        workDate,
        startTime,
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
        // If schedule doesn't exist, that's okay
        if (error.name !== "ResourceNotFoundException") {
          console.error(`Error deleting schedule ${scheduleName}:`, error);
        }
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("reminder_schedules")
      .delete()
      .eq("job_id", jobId)
      .eq("work_date", workDate)
      .eq("start_time", startTime);

    if (deleteError) {
      console.error("Error deleting schedules from database:", deleteError);
      throw deleteError;
    }

    console.log(
      `Deleted ${schedules.length} schedules for ${jobId}/${workDate}/${startTime}`
    );
  }

  /**
   * Update reminder schedules when work_date or start_time changes
   */
  async updateReminderSchedules(
    jobId: string,
    oldWorkDate: string,
    oldStartTime: string,
    newWorkDate: string,
    newStartTime: string,
    maxNumReminders: number
  ): Promise<string[]> {
    // Delete old schedules
    await this.deleteReminderSchedules(jobId, oldWorkDate, oldStartTime);

    // Create new schedules
    return await this.createReminderSchedules(
      jobId,
      newWorkDate,
      newStartTime,
      maxNumReminders
    );
  }
}
