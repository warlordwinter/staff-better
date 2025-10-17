import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";
import { Job } from "@/model/interfaces/Job";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(jobs: Partial<Job>[]) {
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
      .select(
        `
        id, 
        title, 
        location, 
        company_id, 
        associate_id, 
        start_date, 
        end_date, 
        pay_rate, 
        incentive_bonus, 
        num_reminders, 
        job_status
      `
      )
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    return data;
  }

  // Get jobs by company ID
  async getJobsByCompanyId(companyId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id, 
        title, 
        location, 
        company_id, 
        associate_id, 
        start_date, 
        end_date, 
        pay_rate, 
        incentive_bonus, 
        num_reminders, 
        job_status
      `
      )
      .eq("company_id", companyId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    return data;
  }

  // Update job
  async updateJob(id: string, updates: Partial<Job>) {
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
      .select(
        `
        id, 
        title, 
        location, 
        company_id, 
        associate_id, 
        start_date, 
        end_date, 
        pay_rate, 
        incentive_bonus, 
        num_reminders, 
        job_status
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    return data;
  }
}
