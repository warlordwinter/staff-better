import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { JobAssignment } from "@/model/interfaces/JobAssignment";

export interface IJobAssignments {
  insertJobsAssignments(
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
  ): Promise<JobAssignment[]>;

  getJobAssignmentsByJobId(jobId: string): Promise<JobAssignment[]>;

  insertSingleJobAssignment(
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
  ): Promise<JobAssignment[]>;

  updateJobAssignment(
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
  ): Promise<JobAssignment[]>;

  deleteJobAssignment(
    jobId: string,
    associateId: string
  ): Promise<{ success: boolean }>;

  getNumberOfReminders(jobId: string, associateId: string): Promise<number>;

  getJobAssignment(
    jobId: string,
    associateId: string
  ): Promise<JobAssignment | null>;

  getAssignmentsNeedingReminders(): Promise<JobAssignment[]>;

  getActiveAssignmentsFromDatabase(
    todayString: string,
    daysFromNow: string,
    associateId: string
  ): Promise<JobAssignment[]>;
}
