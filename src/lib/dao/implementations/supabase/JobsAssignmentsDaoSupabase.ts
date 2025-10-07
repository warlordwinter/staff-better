import { createClient } from "../../../supabase/server";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { IJobAssignments } from "../../interfaces/IJobAssignments";

export class JobsAssignmentsDaoSupabase implements IJobAssignments {
  async insertJobsAssignments(
    jobsAssignments: {
      job_id: string;
      associate_id: string;
      confirmation_status:
        | "Unconfirmed"
        | "Soft Confirmed"
        | "Likely Confirmed"
        | "Confirmed"
        | "Declined";
      work_date: string;
      start_time: string;
      num_reminders?: number;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Job Assignment Creation: ", jobsAssignments);

    // Use the correct table name (lowercase in Supabase by default)
    const { data, error } = await supabase
      .from("jobassignments")
      .insert(
        jobsAssignments.map((assignment) => ({
          ...assignment,
          num_reminders: assignment.num_reminders || 0,
        }))
      )
      .select();

    if (error) {
      console.error("Error in JobAssignmentsDao:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  async getJobAssignmentsByJobId(jobId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobassignments")
      .select(
        `
        *,
        associates!inner (
          id,
          first_name,
          last_name,
          work_date,
          start_time,
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

    return data;
  }

  async insertSingleJobAssignment(
    jobId: string,
    assignmentData: {
      associate_id: string;
      confirmation_status?:
        | "unconfirmed"
        | "soft confirmed"
        | "likely confirmed"
        | "confirmed"
        | "declined";
      work_date: string;
      start_time: string;
      num_reminders?: number;
    }
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobassignments")
      .insert({
        job_id: jobId,
        associate_id: assignmentData.associate_id,
        confirmation_status:
          assignmentData.confirmation_status || "unconfirmed",
        work_date: assignmentData.work_date,
        start_time: assignmentData.start_time,
        num_reminders: assignmentData.num_reminders || 0,
      })
      .select();

    if (error) {
      console.error("Error creating job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
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
      .from("jobassignments")
      .update(cleanedUpdates)
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .select();

    if (error) {
      console.error("Error updating job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  async deleteJobAssignment(jobId: string, associateId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("jobassignments")
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
      .from("jobassignments")
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
      .from("jobassignments")
      .select("*")
      .eq("job_id", jobId)
      .eq("associate_id", associateId);

    if (error) {
      console.error("Error grabbing job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.[0] || null;
  }

  /**
   * This method gets all the job assignments that still need reminders
   *
   * @returns jobassignment with needed reminders to be sent
   */
  async getAssignmentsNeedingReminders() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobassignments")
      .select("*")
      .gt("num_reminders", 0)
      .neq("confirmation_status", "Confirmed");

    if (error) {
      console.error(
        "Error fetching job assignments that need reminders:",
        error
      );
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  async getActiveAssignmentsFromDatabase(
    todayString: string,
    daysFromNow: string,
    associateId: string
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobassignments")
      .select(
        "job_id, associate_id, work_date, start_time, confirmation_status"
      )
      .eq("associate_id", associateId)
      .gte("work_date", todayString)
      .lte("work_date", daysFromNow)
      .neq("confirmation_status", "Declined")
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
      work_date: assignment.work_date,
      start_time: assignment.start_time,
      num_reminders: 0, // Default value
    }));
  }
}
