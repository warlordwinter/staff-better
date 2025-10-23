import { createClient } from "../../../supabase/server";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { IJobAssignments } from "../../interfaces/IJobAssignments";

export class JobsAssignmentsDaoSupabase implements IJobAssignments {
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
    const formattedAssignments = jobsAssignments.map((assignment) => {
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

    console.log("Raw data from Supabase:", JSON.stringify(data[0], null, 2));

    // Format work_date to return only the date portion (YYYY-MM-DD)
    const formatted = data.map((assignment) => ({
      ...assignment,
      work_date: assignment.work_date
        ? assignment.work_date.split("T")[0]
        : null,
    }));

    console.log("Formatted data:", JSON.stringify(formatted[0], null, 2));

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
    if (formattedStartTime && formattedStartTime.trim()) {
      // Check if it's a time value (like "14:00") and format it properly
      if (/^\d{1,2}:\d{2}$/.test(formattedStartTime.trim())) {
        // If it's just a time, we need to combine it with a date
        // For now, we'll use today's date as the base
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0];
        formattedStartTime = `${dateStr} ${formattedStartTime}:00`;
        console.log(
          `Formatted start_time: "${assignmentData.start_time}" -> "${formattedStartTime}"`
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
      num_reminders: assignmentData.num_reminders || 0,
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

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== "")
    );

    const { data, error } = await supabase
      .from("job_assignments")
      .update(cleanedUpdates)
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .select();

    if (error) {
      console.error("Error updating job assignment:", error);
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

  async deleteJobAssignment(jobId: string, associateId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("job_assignments")
      .delete()
      .eq("job_id", jobId)
      .eq("associate_id", associateId);

    if (error) {
      console.error("Error deleting job assignment:", error);
      throw new Error(JSON.stringify(error));
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
      num_reminders: 0, // Default value
    }));
  }
}
