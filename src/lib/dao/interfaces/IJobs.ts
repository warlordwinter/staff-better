import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(
    jobs: {
      job_title: string;
      company_id: string;
      start_date: string;
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
      job_status: string;
      customer_name: string;
    }>
  ): Promise<Job[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<Job>;
}
