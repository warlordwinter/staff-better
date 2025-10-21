import { JobReminder } from "@/model/interfaces/JobReminder";

export interface IJobReminders {
  getJobReminders(): Promise<JobReminder[]>;
  getJobRemindersByJobId(jobId: string): Promise<JobReminder[]>;
  insertJobReminders(
    reminders: {
      job_id: string;
      reminder_type?: "SMS" | "EMAIL" | "WHATSAPP" | null;
      interval_hours: number;
      last_sent?: string | null;
      max_reminders?: number | null;
    }[]
  ): Promise<JobReminder[]>;
  updateJobReminder(
    id: string,
    updates: Partial<{
      job_id: string;
      reminder_type: "SMS" | "EMAIL" | "WHATSAPP" | null;
      interval_hours: number;
      last_sent: string | null;
      max_reminders: number | null;
    }>
  ): Promise<JobReminder[]>;
  deleteJobReminder(id: string): Promise<{ success: boolean }>;
  getJobReminderById(id: string): Promise<JobReminder | null>;
  getRemindersNeedingSending(): Promise<JobReminder[]>;
  updateLastSent(id: string, lastSent: string): Promise<void>;
}
