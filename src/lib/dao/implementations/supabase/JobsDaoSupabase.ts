import { Job } from "@/model/interfaces/Job";
import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";
import { EventBridgeScheduleService } from "@/lib/services/eventbridgeScheduleService";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(
    jobs: {
      job_title: string;
      company_id: string;
      start_date: string;
      start_time?: string | null;
      job_status: string;
      customer_name: string;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Jobs: ", jobs);

    // Prepare jobs for insertion - conditionally include start_time
    const jobsToInsert = jobs.map(({ start_time, ...job }) => {
      const jobData: any = { ...job };
      // Only include start_time if it has a value
      if (
        start_time !== null &&
        start_time !== undefined &&
        typeof start_time === "string" &&
        start_time.trim() !== ""
      ) {
        // Ensure the timestamp is in the correct format for Supabase TIMESTAMPTZ
        // Accept formats like: "2025-11-10T14:30:00Z" or "2025-11-10T14:30:00+00:00"
        const trimmedTime = start_time.trim();
        jobData.start_time = trimmedTime;
        console.log(`Including start_time in job insert: ${trimmedTime}`);
      } else {
        console.log(
          `start_time is empty or null (value: ${JSON.stringify(
            start_time
          )}), not including in insert`
        );
      }
      return jobData;
    });

    console.log(
      "Jobs to insert (with start_time check):",
      JSON.stringify(jobsToInsert, null, 2)
    );

    const { data, error } = await supabase
      .from("jobs")
      .insert(jobsToInsert)
      .select();

    // Handle errors
    if (error) {
      console.error("Supabase insert error:", JSON.stringify(error, null, 2));
      throw new Error(error.message || "Failed to insert jobs");
    }

    // Defensive: handle possible null 'data' value
    if (!data) {
      return [];
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
    }));
  }

  // Get jobs
  async getJobs() {
    const supabase = await createClient();

    // Use select("*") to automatically include all columns (works even if start_time doesn't exist yet)
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
      // start_time will be included if the column exists, otherwise undefined
    }));
  }

  // Update job
  async updateJob(
    id: string,
    updates: Partial<{
      job_title: string;
      company_id: string;
      start_date: string;
      start_time?: string | null;
      job_status: string;
      customer_name: string;
      night_before_time?: string | null;
      day_of_time?: string | null;
    }>
  ) {
    const supabase = await createClient();

    // Get the old job values before updating (to detect changes in start_date/start_time and reminder times)
    const { data: oldJobData } = await supabase
      .from("jobs")
      .select("start_date, start_time, night_before_time, day_of_time")
      .eq("id", id)
      .single();

    const oldStartDate = oldJobData?.start_date
      ? oldJobData.start_date.split("T")[0]
      : null;
    const oldStartTime = oldJobData?.start_time
      ? oldJobData.start_time.includes("T")
        ? oldJobData.start_time.split("T")[1].replace("Z", "").split(".")[0]
        : oldJobData.start_time
      : null;
    const oldNightBeforeTime = oldJobData?.night_before_time || null;
    const oldDayOfTime = oldJobData?.day_of_time || null;

    // Prepare updates - conditionally include optional fields
    const updatesToApply: any = { ...updates };

    // Only include start_time if it has a value
    if (updates.start_time !== undefined) {
      if (updates.start_time !== null && updates.start_time.trim() !== "") {
        updatesToApply.start_time = updates.start_time;
        console.log(
          `Including start_time in job update: ${updates.start_time}`
        );
      } else {
        // If explicitly set to null/empty, remove it from updates (don't update the field)
        delete updatesToApply.start_time;
        console.log("start_time is empty or null, not updating it");
      }
    }

    // Handle night_before_time (store as TIME format, e.g., "19:00")
    if (updates.night_before_time !== undefined) {
      if (
        updates.night_before_time !== null &&
        updates.night_before_time.trim() !== ""
      ) {
        updatesToApply.night_before_time = updates.night_before_time;
        console.log(
          `Including night_before_time in job update: ${updates.night_before_time}`
        );
      } else {
        delete updatesToApply.night_before_time;
      }
    }

    // Handle day_of_time (store as TIME format, e.g., "06:00")
    if (updates.day_of_time !== undefined) {
      if (updates.day_of_time !== null && updates.day_of_time.trim() !== "") {
        updatesToApply.day_of_time = updates.day_of_time;
        console.log(
          `Including day_of_time in job update: ${updates.day_of_time}`
        );
      } else {
        delete updatesToApply.day_of_time;
      }
    }

    console.log(
      "Job updates to apply:",
      JSON.stringify(updatesToApply, null, 2)
    );

    const { data, error } = await supabase
      .from("jobs")
      .update(updatesToApply)
      .eq("id", id)
      .select();

    if (error) {
      const errorMessage = error.message || JSON.stringify(error);
      const errorCode = error.code || "";

      console.error("Update error:", {
        errorMessage,
        errorCode,
        errorDetails: error,
      });

      // Check for missing column errors
      const missingColumns: string[] = [];

      if (
        updatesToApply.start_time !== undefined &&
        (errorMessage.includes("start_time") ||
          errorMessage.includes("column") ||
          errorCode === "42703" ||
          errorCode === "PGRST204")
      ) {
        missingColumns.push("start_time");
      }

      if (
        updatesToApply.night_before_time !== undefined &&
        (errorMessage.includes("night_before_time") || errorCode === "PGRST204")
      ) {
        missingColumns.push("night_before_time");
      }

      if (
        updatesToApply.day_of_time !== undefined &&
        (errorMessage.includes("day_of_time") || errorCode === "PGRST204")
      ) {
        missingColumns.push("day_of_time");
      }

      if (missingColumns.length > 0) {
        const sqlStatements = missingColumns
          .map((col) => {
            if (col === "start_time") {
              return "ALTER TABLE jobs ADD COLUMN start_time TIMESTAMPTZ NULL;";
            } else if (col === "night_before_time") {
              return "ALTER TABLE jobs ADD COLUMN night_before_time TIME NULL;";
            } else if (col === "day_of_time") {
              return "ALTER TABLE jobs ADD COLUMN day_of_time TIME NULL;";
            }
            return "";
          })
          .filter(Boolean);

        console.error(
          `ERROR: The following columns do not exist in the jobs table: ${missingColumns.join(
            ", "
          )}. ` + `Please add them with:\n${sqlStatements.join("\n")}`
        );
        throw new Error(
          `Missing columns in database: ${missingColumns.join(", ")}. ` +
            `Please add the columns to the jobs table. SQL:\n${sqlStatements.join(
              "\n"
            )}`
        );
      }

      console.error("Supabase update error:", error);
      throw new Error("Failed to update job");
    }

    // Check if start_date or start_time changed, and update reminder schedules if needed
    const newStartDate = updates.start_date
      ? updates.start_date.split("T")[0]
      : oldStartDate;
    const newStartTime = updates.start_time
      ? updates.start_time.includes("T")
        ? updates.start_time.split("T")[1].replace("Z", "").split(".")[0]
        : updates.start_time
      : oldStartTime;

    // Get new reminder times from updates
    const newNightBeforeTime =
      updates.night_before_time !== undefined
        ? updates.night_before_time
        : oldNightBeforeTime;
    const newDayOfTime =
      updates.day_of_time !== undefined ? updates.day_of_time : oldDayOfTime;

    const startDateChanged =
      updates.start_date !== undefined && oldStartDate !== newStartDate;
    const startTimeChanged =
      updates.start_time !== undefined && oldStartTime !== newStartTime;
    const nightBeforeTimeChanged =
      updates.night_before_time !== undefined &&
      oldNightBeforeTime !== newNightBeforeTime;
    const dayOfTimeChanged =
      updates.day_of_time !== undefined && oldDayOfTime !== newDayOfTime;

    if (startDateChanged || startTimeChanged) {
      try {
        // Only update schedules if we have both old and new values
        if (oldStartDate && oldStartTime && newStartDate && newStartTime) {
          const eventBridgeService = new EventBridgeScheduleService();

          // Get all job assignments for this job that need to be updated
          const { data: assignments, error: assignmentsError } = await supabase
            .from("job_assignments")
            .select("id, num_reminders")
            .eq("job_id", id);

          // Store original num_reminders before resetting (for use in schedule creation)
          const originalNumReminders =
            assignments && assignments.length > 0
              ? assignments[0]?.num_reminders || 2
              : 2;

          if (assignmentsError) {
            console.error(
              "Error fetching job assignments for update:",
              assignmentsError
            );
          } else if (assignments && assignments.length > 0) {
            // Format new start_time for job_assignments (needs to be full timestamp)
            const newStartTimeForAssignments = updates.start_time
              ? updates.start_time.includes("T")
                ? updates.start_time
                : `${newStartDate}T${updates.start_time}:00Z`
              : null;

            // Update all assignments with new date/time and reset reminder tracking
            // This is important: if a reminder was already sent for the old date,
            // we need to reset the tracking so reminders can be sent for the new date
            const { error: updateAssignmentsError } = await supabase
              .from("job_assignments")
              .update({
                work_date: newStartDate,
                start_time: newStartTimeForAssignments,
                last_reminder_time: null, // Reset since reminder was for old date
                num_reminders: originalNumReminders, // Reset to original count
              })
              .eq("job_id", id);

            if (updateAssignmentsError) {
              console.error(
                "Error updating job assignments after date change:",
                updateAssignmentsError
              );
            } else {
              console.log(
                `Updated ${assignments.length} job assignment(s) to match new job date/time and reset reminder tracking`
              );
            }
          }

          // Get all reminder schedules for this job that match the old job values
          const { data: schedules, error: schedulesError } = await supabase
            .from("reminder_schedules")
            .select("work_date, start_time, reminder_type")
            .eq("job_id", id)
            .eq("work_date", oldStartDate)
            .eq("start_time", oldStartTime);

          if (schedulesError) {
            console.error(
              "Error fetching reminder schedules for update:",
              schedulesError
            );
          } else if (schedules && schedules.length > 0) {
            // Use the original num_reminders we stored before updating assignments
            const maxReminders = originalNumReminders;

            // Update schedules: delete old ones and create new ones
            // Pass the new reminder times (or old ones if they didn't change)
            await eventBridgeService.updateReminderSchedules(
              id,
              oldStartDate,
              oldStartTime,
              newStartDate,
              newStartTime,
              maxReminders,
              newNightBeforeTime,
              newDayOfTime
            );

            console.log(
              `Updated ${schedules.length} reminder schedule(s) for job ${id}: ${oldStartDate}/${oldStartTime} -> ${newStartDate}/${newStartTime}`
            );
          } else {
            console.log(
              `No reminder schedules found for job ${id} with work_date ${oldStartDate} and start_time ${oldStartTime}`
            );
          }
        }
      } catch (error) {
        console.error(
          "Error updating reminder schedules after job update:",
          error
        );
        // Don't fail the job update if schedule update fails
      }
    }

    // Check if reminder times changed (even if date/time didn't change)
    // In this case, we need to update all existing schedules for this job
    if (
      (nightBeforeTimeChanged || dayOfTimeChanged) &&
      !startDateChanged &&
      !startTimeChanged
    ) {
      try {
        // Get current job date/time to find existing schedules
        const currentStartDate = newStartDate || oldStartDate;
        const currentStartTime = newStartTime || oldStartTime;

        if (currentStartDate && currentStartTime) {
          const eventBridgeService = new EventBridgeScheduleService();

          // Get all reminder schedules for this job
          const { data: schedules, error: schedulesError } = await supabase
            .from("reminder_schedules")
            .select("work_date, start_time, reminder_type")
            .eq("job_id", id)
            .eq("work_date", currentStartDate)
            .eq("start_time", currentStartTime);

          if (schedulesError) {
            console.error(
              "Error fetching reminder schedules for reminder time update:",
              schedulesError
            );
          } else if (schedules && schedules.length > 0) {
            // Get num_reminders from job assignments
            const { data: assignments } = await supabase
              .from("job_assignments")
              .select("num_reminders")
              .eq("job_id", id)
              .limit(1);

            const maxReminders =
              assignments && assignments.length > 0
                ? assignments[0]?.num_reminders || 2
                : 2;

            // Update schedules: delete old ones and create new ones with new reminder times
            // Since date/time didn't change, we use the same values for old and new
            await eventBridgeService.updateReminderSchedules(
              id,
              currentStartDate,
              currentStartTime,
              currentStartDate,
              currentStartTime,
              maxReminders,
              newNightBeforeTime,
              newDayOfTime
            );

            console.log(
              `Updated ${schedules.length} reminder schedule(s) for job ${id} with new reminder times (night_before: ${newNightBeforeTime}, day_of: ${newDayOfTime})`
            );
          }
        }
      } catch (error) {
        console.error(
          "Error updating reminder schedules after reminder time change:",
          error
        );
        // Don't fail the job update if schedule update fails
      }
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
    }));
  }

  // Delete job
  async deleteJob(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error("Failed to delete job");
    }

    return { success: true };
  }

  // Get single job by ID
  /**
   * Fetches a single job by ID.
   * Returns a Job object if found, otherwise throws an error (to match interface contract).
   */
  async getJobById(id: string): Promise<Job> {
    const supabase = await createClient();

    // Use select("*") to automatically include all columns (works even if start_time doesn't exist yet)
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // Check if the error is "not found" (PGRST116 = no rows returned)
      if (error.code === "PGRST116") {
        console.error(`Job with ID ${id} not found`);
        throw new Error("Job not found");
      }
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    if (!data) {
      throw new Error("Job not found");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return {
      ...data,
      start_date: data.start_date ? data.start_date.split("T")[0] : null,
    };
  }
}
