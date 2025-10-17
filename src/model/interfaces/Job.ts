export interface Job {
  id: string;
  title: string;
  location?: string | null;
  client_company?: string | null;
  company_id: string;
  associate_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  pay_rate?: number | null;
  incentive_bonus?: number | null;
  num_reminders?: number | null;
  job_status?: string | null;
  isNew?: boolean; // Optional flag for new jobs being created inline
}
