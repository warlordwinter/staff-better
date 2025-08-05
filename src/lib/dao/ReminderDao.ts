// src/dao/ReminderDao.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReminderAssignment } from "@/model/interfaces/ReminderAssignment";

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

  // console.log("Raw data from Supabase:", JSON.stringify(data, null, 2));
  // console.log("Associates array:", data.associates);
  // console.log("Jobs array:", data.jobs);

  // Handle arrays - take the first (and should be only) element
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
  maxReminders: number = 3
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
    .lt("num_reminders", maxReminders)
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
export async function getTwoDaysBeforeReminders(targetDate: Date, maxReminders: number = 3): Promise<ReminderAssignment[]> {
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
        .lt('num_reminders', maxReminders) // Haven't exceeded max reminders
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

// Get assignments that haven't been reminded recently (optional filter)
export async function getAssignmentsNotRecentlyReminded(
    assignments: ReminderAssignment[], 
    minHoursSinceLastReminder: number = 4
): Promise<ReminderAssignment[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - minHoursSinceLastReminder);

    return assignments.filter(assignment => {
        // If no last confirmation time, they haven't been reminded recently
        if (!assignment.last_confirmation_time) {
            return true;
        }

        // Check if last reminder was before our cutoff time
        return assignment.last_confirmation_time < cutoffTime;
    });
}


// Get assignments that need morning-of reminders (work date is today, start time is within next 1-2 hours)
export async function getMorningOfReminders(maxReminders: number = 3, hoursAhead: number = 2): Promise<ReminderAssignment[]> {
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
        .lt('num_reminders', maxReminders) // Haven't exceeded max reminders
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

// Helper function to transform the data (reused across functions)
function transformReminderData(data: any[]): ReminderAssignment[] {
  return data.map((item) => {
    // Handle both array and object cases for associates/jobs
    const associateData = item.associates as any;
    const jobData = item.jobs as any;

    const associate = Array.isArray(associateData)
      ? associateData[0]
      : associateData;
    const job = Array.isArray(jobData) ? jobData[0] : jobData;

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
