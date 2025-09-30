import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

export interface IJobAssignments {
  insertJobsAssignments(
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
  ): Promise<any[]>;

  getJobAssignmentsByJobId(jobId: string): Promise<any[]>;

  insertSingleJobAssignment(
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
  ): Promise<any[]>;

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
  ): Promise<any[]>;

  deleteJobAssignment(
    jobId: string,
    associateId: string
  ): Promise<{ success: boolean }>;

  getNumberOfReminders(jobId: string, associateId: string): Promise<number>;

  getJobAssignment(jobId: string, associateId: string): Promise<any | null>;

  getAssignmentsNeedingReminders(): Promise<any[]>;

  getActiveAssignmentsFromDatabase(
    todayString: string,
    daysFromNow: string,
    associateId: string
  ): Promise<any[]>;
}
