import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";
import { Job } from "@/model/interfaces/Job";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(jobs: Partial<Job>[]) {
    const supabase = await createClient();
    console.log("Inserting jobs:", jobs);

    // Validate required fields
    for (const job of jobs) {
      if (!job.title || job.title.trim() === "") {
        throw new Error("Job title is required");
      }
      if (!job.company_id) {
        throw new Error("Company ID is required");
      }
    }

    const { data, error } = await supabase.from("jobs").insert(jobs).select();

    if (error) {
      console.error("Supabase insert error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Provide more specific error messages
      if (error.code === "23505") {
        throw new Error("A job with this information already exists");
      } else if (error.code === "23503") {
        throw new Error("Invalid company or associate reference");
      } else if (error.code === "23502") {
        throw new Error("Required field is missing");
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    console.log("Successfully inserted jobs:", data);
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
