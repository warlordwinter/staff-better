export interface ReminderAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  associate_first_name: string;
  associate_last_name: string;
  phone_number: string;
  title: string;
  client_company: string;
  num_reminders: number;
  last_activity_time?: string;
  last_confirmation_time?: Date;
  last_reminder_time?: Date;
  confirmation_status?: string;
}
