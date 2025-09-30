// Supabase implementation of reminder repository

import { IReminderRepository } from "../interfaces/index";
import { ReminderAssignment } from "../types";
import { ReminderDaoSupabase } from "../../dao/implementations/supabase/ReminderDaoSupabase";
import { JobsAssignmentsDaoSupabase } from "../../dao/implementations/supabase/JobsAssignmentsDaoSupabase";

export class ReminderRepositorySupabase implements IReminderRepository {
  private reminderDao = new ReminderDaoSupabase();
  private jobAssignmentsDao = new JobsAssignmentsDaoSupabase();

  async getDueReminders(): Promise<ReminderAssignment[]> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const dueAssignments: ReminderAssignment[] = [];

    try {
      // Get day-before reminders (for work happening tomorrow)
      const dayBeforeReminders = await this.reminderDao.getDayBeforeReminders(
        tomorrow
      );

      // Get morning-of reminders (for work happening today, starting in 1-2 hours)
      const morningOfReminders = await this.reminderDao.getMorningOfReminders(
        2
      );

      // Get two-days-before reminders (for work happening day after tomorrow)
      const twoDaysBeforeReminders =
        await this.reminderDao.getTwoDaysBeforeReminders(dayAfterTomorrow);

      dueAssignments.push(
        ...dayBeforeReminders,
        ...morningOfReminders,
        ...twoDaysBeforeReminders
      );

      // Filter out assignments that were reminded recently
      return await this.reminderDao.getAssignmentsNotRecentlyReminded(
        dueAssignments,
        4
      );
    } catch (error) {
      console.error("Error finding due reminders:", error);
      return [];
    }
  }

  async getReminderAssignment(
    jobId: string,
    associateId: string
  ): Promise<ReminderAssignment | null> {
    return await this.reminderDao.getReminderAssignment(jobId, associateId);
  }

  async updateReminderStatus(
    jobId: string,
    associateId: string,
    updates: Partial<ReminderAssignment>
  ): Promise<void> {
    await this.jobAssignmentsDao.updateJobAssignment(jobId, associateId, {
      num_reminders: updates.num_reminders,
      last_reminder_time: updates.last_reminder_time?.toISOString(),
    });
  }

  async getNumberOfReminders(
    jobId: string,
    associateId: string
  ): Promise<number> {
    return await this.jobAssignmentsDao.getNumberOfReminders(
      jobId,
      associateId
    );
  }

  async getDayBeforeReminders(date: Date): Promise<ReminderAssignment[]> {
    return await this.reminderDao.getDayBeforeReminders(date);
  }

  async getMorningOfReminders(hours: number): Promise<ReminderAssignment[]> {
    return await this.reminderDao.getMorningOfReminders(hours);
  }

  async getTwoDaysBeforeReminders(date: Date): Promise<ReminderAssignment[]> {
    return await this.reminderDao.getTwoDaysBeforeReminders(date);
  }

  async getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[],
    hours: number
  ): Promise<ReminderAssignment[]> {
    return await this.reminderDao.getAssignmentsNotRecentlyReminded(
      assignments,
      hours
    );
  }
}
