import { createServerSupabaseClient } from "../supabase/server";

// Insert jobs
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

// Get jobs
export async function getJobs() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, job_title, customer_name, job_status, start_date")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error("Failed to fetch jobs");
  }

  return data;
}
