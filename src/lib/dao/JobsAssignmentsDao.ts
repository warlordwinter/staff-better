import { createServerSupabaseClient } from "../supabase/server";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

export async function insertJobsAssignments(
    jobsAssignments: {
        job_id: string;
        associate_id: string;
        confirmation_status: 'unconfirmed' | 'soft confirmed' | 'likely confirmed' | 'confirmed' | 'declined';
        work_date: string;
        start_time: string;
        num_reminders?: number;
    }[]
) {
    const supabase = await createServerSupabaseClient();
    console.log("Job Assignment Creation: ", jobsAssignments);
    
    // Use the correct table name (lowercase in Supabase by default)
    const { data, error } = await supabase
        .from("jobassignments")
        .insert(jobsAssignments.map(assignment => ({
            ...assignment,
            num_reminders: assignment.num_reminders || 0
        })))
        .select();

    if (error) {
        console.error("Error in JobAssignmentsDao:", error);
        throw new Error(JSON.stringify(error));
    }

    return data;
}

export async function getJobAssignmentsByJobId(jobId: string) {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
        .from("jobassignments")
        .select(`
            *,
            associates!inner (
                id,
                first_name,
                last_name,
                work_date,
                start_time,
                phone_number,
                email_address
            )
        `)
        .eq('job_id', jobId);

    if (error) {
        console.error("Error fetching job assignments:", error);
        throw new Error(JSON.stringify(error));
    }

    return data;
}

export async function insertSingleJobAssignment(
    jobId: string,
    assignmentData: {
        associate_id: string;
        confirmation_status?: 'unconfirmed' | 'soft confirmed' | 'likely confirmed' | 'confirmed' | 'declined';
        work_date: string;
        start_time: string;
        num_reminders?: number;
    }
) {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
        .from('jobassignments')
        .insert({
            job_id: jobId,
            associate_id: assignmentData.associate_id,
            confirmation_status: assignmentData.confirmation_status || 'unconfirmed',
            work_date: assignmentData.work_date,
            start_time: assignmentData.start_time,
            num_reminders: assignmentData.num_reminders || 0,
        })
        .select();

    if (error) {
        console.error("Error creating job assignment:", error);
        throw new Error(JSON.stringify(error));
    }

    return data;
}

export async function updateJobAssignment(
    jobId: string,
    associateId: string,
    updates: {
        confirmation_status?: ConfirmationStatus;
        work_date?: string;
        start_time?: string;
        num_reminders?: number;
        last_confirmation_time?: string;
    }
) {
    const supabase = await createServerSupabaseClient();
    console.log("Job Assignment jobid:", jobId);
    console.log("Job Assignment AssociateId:", associateId);
    console.log("Job Assignment updates:", updates);

    const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== "")
    );
    
    const { data, error } = await supabase
        .from("jobassignments")
        .update(cleanedUpdates)
        .eq('job_id', jobId)
        .eq('associate_id', associateId)
        .select();

    if (error) {
        console.error("Error updating job assignment:", error);
        throw new Error(JSON.stringify(error));
    }

    return data;
}

export async function deleteJobAssignment(jobId: string, associateId: string) {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
        .from("jobassignments")
        .delete()
        .eq('job_id', jobId)
        .eq('associate_id', associateId);

    if (error) {
        console.error("Error deleting job assignment:", error);
        throw new Error(JSON.stringify(error));
    }

    return { success: true };
}