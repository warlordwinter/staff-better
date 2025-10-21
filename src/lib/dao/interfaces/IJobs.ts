import { Job } from "@/model/interfaces/Job";

export interface IJobs {
  insertJobs(
    jobs: {
      title?: string | null;
      location?: string | null;
      company_id: string;
      associate_id?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      num_reminders?: number | null;
      job_status?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
      client_company?: string | null;
    }[]
  ): Promise<Job[]>;

  getJobs(): Promise<Job[]>;
  getJobsByCompanyId(companyId: string): Promise<Job[]>;
  getJobsByAssociateId(associateId: string): Promise<Job[]>;

  updateJob(
    id: string,
    updates: Partial<{
      title: string | null;
      location: string | null;
      company_id: string;
      associate_id: string | null;
      start_date: string | null;
      end_date: string | null;
      num_reminders: number | null;
      job_status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
      client_company: string | null;
    }>
  ): Promise<Job[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<Job>;
}
