import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";
import { Job } from "@/model/interfaces/Job";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(
    jobs: {
      title?: string | null;
      location?: string | null;
      company_id: string;
      associate_id?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      num_reminders?: number | null;
      job_status?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
      client_company?: string | null;
    }[]
  ): Promise<Job[]> {
    const supabase = await createClient();
    console.log("Jobs: ", jobs);

    const { data, error } = await supabase.from("jobs").insert(jobs).select();

    if (error) {
      console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  // Get jobs
  async getJobs(): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    return data || [];
  }

  // Get jobs by company ID
  async getJobsByCompanyId(companyId: string): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", companyId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs by company");
    }

    return data || [];
  }

  // Get jobs by associate ID
  async getJobsByAssociateId(associateId: string): Promise<Job[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("associate_id", associateId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs by associate");
    }

    return data || [];
  }

  // Update job
  async updateJob(
    id: string,
    updates: Partial<{
      title: string | null;
      location: string | null;
      company_id: string;
      associate_id: string | null;
      start_date: string | null;
      end_date: string | null;
      num_reminders: number | null;
      job_status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
      client_company: string | null;
    }>
  ): Promise<Job[]> {
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

    return data || [];
  }

  // Delete job
  async deleteJob(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient();

    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error("Failed to delete job");
    }

    return { success: true };
  }

  // Get single job by ID
  async getJobById(id: string): Promise<Job> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    return data;
  }
}
