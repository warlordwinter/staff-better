// src/dao/ReminderDao.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReminderAssignment } from '@/model/interfaces/ReminderAssignment';

// Get reminder assignment with all related data
export async function getReminderAssignment(jobId: string, associateId: string): Promise<ReminderAssignment | null> {
    const supabase = await createServerSupabaseClient();

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
        .eq('job_id', jobId)
        .eq('associate_id', associateId)
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
    const associate = data.associates as unknown as { first_name: string; last_name: string; phone_number: string } | null;
    const job = data.jobs as unknown as { job_title: string; customer_name: string } | null;

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
        last_confirmation_time: data.last_confirmation_time ? new Date(data.last_confirmation_time) : undefined,
    };
}

// Get all upcoming assignments that may need reminders
export async function getAllUpcomingReminders(): Promise<ReminderAssignment[]> {
    const supabase = await createServerSupabaseClient();

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
        .gte('work_date', new Date().toISOString().split('T')[0]) // Today or future
        .order('work_date', { ascending: true });

    if (error) {
        console.error("Error grabbing upcoming reminders:", error);
        throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Transform all records
    return data.map(item => {
        const associate = item.associates?.[0];
        const job = item.jobs?.[0];

        if (!associate || !job) {
            throw new Error(`Missing associate or job data for assignment ${item.job_id}-${item.associate_id}`);
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
            last_confirmation_time: item.last_confirmation_time ? new Date(item.last_confirmation_time) : undefined,
        };
    });
}

// Get assignments by specific date
export async function getAssignmentsByDate(date: Date): Promise<ReminderAssignment[]> {
    const supabase = await createServerSupabaseClient();
    const dateString = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

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
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Error grabbing assignments by date:", error);
        throw new Error(JSON.stringify(error));
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Transform all records
    return data.map(item => {
        const associate = item.associates?.[0];
        const job = item.jobs?.[0];

        if (!associate || !job) {
            throw new Error(`Missing associate or job data for assignment ${item.job_id}-${item.associate_id}`);
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
            last_confirmation_time: item.last_confirmation_time ? new Date(item.last_confirmation_time) : undefined,
        };
    });
}