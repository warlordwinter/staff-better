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

  const { data, error } = await supabase.from("jobs").insert(jobs).select();

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

// Update job
export async function updateJob(
  id: string,
  updates: Partial<{
    job_title: string;
    customer_name: string;
    job_status: string;
    start_date: string;
  }>
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase update error:", error);
    throw new Error("Failed to update job");
  }

  return data;
}

// Delete job
export async function deleteJob(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error("Failed to delete job");
  }

  return { success: true };
}

// Get single job by ID
export async function getJobById(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, job_title, customer_name, job_status, start_date")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error("Failed to fetch job");
  }

  return data;
}
