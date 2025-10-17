import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(jobs: Partial<Job>[]): Promise<Job[]>;
  getJobs(): Promise<Job[]>;
  getJobsByCompanyId(companyId: string): Promise<Job[]>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job[]>;
  deleteJob(id: string): Promise<{ success: boolean }>;
  getJobById(id: string): Promise<Job>;
}
