import { createClient } from "../../../supabase/server";
import { ReminderAssignment } from "@/model/interfaces/ReminderAssignment";
import { IReminder } from "../../interfaces/IReminder";

// Add this helper near the top of the file (below imports is fine)
type Confirmation =
  | "UNCONFIRMED"
  | "SOFT_CONFIRMED"
  | "LIKELY_CONFIRMED"
  | "CONFIRMED"
  | "DECLINED";

function toConfirmationStatus(
  value: string | null | undefined
): Confirmation | undefined {
  if (!value) return undefined;
  switch (value.trim().toLowerCase()) {
    case "unconfirmed":
      return "UNCONFIRMED";
    case "soft confirmed":
      return "SOFT_CONFIRMED";
    case "likely confirmed":
      return "LIKELY_CONFIRMED";
    case "confirmed":
      return "CONFIRMED";
    case "declined":
      return "DECLINED";
    default:
      // Unknown string -> treat as undefined (or throw if you prefer)
      return undefined;
  }
}

type RawReminderRow = {
  job_id: string;
  associate_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  num_reminders: number;
  last_confirmation_time?: string | null;
  last_reminder_time?: string | null;
  confirmation_status?: string | null;
  // When selecting relations like `associates:associate_id (...)` and `jobs:job_id (...)`
  // Supabase returns arrays in multi-row selects.
  associates:
    | { first_name: string; last_name: string; phone_number: string }[]
    | null;
  jobs: { job_title: string; customer_name: string }[] | null;
};

// Helper function to transform the data (reused across functions)
function transformReminderData(data: RawReminderRow[]): ReminderAssignment[] {
  return data.map((item) => {
    const associate = Array.isArray(item.associates)
      ? item.associates[0]
      : item.associates;
    const job = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;

    if (!associate || !job) {
      throw new Error(
        `Missing associate or job data for assignment ${item.job_id}-${item.associate_id}`
      );
    }

    return {
      job_id: item.job_id,
      associate_id: item.associate_id,
      work_date: new Date(item.work_date),
      start_time: item.start_time,
      associate_first_name: associate.first_name,
      associate_last_name: associate.last_name,
      phone_number: associate.phone_number,
      title: job.job_title,
      client_company: job.customer_name,
      num_reminders: item.num_reminders,
      last_confirmation_time: item.last_confirmation_time
        ? new Date(item.last_confirmation_time)
        : undefined,
      last_reminder_time: item.last_reminder_time
        ? new Date(item.last_reminder_time)
        : undefined,
      confirmation_status: toConfirmationStatus(item.confirmation_status),
    };
  });
}

export class ReminderDaoSupabase implements IReminder {
  // Get all reminders that are due to be sent
  async getDueReminders(): Promise<ReminderAssignment[]> {
    console.log("🔍 [DEBUG] Starting getDueReminders...");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(today.getTime() + 48 * 60 * 60 * 1000);

    console.log("🔍 [DEBUG] Date calculations:");
    console.log(`  - Now: ${now.toISOString()}`);
    console.log(`  - Today: ${today.toISOString()}`);
    console.log(`  - Tomorrow: ${tomorrow.toISOString()}`);
    console.log(`  - Day after tomorrow: ${dayAfterTomorrow.toISOString()}`);

    // Get all assignments that need reminders
    const allAssignments: ReminderAssignment[] = [];

    try {
      console.log(
        "🔍 [DEBUG] Getting day-before reminders (tomorrow's jobs)..."
      );
      // Get day-before reminders (tomorrow's jobs)
      const dayBeforeReminders = await this.getDayBeforeReminders(tomorrow);
      console.log(
        `🔍 [DEBUG] Found ${dayBeforeReminders.length} day-before reminders`
      );
      allAssignments.push(...dayBeforeReminders);

      console.log("🔍 [DEBUG] Getting two-days-before reminders...");
      // Get two-days-before reminders (day after tomorrow's jobs)
      const twoDaysBeforeReminders = await this.getTwoDaysBeforeReminders(
        dayAfterTomorrow
      );
      console.log(
        `🔍 [DEBUG] Found ${twoDaysBeforeReminders.length} two-days-before reminders`
      );
      allAssignments.push(...twoDaysBeforeReminders);

      console.log(
        "🔍 [DEBUG] Getting morning-of reminders (today's jobs within next 2 hours)..."
      );
      // Get morning-of reminders (today's jobs within next 2 hours)
      const morningOfReminders = await this.getMorningOfReminders(2);
      console.log(
        `🔍 [DEBUG] Found ${morningOfReminders.length} morning-of reminders`
      );
      allAssignments.push(...morningOfReminders);

      console.log("🔍 [DEBUG] Getting today's jobs that need reminders...");
      // Get today's jobs that need reminders (any time today)
      const todayJobs = await this.getAssignmentsByDate(today);
      console.log(
        `🔍 [DEBUG] Found ${todayJobs.length} jobs for today:`,
        todayJobs.map((j) => ({
          job_id: j.job_id,
          associate_id: j.associate_id,
          work_date: j.work_date,
          start_time: j.start_time,
          num_reminders: j.num_reminders,
        }))
      );

      const todayReminders = todayJobs.filter((assignment) => {
        // Include jobs that haven't been reminded recently and have reminders left
        return assignment.num_reminders > 0;
      });
      console.log(
        `🔍 [DEBUG] Filtered to ${todayReminders.length} jobs that need reminders`
      );
      allAssignments.push(...todayReminders);

      console.log(
        `🔍 [DEBUG] Total assignments before filtering: ${allAssignments.length}`
      );
      console.log(
        "🔍 [DEBUG] All assignments before filtering:",
        allAssignments.map((a) => ({
          job_id: a.job_id,
          associate_id: a.associate_id,
          work_date: a.work_date,
          start_time: a.start_time,
          num_reminders: a.num_reminders,
          last_reminder_time: a.last_reminder_time,
          confirmation_status: a.confirmation_status,
        }))
      );

      // Filter out assignments that have been recently reminded
      console.log("🔍 [DEBUG] Filtering out recently reminded assignments...");
      const filteredAssignments = await this.getAssignmentsNotRecentlyReminded(
        allAssignments
      );

      console.log(
        `🔍 [DEBUG] Final result: ${allAssignments.length} total assignments, ${filteredAssignments.length} after filtering`
      );
      console.log(
        "🔍 [DEBUG] Final filtered assignments:",
        filteredAssignments.map((a) => ({
          job_id: a.job_id,
          associate_id: a.associate_id,
          work_date: a.work_date,
          start_time: a.start_time,
          num_reminders: a.num_reminders,
          last_reminder_time: a.last_reminder_time,
          confirmation_status: a.confirmation_status,
        }))
      );

      return filteredAssignments;
    } catch (error) {
      console.error("🔍 [DEBUG] Error getting due reminders:", error);
      throw error;
    }
  }

  // Get reminder assignment with all related data
  async getReminderAssignment(
    jobId: string,
    associateId: string
  ): Promise<ReminderAssignment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            confirmation_status,
            associates!inner (
                first_name,
                last_name,
                phone_number
            ),
            jobs!inner (
                job_title,
                customer_name
            )
        `
      )
      .eq("job_id", jobId)
      .eq("associate_id", associateId)
      .single();

    if (error) {
      console.error("Error grabbing reminder assignment:", error);
      throw new Error(JSON.stringify(error));
    }

    if (!data) {
      return null;
    }

    const associate = data.associates as unknown as {
      first_name: string;
      last_name: string;
      phone_number: string;
    } | null;
    const job = data.jobs as unknown as {
      job_title: string;
      customer_name: string;
    } | null;

    if (!associate && !job) {
      throw new Error("Missing associate and job data");
    } else if (!associate) {
      throw new Error("Missing associate data");
    } else if (!job) {
      throw new Error("Missing job data");
    }

    return {
      job_id: data.job_id,
      associate_id: data.associate_id,
      work_date: new Date(data.work_date),
      start_time: data.start_time,
      associate_first_name: associate.first_name,
      associate_last_name: associate.last_name,
      phone_number: associate.phone_number,
      title: job.job_title,
      client_company: job.customer_name,
      num_reminders: data.num_reminders,
      last_confirmation_time: data.last_confirmation_time
        ? new Date(data.last_confirmation_time)
        : undefined,
      last_reminder_time: data.last_reminder_time
        ? new Date(data.last_reminder_time)
        : undefined,
      confirmation_status: toConfirmationStatus(data.confirmation_status),
    };
  }

  // Get all upcoming assignments that may need reminders (TODO: NEED TO TEST)
  async getAllUpcomingReminders(): Promise<ReminderAssignment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            associates:associate_id (
                first_name,
                last_name,
                phone_number
            ),
            jobs:job_id (
                job_title,
                customer_name
            )
        `
      )
      .gte("work_date", new Date().toISOString().split("T")[0]) // Today or future
      .order("work_date", { ascending: true });

    if (error) {
      console.error("Error grabbing upcoming reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform all records
    return data.map((item) => {
      const associate = item.associates?.[0];
      const job = item.jobs?.[0];

      if (!associate || !job) {
        throw new Error(
          `Missing associate or job data for assignment ${item.job_id}-${item.associate_id}`
        );
      }

      return {
        job_id: item.job_id,
        associate_id: item.associate_id,
        work_date: new Date(item.work_date),
        start_time: item.start_time,
        associate_first_name: associate.first_name,
        associate_last_name: associate.last_name,
        phone_number: associate.phone_number,
        title: job.job_title,
        client_company: job.customer_name,
        num_reminders: item.num_reminders,
        last_confirmation_time: item.last_confirmation_time
          ? new Date(item.last_confirmation_time)
          : undefined,
      };
    });
  }

  // Get assignments by specific date
  async getAssignmentsByDate(date: Date): Promise<ReminderAssignment[]> {
    const supabase = await createClient();
    const dateString = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD

    // Create start and end of day for range query
    const startOfDay = `${dateString}T00:00:00.000Z`;
    const endOfDay = `${dateString}T23:59:59.999Z`;

    console.log(`Searching for jobs between ${startOfDay} and ${endOfDay}`);

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            confirmation_status,
            associates:associate_id (
                first_name,
                last_name,
                phone_number
            ),
            jobs:job_id (
                job_title,
                customer_name
            )
        `
      )
      .gte("work_date", startOfDay)
      .lte("work_date", endOfDay)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error grabbing assignments by date:", error);
      throw new Error(JSON.stringify(error));
    }

    console.log(
      `Database returned ${data?.length || 0} jobs for date ${dateString}`
    );
    if (data && data.length > 0) {
      console.log("Sample job data:", data[0]);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform all records
    return data.map((item) => {
      const associate = item.associates?.[0];
      const job = item.jobs?.[0];

      if (!associate || !job) {
        throw new Error(
          `Missing associate or job data for assignment ${item.job_id}-${item.associate_id}`
        );
      }

      return {
        job_id: item.job_id,
        associate_id: item.associate_id,
        work_date: new Date(item.work_date),
        start_time: item.start_time,
        associate_first_name: associate.first_name,
        associate_last_name: associate.last_name,
        phone_number: associate.phone_number,
        title: job.job_title,
        client_company: job.customer_name,
        num_reminders: item.num_reminders,
        last_confirmation_time: item.last_confirmation_time
          ? new Date(item.last_confirmation_time)
          : undefined,
      };
    });
  }

  async getDayBeforeReminders(targetDate: Date): Promise<ReminderAssignment[]> {
    const supabase = await createClient();

    const dateString = targetDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            confirmation_status,
            associates:associate_id (
                first_name,
                last_name,
                phone_number
            ),
            jobs:job_id (
                job_title,
                customer_name
            )
            `
      )
      .eq("work_date", dateString)
      .gt("num_reminders", 0)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error grabbing day-before reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
      return [];
    }

    return transformReminderData(data);
  }

  // Get assignments that need two-days-before reminders
  async getTwoDaysBeforeReminders(
    targetDate: Date
  ): Promise<ReminderAssignment[]> {
    const supabase = await createClient();
    const dateString = targetDate.toISOString().split("T")[0]; // Convert to YYYY-MM-DD

    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            confirmation_status,
            associates:associate_id (
                first_name,
                last_name,
                phone_number
            ),
            jobs:job_id (
                job_title,
                customer_name
            )
        `
      )
      .eq("work_date", dateString)
      .gt("num_reminders", 0)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error grabbing two-days-before reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
      return [];
    }

    return transformReminderData(data);
  }

  // Get's and filters out assignments that have already had a recent reminder text
  async getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[],
    minHoursSinceLastReminder: number = 4
  ): Promise<ReminderAssignment[]> {
    console.log(
      `🔍 [DEBUG] Filtering ${assignments.length} assignments with minHoursSinceLastReminder=${minHoursSinceLastReminder}`
    );

    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - minHoursSinceLastReminder);

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    console.log(`🔍 [DEBUG] Time calculations:`);
    console.log(`  - Now: ${now.toISOString()}`);
    console.log(
      `  - Cutoff time (${minHoursSinceLastReminder}h ago): ${cutoffTime.toISOString()}`
    );
    console.log(`  - 24 hours ago: ${twentyFourHoursAgo.toISOString()}`);

    const filtered = assignments.filter((assignment, index) => {
      console.log(
        `🔍 [DEBUG] Checking assignment ${index + 1}/${assignments.length}:`,
        {
          job_id: assignment.job_id,
          associate_id: assignment.associate_id,
          confirmation_status: assignment.confirmation_status,
          last_reminder_time: assignment.last_reminder_time,
          num_reminders: assignment.num_reminders,
        }
      );

      // Skip if confirmation status is Confirmed or Declined
      if (
        assignment.confirmation_status === "CONFIRMED" ||
        assignment.confirmation_status === "DECLINED"
      ) {
        console.log(`🔍 [DEBUG]   ❌ Filtered out: Confirmed/Declined status`);
        return false;
      }

      // If no last reminder time, they haven't been reminded recently
      if (!assignment.last_reminder_time) {
        console.log(`🔍 [DEBUG]   ✅ Included: No last reminder time`);
        return true;
      }

      // Check if it's the day of the job
      const workDate = new Date(assignment.work_date);
      const today = new Date();
      const isJobToday = workDate.toDateString() === today.toDateString();

      console.log(
        `🔍 [DEBUG]   Work date: ${workDate.toDateString()}, Today: ${today.toDateString()}, Is job today: ${isJobToday}`
      );

      // If it's the day of the job, only use the minHoursSinceLastReminder filter
      if (isJobToday) {
        const shouldInclude = assignment.last_reminder_time < cutoffTime;
        console.log(
          `🔍 [DEBUG]   Last reminder: ${assignment.last_reminder_time.toISOString()}, Cutoff: ${cutoffTime.toISOString()}, Should include: ${shouldInclude}`
        );
        return shouldInclude;
      }

      // For other days, use the 24-hour filter unless it's the day of
      const shouldInclude = assignment.last_reminder_time < twentyFourHoursAgo;
      console.log(
        `🔍 [DEBUG]   Last reminder: ${assignment.last_reminder_time.toISOString()}, 24h ago: ${twentyFourHoursAgo.toISOString()}, Should include: ${shouldInclude}`
      );
      return shouldInclude;
    });

    console.log(
      `🔍 [DEBUG] Filtering result: ${assignments.length} -> ${filtered.length} assignments`
    );
    return filtered;
  }

  // Get assignments that need morning-of reminders (work date is today, start time is within next 1-2 hours)
  async getMorningOfReminders(
    hoursAhead: number = 2
  ): Promise<ReminderAssignment[]> {
    const supabase = await createClient();
    const now = new Date();
    const todayString = now.toISOString().split("T")[0];

    // Calculate time range (current time + hoursAhead)
    const currentTime = now.getTime();
    const futureTime = currentTime + hoursAhead * 60 * 60 * 1000;

    console.log(
      `🔍 [DEBUG] getMorningOfReminders: Looking for jobs today (${todayString}) with start_time within next ${hoursAhead} hours`
    );

    // Fetch all jobs for today, then filter by time in JavaScript
    // This avoids PostgreSQL type issues with start_time (which may be stored as TIMESTAMPTZ)
    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
            job_id,
            associate_id,
            work_date,
            start_time,
            num_reminders,
            last_confirmation_time,
            last_reminder_time,
            confirmation_status,
            associates:associate_id (
                first_name,
                last_name,
                phone_number
            ),
            jobs:job_id (
                job_title,
                customer_name
            )
        `
      )
      .eq("work_date", todayString)
      .gt("num_reminders", 0)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error grabbing morning-of reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
      console.log(
        `🔍 [DEBUG] getMorningOfReminders: Found 0 assignments for today`
      );
      return [];
    }

    // Filter assignments where start_time is within the next hoursAhead hours
    const filteredData = data.filter((item) => {
      if (!item.start_time) return false;

      // Parse start_time (could be ISO timestamp or time string)
      let startTimeMs: number;
      try {
        // Try parsing as ISO timestamp first
        const startDate = new Date(item.start_time);
        if (!isNaN(startDate.getTime())) {
          startTimeMs = startDate.getTime();
        } else {
          // If that fails, try parsing as time string and combine with today's date
          const [hours, minutes, seconds] = item.start_time.split(":");
          const today = new Date(todayString);
          today.setUTCHours(
            parseInt(hours) || 0,
            parseInt(minutes) || 0,
            parseInt(seconds) || 0
          );
          startTimeMs = today.getTime();
        }
      } catch {
        return false;
      }

      // Check if start_time is between now and futureTime
      return startTimeMs >= currentTime && startTimeMs <= futureTime;
    });

    console.log(
      `🔍 [DEBUG] getMorningOfReminders: Found ${data.length} assignments for today, ${filteredData.length} within next ${hoursAhead} hours`
    );

    if (filteredData.length === 0) {
      return [];
    }

    return transformReminderData(filteredData);
  }
}
