import { Job } from "@/model/interfaces/Job";

export interface IJobAssignments {
  // Assign associate to job (updates the associate_id field in jobs table)
  assignAssociateToJob(jobId: string, associateId: string): Promise<Job>;

  // Remove associate from job (sets associate_id to null)
  removeAssociateFromJob(jobId: string): Promise<Job>;

  // Get jobs assigned to a specific associate
  getJobsByAssociate(associateId: string): Promise<Job[]>;

  // Get the associate assigned to a specific job
  getAssociateByJob(jobId: string): Promise<string | null>; // Returns user ID or null

  // Update job assignment details
  updateJobAssignment(
    jobId: string,
    updates: {
      associate_id?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      num_reminders?: number | null;
      job_status?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
    }
  ): Promise<Job>;

  // Get jobs that need reminders (based on num_reminders and dates)
  getJobsNeedingReminders(): Promise<Job[]>;

  // Get active jobs for an associate within a date range
  getActiveJobsForAssociate(
    associateId: string,
    startDate: string,
    endDate: string
  ): Promise<Job[]>;
}
