import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(
    jobs: {
      job_title: string;
      customer_name: string;
      job_status: string;
      start_date: string;
    }[]
  ): Promise<Job[]>;

  getJobs(): Promise<Job[]>;

  updateJob(
    id: string,
    updates: Partial<{
      job_title: string;
      customer_name: string;
      job_status: string;
      start_date: string;
    }>
  ): Promise<Job[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<Job>;
}
