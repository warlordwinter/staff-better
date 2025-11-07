export interface Job {
  id: string;
  job_title: string;
  company_id: string;
  start_date: string;
  start_time?: string | null;
  job_status: string;
  customer_name: string;
}
