import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(
    jobs: {
      title: string;
      location?: string;
      company_id: string;
      associate_id: string;
      start_date: string;
      end_date?: string;
      num_reminders?: number;
      job_status: string;
      client_company: string;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Jobs: ", jobs);

    const { data, error } = await supabase.from("jobs").insert(jobs).select();

    if (error) {
      console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
      throw new Error(JSON.stringify(error));
    }

    return data;
  }

  // Get jobs
  async getJobs() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, location, company_id, associate_id, start_date, end_date, num_reminders, job_status, client_company")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    return data;
  }

  // Update job
  async updateJob(
    id: string,
    updates: Partial<{
      title: string;
      location?: string;
      company_id: string;
      associate_id: string;
      start_date: string;
      end_date?: string;
      num_reminders?: number;
      job_status: string;
      client_company: string;
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

    return data;
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
      .select("id, title, location, company_id, associate_id, start_date, end_date, num_reminders, job_status, client_company")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    return data;
  }
}
