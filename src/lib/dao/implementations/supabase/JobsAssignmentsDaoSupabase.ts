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
      .from("job_reminders")
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

    // First get the job assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("job_reminders")
      .select(
        `
        job_id,
        associate_id,
        work_date,
        start_time,
        num_reminders,
        confirmation_status,
        last_confirmation_time,
        last_reminder_time
      `
      )
      .eq("job_id", jobId);

    if (assignmentsError) {
      console.error("Error fetching job assignments:", assignmentsError);
      throw new Error(JSON.stringify(assignmentsError));
    }

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Transform to match JobAssignment interface
    const jobAssignments = assignments.map((assignment) => ({
      job_id: assignment.job_id,
      associate_id: assignment.associate_id,
      confirmation_status: assignment.confirmation_status,
      last_activity_time:
        assignment.last_confirmation_time ||
        assignment.last_reminder_time ||
        new Date().toISOString(),
      work_date: assignment.work_date,
      start_time: assignment.start_time,
      num_reminders: assignment.num_reminders || 0,
    }));

    // Get associate IDs
    const associateIds = jobAssignments
      .map((a) => a.associate_id)
      .filter(Boolean);

    if (associateIds.length === 0) {
      return jobAssignments;
    }

    // Fetch associates separately
    const { data: associates, error: associatesError } = await supabase
      .from("associates")
      .select("id, first_name, last_name, phone_number, email_address")
      .in("id", associateIds);

    if (associatesError) {
      console.error("Error fetching associates:", associatesError);
      // Return assignments without associate data rather than failing
      return jobAssignments;
    }

    // Join the data and return with associates info
    const assignmentsWithAssociates = jobAssignments.map((assignment) => ({
      ...assignment,
      associates:
        associates?.find((a) => a.id === assignment.associate_id) || null,
    }));

    return assignmentsWithAssociates;
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
      .from("job_reminders")
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
      .from("job_reminders")
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
      .from("job_reminders")
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
      .from("job_reminders")
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
      .from("job_reminders")
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
      .from("job_reminders")
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
      .from("job_reminders")
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
