export interface Job {
  id: string;
  title: string;
  location?: string;
  company_id: string;
  associate_id: string;
  start_date: string;
  end_date?: string;
  num_reminders?: number;
  job_status: string;
  client_company: string;
}