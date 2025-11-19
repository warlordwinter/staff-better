/**
 * Interface for EventBridge Schedule Service
 * Handles creation, update, and deletion of EventBridge schedules for reminders
 */
export interface IEventBridgeScheduleService {
  /**
   * Create reminder schedules for a job assignment
   * Checks if schedules already exist before creating (deduplication)
   * @param jobId - Job ID
   * @param workDate - Work date (YYYY-MM-DD)
   * @param startTime - Start time (HH:MM:SS)
   * @param maxNumReminders - Maximum number of reminders (determines which schedules to create)
   * @returns Array of created schedule ARNs
   */
  createReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string,
    maxNumReminders: number
  ): Promise<string[]>;

  /**
   * Delete reminder schedules for a job/date/time combination
   * Only deletes if no other assignments exist for the same combination
   * @param jobId - Job ID
   * @param workDate - Work date (YYYY-MM-DD)
   * @param startTime - Start time (HH:MM:SS)
   */
  deleteReminderSchedules(
    jobId: string,
    workDate: string,
    startTime: string
  ): Promise<void>;

  /**
   * Update reminder schedules when work_date or start_time changes
   * Deletes old schedules and creates new ones
   * @param jobId - Job ID
   * @param oldWorkDate - Old work date
   * @param oldStartTime - Old start time
   * @param newWorkDate - New work date
   * @param newStartTime - New start time
   * @param maxNumReminders - Maximum number of reminders
   */
  updateReminderSchedules(
    jobId: string,
    oldWorkDate: string,
    oldStartTime: string,
    newWorkDate: string,
    newStartTime: string,
    maxNumReminders: number
  ): Promise<string[]>;
}

