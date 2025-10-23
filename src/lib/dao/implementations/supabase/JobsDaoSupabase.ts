import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(
    jobs: {
      job_title: string;
      company_id: string;
      start_date: string;
      job_status: string;
      customer_name: string;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Jobs: ", jobs);

    const { data, error } = await supabase.from("jobs").insert(jobs).select();

    if (error) {
      console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
      throw new Error(JSON.stringify(error));
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
    }));
  }

  // Get jobs
  async getJobs() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, job_title, customer_name, company_id, start_date, job_status"
      )
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
    }));
  }

  // Update job
  async updateJob(
    id: string,
    updates: Partial<{
      job_title: string;
      company_id: string;
      start_date: string;
      job_status: string;
      customer_name: string;
    }>
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error("Failed to update job");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
    }));
  }

  // Delete job
  async deleteJob(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error("Failed to delete job");
    }

    return { success: true };
  }

  // Get single job by ID
  async getJobById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, job_title, company_id, start_date, job_status, customer_name"
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return {
      ...data,
      start_date: data.start_date ? data.start_date.split("T")[0] : null,
    };
  }
}
