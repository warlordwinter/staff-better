import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(
    jobs: {
      job_title: string;
      company_id: string;
      start_date: string;
      start_time?: string | null;
      job_status: string;
      customer_name: string;
    }[]
  ): Promise<Job[]>;

  getJobs(): Promise<Job[]>;

  updateJob(
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
  ): Promise<Job[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<Job>;
}
