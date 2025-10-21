export interface JobReminder {
  id: string;
  job_id: string;
  reminder_type: "SMS" | "EMAIL" | "WHATSAPP" | null;
  interval_hours: number;
  last_sent: string | null;
  max_reminders: number | null;
}
