import { createServerSupabaseClient } from "../supabase/server";

export async function insertJobsAssignments(
    jobsAssignments: {
        job_id: string;
        associate_id: string;
        confirmation_status: 'Unconfirmed',
        last_confirmation_status: null,
        work_date: string,
        start_time: string,
    }[]
) {
    const supabase = await createServerSupabaseClient();
    console.log ("Job Assignment Creation: ", jobsAssignments);
    const { data, error } = await supabase.from("jobassignments").insert(jobsAssignments).select();

    if (error) {
        console.error("Error in JobAssignmentsDao");
        throw new Error(JSON.stringify(error));
    }

    return data;
}