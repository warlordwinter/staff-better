import { ReminderAssignment } from "@/model/interfaces/ReminderAssignment";

export interface IReminder {
  getReminderAssignment(
    jobId: string,
    associateId: string
  ): Promise<ReminderAssignment | null>;

  getDueReminders(): Promise<ReminderAssignment[]>;

  getAllUpcomingReminders(): Promise<ReminderAssignment[]>;

  getAssignmentsByDate(date: Date): Promise<ReminderAssignment[]>;

  getDayBeforeReminders(targetDate: Date): Promise<ReminderAssignment[]>;

  getTwoDaysBeforeReminders(targetDate: Date): Promise<ReminderAssignment[]>;

  getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[],
    minHoursSinceLastReminder?: number
  ): Promise<ReminderAssignment[]>;

  getMorningOfReminders(hoursAhead?: number): Promise<ReminderAssignment[]>;
}
