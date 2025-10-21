import { createClient } from "../../../supabase/server";
import { IJobAssignments } from "../../interfaces/IJobAssignments";
import { Job } from "@/model/interfaces/Job";

export class JobsAssignmentsDaoSupabase implements IJobAssignments {
  // Assign associate to job (updates the associate_id field in jobs table)
  async assignAssociateToJob(jobId: string, associateId: string): Promise<Job> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .update({ associate_id: associateId })
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      console.error("Error assigning associate to job:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  // Remove associate from job (sets associate_id to null)
  async removeAssociateFromJob(jobId: string): Promise<Job> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .update({ associate_id: null })
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      console.error("Error removing associate from job:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  // Get jobs assigned to a specific associate
  async getJobsByAssociate(associateId: string): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("associate_id", associateId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching jobs by associate:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  // Get the associate assigned to a specific job
  async getAssociateByJob(jobId: string): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("associate_id")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Error fetching associate by job:", error);
      return null;
    }

    return data?.associate_id || null;
  }

  // Update job assignment details
  async updateJobAssignment(
    jobId: string,
    updates: {
      associate_id?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      num_reminders?: number | null;
      job_status?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
    }
  ): Promise<Job> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      console.error("Error updating job assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  // Get jobs that need reminders (based on num_reminders and dates)
  async getJobsNeedingReminders(): Promise<Job[]> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .not("associate_id", "is", null)
      .not("num_reminders", "is", null)
      .gt("num_reminders", 0)
      .lte("start_date", now)
      .in("job_status", ["UPCOMING", "ONGOING"]);

    if (error) {
      console.error("Error fetching jobs needing reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  // Get active jobs for an associate within a date range
  async getActiveJobsForAssociate(
    associateId: string,
    startDate: string,
    endDate: string
  ): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("associate_id", associateId)
      .gte("start_date", startDate)
      .lte("end_date", endDate)
      .in("job_status", ["UPCOMING", "ONGOING"]);

    if (error) {
      console.error("Error fetching active jobs for associate:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }
}
