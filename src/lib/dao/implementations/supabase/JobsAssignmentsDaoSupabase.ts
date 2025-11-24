import { createClient } from "../../../supabase/server";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { IJobAssignments } from "../../interfaces/IJobAssignments";
import { localDateTimeToUTCISO } from "@/utils/timeServer";

export class JobsAssignmentsDaoSupabase implements IJobAssignments {
  private extractHour(value: string | null): number | null {
    if (!value) return null;
    // Case 1: HH:mm
    const hhmm = value.match(/^(\d{1,2}):(\d{2})/);
    if (hhmm) {
      const h = parseInt(hhmm[1], 10);
      return isNaN(h) ? null : h;
    }
    // Case 2: ISO or date-like
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.getHours();
    }
    return null;
  }

  private isWithinAllowedHours(value: string | null): boolean {
    const hour = this.extractHour(value);
    if (hour === null) return false;
    return hour >= 8 && hour <= 23;
  }

  /**
   * Extract time portion (HH:MM:SS) from a timestamp string
   * Handles both full ISO timestamps and time-only strings
   */
  private extractTimeFromTimestamp(timestamp: string): string {
    if (!timestamp) return "";

    // If it's already in HH:MM:SS format, return as is
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp)) {
      return timestamp.length === 5 ? `${timestamp}:00` : timestamp;
    }

    // Try to parse as Date and extract time
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      const seconds = date.getUTCSeconds().toString().padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    }

    // If parsing fails, try to extract time from string
    const timeMatch = timestamp.match(/(\d{1,2}):(\d{2})(:(\d{2}))?/);
    if (timeMatch) {
      return timeMatch[0];
    }

    return timestamp;
  }

  private normalizeWorkDateValue(workDate: string | null | undefined) {
    if (!workDate || !workDate.trim()) return null;
    const trimmed = workDate.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      console.warn(
        `work_date contains time-only value "${workDate}", setting to null`
      );
      return null;
    }
    const parsedDate = new Date(trimmed);
    if (isNaN(parsedDate.getTime())) {
      console.warn(`Invalid work_date value "${workDate}", setting to null`);
      return null;
    }
    return parsedDate.toISOString().split("T")[0];
  }

  private normalizeStartTimeValue(
    startTime: string | null | undefined,
    normalizedWorkDate: string | null
  ): string | null {
    if (!startTime || (typeof startTime === "string" && !startTime.trim())) {
      return null;
    }
    const trimmed = startTime.trim();
    const addSeconds = (value: string) =>
      value.split(":").length === 2 ? `${value}:00` : value;

    const timeOnlyRegex = /^\d{1,2}:\d{2}(?::\d{2})?$/;
    if (timeOnlyRegex.test(trimmed)) {
      if (!normalizedWorkDate) {
        console.warn(
          `Cannot apply timezone conversion for start_time "${startTime}" without work_date`
        );
        return null;
      }
      try {
        return localDateTimeToUTCISO(normalizedWorkDate, addSeconds(trimmed));
      } catch (error) {
        console.warn(
          `Failed to normalize start_time "${startTime}" with work_date "${normalizedWorkDate}":`,
          error
        );
        return null;
      }
    }

    const localDateTimeRegex =
      /^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}(?::\d{2})?$/;
    if (localDateTimeRegex.test(trimmed)) {
      const [datePartRaw, timePartRaw] = trimmed.replace("T", " ").split(" ");
      try {
        return localDateTimeToUTCISO(datePartRaw, addSeconds(timePartRaw));
      } catch (error) {
        console.warn(
          `Failed to normalize start_time "${startTime}" interpreted as local datetime:`,
          error
        );
        return null;
      }
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      console.warn(`Invalid start_time value "${startTime}", setting to null`);
      return null;
    }
    return parsed.toISOString();
  }
  async insertJobsAssignments(
    jobsAssignments: {
      job_id: string;
      associate_id: string;
      confirmation_status:
        | "CONFIRMED"
        | "UNCONFIRMED"
        | "DECLINED";
      work_date: string | null;
      start_time: string | null;
      num_reminders?: number;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Job Assignment Creation: ", jobsAssignments);

    // Format and validate the job assignments data
    const formattedAssignments = jobsAssignments
      .filter((assignment) => {
        // Validate that start_time is not empty or null
        if (
          !assignment.start_time ||
          (typeof assignment.start_time === "string" &&
            !assignment.start_time.trim())
        ) {
          console.warn(
            "start_time cannot be empty or null - skipping assignment"
          );
          return false; // Skip this assignment
        }
        return true;
      })
      .map((assignment) => {
        const formattedWorkDate = this.normalizeWorkDateValue(
          assignment.work_date
        );
        if (!formattedWorkDate) {
          const jobLabel = assignment.job_id
            ? ` for job ${assignment.job_id}`
            : "";
          throw new Error(
            `Work date is required${jobLabel} before assigning associates. Please set a shift date and try again.`
          );
        }
        const formattedStartTime = this.normalizeStartTimeValue(
          assignment.start_time,
          formattedWorkDate
        );

        return {
          ...assignment,
          work_date: formattedWorkDate,
          start_time: formattedStartTime,
          num_reminders: assignment.num_reminders || 0,
        };
      });

    console.log(
      "Formatted job assignments:",
      JSON.stringify(formattedAssignments, null, 2)
    );

    // Use the correct table name (lowercase in Supabase by default)
    const { data, error } = await supabase
      .from("job_assignments")
      .insert(formattedAssignments)
      .select();

    if (error) {
      console.error("Error in JobAssignmentsDao:", error);
      console.error(
        "Data that caused the error:",
        JSON.stringify(formattedAssignments, null, 2)
      );
      throw new Error(JSON.stringify(error));
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));
  }

  async getJobAssignmentsByJobId(jobId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
        *,
        associates!inner (
          id,
          first_name,
          last_name,
          phone_number,
          email_address
        )
      `
      )
      .eq("job_id", jobId);

    if (error) {
      console.error("Error fetching job assignments:", error);
      throw new Error(JSON.stringify(error));
    }

    // Handle empty array case (new jobs have no assignments yet)
    if (!data || data.length === 0) {
      console.log(`No job assignments found for job ID: ${jobId}`);
      return [];
    }

    console.log(`Found ${data.length} job assignment(s) for job ID: ${jobId}`);
    console.log("Raw data from Supabase:", JSON.stringify(data, null, 2));

    // Format work_date to return only the date portion (YYYY-MM-DD)
    const formatted = data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));

    console.log("Formatted data:", JSON.stringify(formatted, null, 2));

    return formatted;
  }

  async insertSingleJobAssignment(
    jobId: string,
    assignmentData: {
      associate_id: string;
      confirmation_status?:
        | "CONFIRMED"
        | "UNCONFIRMED"
        | "DECLINED";
      work_date: string | null;
      start_time: string | null;
      num_reminders?: number;
    }
  ) {
    const supabase = await createClient();

    const formattedWorkDate = this.normalizeWorkDateValue(
      assignmentData.work_date
    );
    if (!formattedWorkDate) {
      throw new Error(
        "Work date is required to assign associates. Please update the reminder’s shift date."
      );
    }
    const formattedStartTime = this.normalizeStartTimeValue(
      assignmentData.start_time,
      formattedWorkDate
    );

    const insertData = {
      job_id: jobId,
      associate_id: assignmentData.associate_id,
      confirmation_status: assignmentData.confirmation_status || "UNCONFIRMED",
      work_date: formattedWorkDate,
      start_time: formattedStartTime,
      num_reminders: assignmentData.num_reminders || 3,
    };

    // Log the data being inserted for debugging
    console.log(
      "Inserting job assignment data:",
      JSON.stringify(insertData, null, 2)
    );

    const { data, error } = await supabase
      .from("job_assignments")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Error creating job assignment:", error);
      console.error(
        "Data that caused the error:",
        JSON.stringify(insertData, null, 2)
      );
      throw new Error(JSON.stringify(error));
    }

    // Create EventBridge schedules if work_date and start_time are provided
    if (formattedWorkDate && formattedStartTime) {
      try {
        // Extract time portion from start_time (might be full timestamp)
        const timePortion = this.extractTimeFromTimestamp(formattedStartTime);
        const eventBridgeService = new (
          await import("@/lib/services/eventbridgeScheduleService")
        ).EventBridgeScheduleService();

        // Fetch job reminder times
        const { data: jobData } = await supabase
          .from("jobs")
          .select("night_before_time, day_of_time")
          .eq("id", jobId)
          .single();

        const createdArns = await eventBridgeService.createReminderSchedules(
          jobId,
          formattedWorkDate,
          timePortion,
          insertData.num_reminders || 2,
          jobData?.night_before_time || null,
          jobData?.day_of_time || null
        );
        if (createdArns.length > 0) {
          console.log(
            `Created ${createdArns.length} EventBridge schedule(s) for job ${jobId}, date ${formattedWorkDate}, time ${timePortion}`
          );
        } else {
          console.log(
            `No EventBridge schedules created for job ${jobId}, date ${formattedWorkDate}, time ${timePortion} (all reminders were in the past or already exist)`
          );
        }
      } catch (scheduleError) {
        // Log error but don't fail the assignment creation
        console.error(
          "Error creating EventBridge schedules (assignment still created):",
          scheduleError
        );
      }
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));
  }

  async updateJobAssignment(
    jobId: string,
    associateId: string,
    updates: {
      confirmation_status?: ConfirmationStatus;
      work_date?: string;
      start_time?: string;
      num_reminders?: number;
      last_reminder_time?: string;
      last_confirmation_time?: string;
    }
  ) {
    const supabase = await createClient();
    console.log("Job Assignment jobid:", jobId);
    console.log("Job Assignment AssociateId:", associateId);
    console.log("Job Assignment updates:", updates);

    // Get current assignment to check if work_date or start_time are changing
    const { data: currentAssignment } = await supabase
      .from("job_assignments")
      .select("work_date, start_time, num_reminders")
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .single();

    const oldWorkDate = currentAssignment?.work_date
      ? currentAssignment.work_date.split("T")[0]
      : null;
    const oldStartTime = currentAssignment?.start_time
      ? this.extractTimeFromTimestamp(currentAssignment.start_time)
      : null;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== "")
    );

    if (cleanedUpdates.work_date) {
      const normalizedWorkDate = this.normalizeWorkDateValue(
        cleanedUpdates.work_date as string
      );
      if (normalizedWorkDate) {
        cleanedUpdates.work_date = normalizedWorkDate;
      } else {
        delete cleanedUpdates.work_date;
      }
    }

    if (cleanedUpdates.start_time) {
      const normalizedStart = this.normalizeStartTimeValue(
        cleanedUpdates.start_time as string,
        (cleanedUpdates.work_date as string) || oldWorkDate
      );
      if (normalizedStart) {
        cleanedUpdates.start_time = normalizedStart;
      } else {
        delete cleanedUpdates.start_time;
      }
    }

    console.log("Processed updates:", cleanedUpdates);
    console.log("About to update job_assignments with:", {
      job_id: jobId,
      associate_id: associateId,
      updates: cleanedUpdates,
    });

    const { data, error } = await supabase
      .from("job_assignments")
      .update(cleanedUpdates)
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .select();

    console.log("Supabase update result:", { data, error });

    if (error) {
      console.error("Error updating job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    // Update EventBridge schedules if work_date or start_time changed
    const newWorkDate = cleanedUpdates.work_date
      ? (cleanedUpdates.work_date as string).split("T")[0]
      : oldWorkDate;
    const newStartTime = cleanedUpdates.start_time
      ? this.extractTimeFromTimestamp(cleanedUpdates.start_time as string)
      : oldStartTime;

    // Determine if we need to create, update, or delete schedules
    const hasOldValues = oldWorkDate && oldStartTime;
    const hasNewValues = newWorkDate && newStartTime;
    const valuesChanged =
      hasOldValues &&
      hasNewValues &&
      (oldWorkDate !== newWorkDate || oldStartTime !== newStartTime);

    if (hasNewValues && !hasOldValues) {
      // Case 1: Creating schedules for the first time (assignment didn't have work_date/start_time before)
      try {
        const eventBridgeService = new (
          await import("@/lib/services/eventbridgeScheduleService")
        ).EventBridgeScheduleService();

        // Fetch job reminder times
        const { data: jobData } = await supabase
          .from("jobs")
          .select("night_before_time, day_of_time")
          .eq("id", jobId)
          .single();

        const createdArns = await eventBridgeService.createReminderSchedules(
          jobId,
          newWorkDate,
          newStartTime,
          currentAssignment?.num_reminders || 2,
          jobData?.night_before_time || null,
          jobData?.day_of_time || null
        );
        if (createdArns.length > 0) {
          console.log(
            `Created ${createdArns.length} EventBridge schedule(s) for job ${jobId}, date ${newWorkDate}, time ${newStartTime}`
          );
        } else {
          console.log(
            `No EventBridge schedules created for job ${jobId}, date ${newWorkDate}, time ${newStartTime} (all reminders were in the past or already exist)`
          );
        }
      } catch (scheduleError) {
        // Log error but don't fail the assignment update
        console.error(
          "Error creating EventBridge schedules (assignment still updated):",
          scheduleError
        );
      }
    } else if (valuesChanged) {
      // Case 2: Updating existing schedules (both old and new values exist and are different)
      try {
        const eventBridgeService = new (
          await import("@/lib/services/eventbridgeScheduleService")
        ).EventBridgeScheduleService();

        // Fetch job reminder times
        const { data: jobData } = await supabase
          .from("jobs")
          .select("night_before_time, day_of_time")
          .eq("id", jobId)
          .single();

        await eventBridgeService.updateReminderSchedules(
          jobId,
          oldWorkDate!,
          oldStartTime!,
          newWorkDate,
          newStartTime,
          currentAssignment?.num_reminders || 2,
          jobData?.night_before_time || null,
          jobData?.day_of_time || null
        );
        console.log(
          `Updated EventBridge schedules for job ${jobId} from ${oldWorkDate}/${oldStartTime} to ${newWorkDate}/${newStartTime}`
        );
      } catch (scheduleError) {
        // Log error but don't fail the assignment update
        console.error(
          "Error updating EventBridge schedules (assignment still updated):",
          scheduleError
        );
      }
    } else if (hasOldValues && !hasNewValues) {
      // Case 3: Deleting schedules (old values existed but new values don't)
      try {
        const eventBridgeService = new (
          await import("@/lib/services/eventbridgeScheduleService")
        ).EventBridgeScheduleService();

        await eventBridgeService.deleteReminderSchedules(
          jobId,
          oldWorkDate!,
          oldStartTime!
        );
        console.log(
          `Deleted EventBridge schedules for job ${jobId}, date ${oldWorkDate}, time ${oldStartTime}`
        );
      } catch (scheduleError) {
        // Log error but don't fail the assignment update
        console.error(
          "Error deleting EventBridge schedules (assignment still updated):",
          scheduleError
        );
      }
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));
  }

  async deleteJobAssignment(jobId: string, associateId: string) {
    const supabase = await createClient();

    // Get assignment details before deleting (for schedule cleanup)
    const { data: assignment } = await supabase
      .from("job_assignments")
      .select("work_date, start_time")
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .single();

    const { error } = await supabase
      .from("job_assignments")
      .delete()
      .eq("job_id", jobId)
      .eq("associate_id", associateId);

    if (error) {
      console.error("Error deleting job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    // Delete EventBridge schedules if work_date and start_time were set
    if (assignment?.work_date && assignment?.start_time) {
      try {
        const workDate = assignment.work_date.split("T")[0];
        const startTime = this.extractTimeFromTimestamp(assignment.start_time);
        const eventBridgeService = new (
          await import("@/lib/services/eventbridgeScheduleService")
        ).EventBridgeScheduleService();

        await eventBridgeService.deleteReminderSchedules(
          jobId,
          workDate,
          startTime
        );
        console.log(
          `Deleted EventBridge schedules for job ${jobId}, date ${workDate}, time ${startTime}`
        );
      } catch (scheduleError) {
        // Log error but don't fail the deletion
        console.error(
          "Error deleting EventBridge schedules (assignment still deleted):",
          scheduleError
        );
      }
    }

    return { success: true };
  }

  async getNumberOfReminders(jobId: string, associateId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select("num_reminders")
      .eq("job_id", jobId)
      .eq("associate_id", associateId);

    if (error) {
      console.error("Error grabbing number of reminders remaining:", error);
      throw new Error(JSON.stringify(error));
    }

    if (data && data.length > 0) {
      return data[0].num_reminders;
    }

    return 0;
  }

  async getJobAssignment(jobId: string, associateId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select("*")
      .eq("job_id", jobId)
      .eq("associate_id", associateId);

    if (error) {
      console.error("Error grabbing job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    const assignment = data?.[0];
    if (assignment) {
      // Format work_date to return only the date portion (YYYY-MM-DD)
      return {
        ...assignment,
        work_date: assignment.work_date
          ? assignment.work_date.split("T")[0]
          : null,
      };
    }

    return null;
  }

  /**
   * This method gets all the job assignments that still need reminders
   *
   * @returns jobassignment with needed reminders to be sent
   */
  async getAssignmentsNeedingReminders() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select("*")
      .gt("num_reminders", 0)
      .neq("confirmation_status", "CONFIRMED");

    if (error) {
      console.error(
        "Error fetching job assignments that need reminders:",
        error
      );
      throw new Error(JSON.stringify(error));
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));
  }

  async getActiveAssignmentsFromDatabase(
    todayString: string,
    daysFromNow: string,
    associateId: string
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        "job_id, associate_id, work_date, start_time, confirmation_status"
      )
      .eq("associate_id", associateId)
      .gte("work_date", todayString)
      .lte("work_date", daysFromNow)
      .neq("confirmation_status", "DECLINED")
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching active assignment:", error);
      throw new Error(`Failed to fetch active assignments: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log(`No active assignments found for associate: ${associateId}`);
      return [];
    }

    // Transform the data to match JobAssignment interface
    return data.map((assignment) => ({
      job_id: assignment.job_id,
      associate_id: assignment.associate_id,
      confirmation_status: assignment.confirmation_status,
      last_activity_time: new Date().toISOString(), // Default to current time
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null, // Format to YYYY-MM-DD
      start_time: assignment.start_time,
      num_reminders: 3, // Default value
    }));
  }
}
