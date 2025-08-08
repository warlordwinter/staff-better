export interface ReminderAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  associate_first_name: string;
  associate_last_name: string;
  phone_number: string;
  job_title: string;
  customer_name: string;
  num_reminders: number;
  last_confirmation_time?: Date;
  last_reminder_time?: Date;
  confirmation_status?: 'Unconfirmed' | 'Soft Confirmed' | 'Likely Confirmed' | 'Confirmed' | 'Declined';
}