// src/dao/ReminderDao.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReminderAssignment } from "@/model/interfaces/ReminderAssignment";

// Add this helper near the top of the file (below imports is fine)
type Confirmation =
  | "Unconfirmed"
  | "Soft Confirmed"
  | "Likely Confirmed"
  | "Confirmed"
  | "Declined";

function toConfirmationStatus(
  value: string | null | undefined
): Confirmation | undefined {
  if (!value) return undefined;
  switch (value.trim().toLowerCase()) {
    case "unconfirmed":
      return "Unconfirmed";
    case "soft confirmed":
      return "Soft Confirmed";
    case "likely confirmed":
      return "Likely Confirmed";
    case "confirmed":
      return "Confirmed";
    case "declined":
      return "Declined";
    default:
      // Unknown string -> treat as undefined (or throw if you prefer)
      return undefined;
  }
}


// Get reminder assignment with all related data
export async function getReminderAssignment(
  jobId: string,
  associateId: string
): Promise<ReminderAssignment | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("jobassignments")
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
    job_title: job.job_title,
    customer_name: job.customer_name,
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
export async function getAllUpcomingReminders(): Promise<ReminderAssignment[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("jobassignments")
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
      job_title: job.job_title,
      customer_name: job.customer_name,
      num_reminders: item.num_reminders,
      last_confirmation_time: item.last_confirmation_time
        ? new Date(item.last_confirmation_time)
        : undefined,
    };
  });
}

// Get assignments by specific date
export async function getAssignmentsByDate(
  date: Date
): Promise<ReminderAssignment[]> {
  const supabase = await createServerSupabaseClient();
  const dateString = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD

  const { data, error } = await supabase
    .from("jobassignments")
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
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error grabbing assignments by date:", error);
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
      job_title: job.job_title,
      customer_name: job.customer_name,
      num_reminders: item.num_reminders,
      last_confirmation_time: item.last_confirmation_time
        ? new Date(item.last_confirmation_time)
        : undefined,
    };
  });
}

export async function getDayBeforeReminders(
  targetDate: Date,
): Promise<ReminderAssignment[]> {
  const supabase = await createServerSupabaseClient();

  const dateString = targetDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("jobassignments")
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
export async function getTwoDaysBeforeReminders(targetDate: Date): Promise<ReminderAssignment[]> {
    const supabase = await createServerSupabaseClient();
    const dateString = targetDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

    const { data, error } = await supabase
        .from("jobassignments")
        .select(`
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
        `)
        .eq('work_date', dateString)
        .gt('num_reminders', 0)
        .order('start_time', { ascending: true });

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
export async function getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[], 
    minHoursSinceLastReminder: number = 4
): Promise<ReminderAssignment[]> {
    // const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - minHoursSinceLastReminder);
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return assignments.filter(assignment => {
        // Skip if confirmation status is Confirmed or Declined
        if (assignment.confirmation_status === 'Confirmed' || 
            assignment.confirmation_status === 'Declined') {
            return false;
        }

        // If no last reminder time, they haven't been reminded recently
        if (!assignment.last_reminder_time) {
            return true;
        }

        // Check if it's the day of the job
        const workDate = new Date(assignment.work_date);
        const today = new Date();
        const isJobToday = workDate.toDateString() === today.toDateString();

        // If it's the day of the job, only use the minHoursSinceLastReminder filter
        if (isJobToday) {
            return assignment.last_reminder_time < cutoffTime;
        }

        // For other days, use the 24-hour filter unless it's the day of
        return assignment.last_reminder_time < twentyFourHoursAgo;
    });
}


// Get assignments that need morning-of reminders (work date is today, start time is within next 1-2 hours)
export async function getMorningOfReminders(hoursAhead: number = 2): Promise<ReminderAssignment[]> {
    const supabase = await createServerSupabaseClient();
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    
    // Calculate time range (current time + hoursAhead)
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    const futureTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000)).toTimeString().split(' ')[0];

    const { data, error } = await supabase
        .from("jobassignments")
        .select(`
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
        `)
        .eq('work_date', todayString)
        .gte('start_time', currentTime) // Start time is after now
        .lte('start_time', futureTime)  // Start time is within the next X hours
        .gt('num_reminders', 0)
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Error grabbing morning-of reminders:", error);
        throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
        return [];
    }

    return transformReminderData(data);
}

type RawReminderRow = {
  job_id: string;
  associate_id: string;
  work_date: string;                     // YYYY-MM-DD
  start_time: string;                    // HH:MM:SS
  num_reminders: number;
  last_confirmation_time?: string | null;
  last_reminder_time?: string | null;
  confirmation_status?: string | null;
  // When selecting relations like `associates:associate_id (...)` and `jobs:job_id (...)`
  // Supabase returns arrays in multi-row selects.
  associates: { first_name: string; last_name: string; phone_number: string }[] | null;
  jobs: { job_title: string; customer_name: string }[] | null;
};

// Helper function to transform the data (reused across functions)
function transformReminderData(data: RawReminderRow[]): ReminderAssignment[] {
  return data.map((item) => {
    const associate = Array.isArray(item.associates) ? item.associates[0] : item.associates;
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
      job_title: job.job_title,
      customer_name: job.customer_name,
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
