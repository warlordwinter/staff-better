// Abstract repository interface for reminder data access

import { ReminderAssignment } from "../types";

export interface IReminderRepository {
  getDueReminders(): Promise<ReminderAssignment[]>;
  getReminderAssignment(
    jobId: string,
    associateId: string
  ): Promise<ReminderAssignment | null>;
  updateReminderStatus(
    jobId: string,
    associateId: string,
    updates: Partial<ReminderAssignment>
  ): Promise<void>;
  getNumberOfReminders(jobId: string, associateId: string): Promise<number>;
  getDayBeforeReminders(date: Date): Promise<ReminderAssignment[]>;
  getMorningOfReminders(hours: number): Promise<ReminderAssignment[]>;
  getTwoDaysBeforeReminders(date: Date): Promise<ReminderAssignment[]>;
  getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[],
    hours: number
  ): Promise<ReminderAssignment[]>;
}
