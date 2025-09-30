export interface IJobs {
  insertJobs(
    jobs: {
      job_title: string;
      customer_name: string;
      job_status: string;
      start_date: string;
    }[]
  ): Promise<any[]>;

  getJobs(): Promise<any[]>;

  updateJob(
    id: string,
    updates: Partial<{
      job_title: string;
      customer_name: string;
      job_status: string;
      start_date: string;
    }>
  ): Promise<any[]>;

  deleteJob(id: string): Promise<{ success: boolean }>;

  getJobById(id: string): Promise<any>;
}
