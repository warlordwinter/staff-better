import { Job } from "@/model/interfaces/Job";
import { createClient } from "../../../supabase/server";
import { IJobs } from "../../interfaces/IJobs";

export class JobsDaoSupabase implements IJobs {
  // Insert jobs
  async insertJobs(
    jobs: {
      job_title: string;
      company_id: string;
      start_date: string;
      start_time?: string | null;
      job_status: string;
      customer_name: string;
    }[]
  ) {
    const supabase = await createClient();
    console.log("Jobs: ", jobs);

    // Prepare jobs for insertion - conditionally include start_time
    const jobsToInsert = jobs.map(({ start_time, ...job }) => {
      const jobData: any = { ...job };
      // Only include start_time if it has a value
      if (
        start_time !== null &&
        start_time !== undefined &&
        typeof start_time === "string" &&
        start_time.trim() !== ""
      ) {
        // Ensure the timestamp is in the correct format for Supabase TIMESTAMPTZ
        // Accept formats like: "2025-11-10T14:30:00Z" or "2025-11-10T14:30:00+00:00"
        const trimmedTime = start_time.trim();
        jobData.start_time = trimmedTime;
        console.log(`Including start_time in job insert: ${trimmedTime}`);
      } else {
        console.log(
          `start_time is empty or null (value: ${JSON.stringify(
            start_time
          )}), not including in insert`
        );
      }
      return jobData;
    });

    console.log(
      "Jobs to insert (with start_time check):",
      JSON.stringify(jobsToInsert, null, 2)
    );

    let { data, error } = await supabase
      .from("jobs")
      .insert(jobsToInsert)
      .select();

    // Check if error is about missing start_time column
    if (error) {
      const hasStartTime = jobsToInsert.some((job) => job.start_time);
      const errorMessage = error.message || JSON.stringify(error);
      const errorCode = error.code || "";

      console.error("Insert error:", {
        errorMessage,
        errorCode,
        hasStartTime,
        errorDetails: error,
      });

      // If we're trying to save start_time and get a column error, it's likely the column doesn't exist
      if (
        hasStartTime &&
        (errorMessage.includes("column") ||
          errorCode === "42703" ||
          errorMessage.includes("start_time") ||
          errorMessage.toLowerCase().includes("does not exist"))
      ) {
        console.error(
          "ERROR: start_time column does not exist in the jobs table. " +
            "Please add the column with: ALTER TABLE jobs ADD COLUMN start_time TIMESTAMPTZ NULL;"
        );
        throw new Error(
          "start_time column not found in database. Please add the column to the jobs table. " +
            "SQL: ALTER TABLE jobs ADD COLUMN start_time TIMESTAMPTZ NULL;"
        );
      }

      // If it's a different column error and we don't have start_time, just throw
      if (!hasStartTime || !errorMessage.includes("column")) {
        console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
        throw new Error(JSON.stringify(error));
      }

      // If it's a column error but not specifically about start_time, retry without it
      console.warn(
        "Column error detected (not start_time), retrying without start_time"
      );
      const jobsWithoutStartTime = jobs.map(({ start_time, ...job }) => job);
      const retryResult = await supabase
        .from("jobs")
        .insert(jobsWithoutStartTime)
        .select();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("Supabase error (raw):", JSON.stringify(error, null, 2));
      throw new Error(JSON.stringify(error));
    }

    // Defensive: handle possible null 'data' value
    if (!data) {
      return [];
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

    // Use select("*") to automatically include all columns (works even if start_time doesn't exist yet)
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch jobs");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return data.map((job) => ({
      ...job,
      start_date: job.start_date ? job.start_date.split("T")[0] : null,
      // start_time will be included if the column exists, otherwise undefined
    }));
  }

  // Update job
  async updateJob(
    id: string,
    updates: Partial<{
      job_title: string;
      company_id: string;
      start_date: string;
      start_time?: string | null;
      job_status: string;
      customer_name: string;
    }>
  ) {
    const supabase = await createClient();

    // Prepare updates - conditionally include start_time
    const updatesToApply: any = { ...updates };

    // Only include start_time if it has a value
    if (updates.start_time !== undefined) {
      if (updates.start_time !== null && updates.start_time.trim() !== "") {
        updatesToApply.start_time = updates.start_time;
        console.log(
          `Including start_time in job update: ${updates.start_time}`
        );
      } else {
        // If explicitly set to null/empty, remove it from updates (don't update the field)
        delete updatesToApply.start_time;
        console.log("start_time is empty or null, not updating it");
      }
    }

    console.log(
      "Job updates to apply:",
      JSON.stringify(updatesToApply, null, 2)
    );

    const { data, error } = await supabase
      .from("jobs")
      .update(updatesToApply)
      .eq("id", id)
      .select();

    if (error) {
      const hasStartTime = updatesToApply.start_time !== undefined;
      const errorMessage = error.message || JSON.stringify(error);
      const errorCode = error.code || "";

      console.error("Update error:", {
        errorMessage,
        errorCode,
        hasStartTime,
        errorDetails: error,
      });

      // If we're trying to update start_time and get a column error, it's likely the column doesn't exist
      if (
        hasStartTime &&
        (errorMessage.includes("column") ||
          errorCode === "42703" ||
          errorMessage.includes("start_time") ||
          errorMessage.toLowerCase().includes("does not exist"))
      ) {
        console.error(
          "ERROR: start_time column does not exist in the jobs table. " +
            "Please add the column with: ALTER TABLE jobs ADD COLUMN start_time TIMESTAMPTZ NULL;"
        );
        throw new Error(
          "start_time column not found in database. Please add the column to the jobs table. " +
            "SQL: ALTER TABLE jobs ADD COLUMN start_time TIMESTAMPTZ NULL;"
        );
      }

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
  /**
   * Fetches a single job by ID.
   * Returns a Job object if found, otherwise throws an error (to match interface contract).
   */
  async getJobById(id: string): Promise<Job> {
    const supabase = await createClient();

    // Use select("*") to automatically include all columns (works even if start_time doesn't exist yet)
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // Check if the error is "not found" (PGRST116 = no rows returned)
      if (error.code === "PGRST116") {
        console.error(`Job with ID ${id} not found`);
        throw new Error("Job not found");
      }
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch job");
    }

    if (!data) {
      throw new Error("Job not found");
    }

    // Format start_date to return only the date portion (YYYY-MM-DD)
    return {
      ...data,
      start_date: data.start_date ? data.start_date.split("T")[0] : null,
    };
  }
}
