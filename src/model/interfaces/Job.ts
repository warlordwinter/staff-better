export interface Job {
  id: string;
  title: string | null;
  location: string | null;
  company_id: string;
  associate_id: string | null;
  start_date: string | null;
  end_date: string | null;
  num_reminders: number | null;
  job_status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
  client_company: string | null;
}
