// Common types for services

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

export interface ReminderResult {
  success: boolean;
  assignment_id: string;
  associate_id: string;
  phone_number: string;
  reminder_type: ReminderType;
  message_id?: string;
  error?: string;
}

export enum ReminderType {
  THREE_DAYS_BEFORE = "three_days_before",
  TWO_DAYS_BEFORE = "two_days_before",
  DAY_BEFORE = "day_before",
  MORNING_OF = "morning_of",
  HOUR_BEFORE = "hour_before",
  FOLLOW_UP = "follow_up",
}

export interface IncomingMessageResult {
  success: boolean;
  action: MessageAction;
  associate_id?: string;
  phone_number: string;
  message: string;
  response_sent?: string;
  error?: string;
}

export enum MessageAction {
  CONFIRMATION = "confirmation",
  HELP_REQUEST = "help_request",
  OPT_OUT = "opt_out",
  UNKNOWN = "unknown",
}

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface SchedulerStats {
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  isRunning: boolean;
}
