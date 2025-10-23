export interface JobAssignment {
  job_id: string;
  associate_id: string;
  confirmation_status: string;
  last_activity_time: string;
  work_date: string | null;
  start_time: string | null;
  num_reminders: number;
}
