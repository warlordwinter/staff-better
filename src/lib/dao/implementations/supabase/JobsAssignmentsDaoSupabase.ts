import { createClient } from "../../../supabase/server";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { IJobAssignments } from "../../interfaces/IJobAssignments";

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
  async insertJobsAssignments(
    jobsAssignments: {
      job_id: string;
      associate_id: string;
      confirmation_status:
        | "UNCONFIRMED"
        | "SOFT_CONFIRMED"
        | "LIKELY_CONFIRMED"
        | "CONFIRMED"
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
        // Validate and format the start_time field
        let formattedStartTime = assignment.start_time;

        if (formattedStartTime && formattedStartTime.trim()) {
          // Check if it's a time value (like "14:00") and format it properly
          if (/^\d{1,2}:\d{2}$/.test(formattedStartTime.trim())) {
            // If it's just a time, we need to combine it with a date
            // For now, we'll use today's date as the base
            const today = new Date();
            const dateStr = today.toISOString().split("T")[0];
            formattedStartTime = `${dateStr} ${formattedStartTime}:00`;
            console.log(
              `Formatted start_time: "${assignment.start_time}" -> "${formattedStartTime}"`
            );
          } else {
            // Try to parse as a full timestamp
            const date = new Date(formattedStartTime);
            if (isNaN(date.getTime())) {
              console.warn(
                `Invalid start_time value "${formattedStartTime}", setting to null`
              );
              formattedStartTime = null;
            } else {
              formattedStartTime = date.toISOString();
            }
          }
        }

        // Validate and format the work_date field
        let formattedWorkDate = assignment.work_date;
        if (formattedWorkDate && formattedWorkDate.trim()) {
          // Check if it's a time value (like "14:00") and convert to null
          if (/^\d{1,2}:\d{2}$/.test(formattedWorkDate.trim())) {
            console.warn(
              `work_date contains time value "${formattedWorkDate}", setting to null`
            );
            formattedWorkDate = null;
          } else {
            // Try to parse as a date
            const date = new Date(formattedWorkDate);
            if (isNaN(date.getTime())) {
              console.warn(
                `Invalid work_date value "${formattedWorkDate}", setting to null`
              );
              formattedWorkDate = null;
            } else {
              // Format as ISO date string
              formattedWorkDate = date.toISOString().split("T")[0];
            }
          }
        }

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
        | "UNCONFIRMED"
        | "SOFT_CONFIRMED"
        | "LIKELY_CONFIRMED"
        | "CONFIRMED"
        | "DECLINED";
      work_date: string | null;
      start_time: string | null;
      num_reminders?: number;
    }
  ) {
    const supabase = await createClient();

    // Validate and format the start_time field
    let formattedStartTime = assignmentData.start_time;

    // start_time is optional - only validate if provided
    if (formattedStartTime && formattedStartTime.trim()) {
      // Check if it's a time value (like "14:00") and format it properly
      if (/^\d{1,2}:\d{2}$/.test(formattedStartTime.trim())) {
        // If it's just a time, we need to combine it with a date
        // Use work_date if available, otherwise use today's date
        const dateToUse = assignmentData.work_date
          ? assignmentData.work_date.split("T")[0] // Extract date portion if it's a full timestamp
          : new Date().toISOString().split("T")[0];
        formattedStartTime = `${dateToUse} ${formattedStartTime}:00`;
        console.log(
          `Formatted start_time: "${assignmentData.start_time}" -> "${formattedStartTime}" (using date: ${dateToUse})`
        );
      } else {
        // Try to parse as a full timestamp
        const date = new Date(formattedStartTime);
        if (isNaN(date.getTime())) {
          console.warn(
            `Invalid start_time value "${formattedStartTime}", setting to null`
          );
          formattedStartTime = null;
        } else {
          formattedStartTime = date.toISOString();
        }
      }
    }

    // Validate and format the work_date field
    let formattedWorkDate = assignmentData.work_date;
    if (formattedWorkDate && formattedWorkDate.trim()) {
      // Check if it's a time value (like "14:00") and convert to null
      if (/^\d{1,2}:\d{2}$/.test(formattedWorkDate.trim())) {
        console.warn(
          `work_date contains time value "${formattedWorkDate}", setting to null`
        );
        formattedWorkDate = null;
      } else {
        // Try to parse as a date
        const date = new Date(formattedWorkDate);
        if (isNaN(date.getTime())) {
          console.warn(
            `Invalid work_date value "${formattedWorkDate}", setting to null`
          );
          formattedWorkDate = null;
        } else {
          // Format as ISO date string
          formattedWorkDate = date.toISOString().split("T")[0];
        }
      }
    }

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

        const createdArns = await eventBridgeService.createReminderSchedules(
          jobId,
          formattedWorkDate,
          timePortion,
          insertData.num_reminders || 2
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

    // Process start_time if it's being updated
    if (cleanedUpdates.start_time) {
      let formattedStartTime = cleanedUpdates.start_time;

      // Validate that start_time is not empty or null
      if (
        !formattedStartTime ||
        (typeof formattedStartTime === "string" && !formattedStartTime.trim())
      ) {
        console.warn(
          "start_time cannot be empty or null - removing from update"
        );
        delete cleanedUpdates.start_time;
      } else if (
        formattedStartTime &&
        typeof formattedStartTime === "string" &&
        formattedStartTime.trim()
      ) {
        // Check if it's a time value (like "14:00") and format it properly
        if (/^\d{1,2}:\d{2}$/.test(formattedStartTime.trim())) {
          // If it's just a time, we need to combine it with a date
          // Use the work_date if available (extract date portion if it's a full timestamp), otherwise use today's date
          const workDate =
            cleanedUpdates.work_date &&
            typeof cleanedUpdates.work_date === "string"
              ? cleanedUpdates.work_date.split("T")[0] // Extract date portion if it's a full timestamp
              : oldWorkDate || new Date().toISOString().split("T")[0];
          formattedStartTime = `${workDate} ${formattedStartTime}:00`;
          console.log(
            `Formatted start_time: "${cleanedUpdates.start_time}" -> "${formattedStartTime}" (using work_date: ${workDate})`
          );
          // Assign the formatted time back to cleanedUpdates
          cleanedUpdates.start_time = formattedStartTime;
        } else {
          // Try to parse as a full timestamp
          const date = new Date(formattedStartTime);
          if (isNaN(date.getTime())) {
            console.warn(
              `Invalid start_time value "${formattedStartTime}", keeping original value`
            );
            // Don't delete or modify - keep the original value
          } else {
            formattedStartTime = date.toISOString();
            // Assign the formatted time back to cleanedUpdates
            cleanedUpdates.start_time = formattedStartTime;
          }
        }
      }
    }

    // Process work_date if it's being updated
    if (cleanedUpdates.work_date) {
      let formattedWorkDate = cleanedUpdates.work_date;
      if (
        formattedWorkDate &&
        typeof formattedWorkDate === "string" &&
        formattedWorkDate.trim()
      ) {
        // Check if it's a time value (like "14:00") and convert to null
        if (/^\d{1,2}:\d{2}$/.test(formattedWorkDate.trim())) {
          console.warn(
            `work_date contains time value "${formattedWorkDate}", setting to null`
          );
          delete cleanedUpdates.work_date;
        } else {
          // Try to parse as a date
          const date = new Date(formattedWorkDate);
          if (isNaN(date.getTime())) {
            console.warn(
              `Invalid work_date value "${formattedWorkDate}", setting to null`
            );
            delete cleanedUpdates.work_date;
          } else {
            // Format as ISO date string
            formattedWorkDate = date.toISOString().split("T")[0];
          }
        }
      } else {
        cleanedUpdates.work_date = formattedWorkDate;
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

        const createdArns = await eventBridgeService.createReminderSchedules(
          jobId,
          newWorkDate,
          newStartTime,
          currentAssignment?.num_reminders || 2
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

        await eventBridgeService.updateReminderSchedules(
          jobId,
          oldWorkDate!,
          oldStartTime!,
          newWorkDate,
          newStartTime,
          currentAssignment?.num_reminders || 2
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
