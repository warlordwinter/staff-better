import { createServerSupabaseClient } from "../supabase/server";

export async function insertJobs(
  jobs: {
    job_title: string;
    customer_name: string;
    job_status: string;
    start_date: string;
  }[]
) {
  const supabase = await createServerSupabaseClient();
  console.log("Jobs: ", jobs);

  const { data, error } = await supabase.from("jobs").insert(jobs);

  if (error) {
    console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
    throw new Error(JSON.stringify(error));
  }

  return data;
}
