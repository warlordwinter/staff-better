import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(
    jobs: {
      title: string;
      location?: string;
      company_id: string;
      associate_id: string;
      start_date: string;
      end_date?: string;
      num_reminders?: number;
      job_status: string;
      client_company: string;
    }[]
  ): Promise<Job[]>;

  getJobs(): Promise<Job[]>;

  updateJob(
    id: string,
    updates: Partial<{
      title: string;
      location?: string;
      company_id: string;
      associate_id: string;
      start_date: string;
      end_date?: string;
      num_reminders?: number;
      job_status: string;
      client_company: string;
    }>
  ): Promise<Job[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<Job>;
}
