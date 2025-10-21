import { createClient } from "../../../supabase/server";
import { IJobReminders } from "../../interfaces/IJobReminders";
import { JobReminder } from "@/model/interfaces/JobReminder";

export class JobRemindersDaoSupabase implements IJobReminders {
  async getJobReminders(): Promise<JobReminder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("job_reminders").select("*");

    if (error) {
      console.error("Error fetching job reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async getJobRemindersByJobId(jobId: string): Promise<JobReminder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_reminders")
      .select("*")
      .eq("job_id", jobId);

    if (error) {
      console.error("Error fetching job reminders by job ID:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async insertJobReminders(
    reminders: {
      job_id: string;
      reminder_type?: "SMS" | "EMAIL" | "WHATSAPP" | null;
      interval_hours: number;
      last_sent?: string | null;
      max_reminders?: number | null;
    }[]
  ): Promise<JobReminder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_reminders")
      .insert(reminders)
      .select();

    if (error) {
      console.error("Error inserting job reminders:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async updateJobReminder(
    id: string,
    updates: Partial<{
      job_id: string;
      reminder_type: "SMS" | "EMAIL" | "WHATSAPP" | null;
      interval_hours: number;
      last_sent: string | null;
      max_reminders: number | null;
    }>
  ): Promise<JobReminder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_reminders")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating job reminder:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async deleteJobReminder(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("job_reminders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting job reminder:", error);
      throw new Error(JSON.stringify(error));
    }

    return { success: true };
  }

  async getJobReminderById(id: string): Promise<JobReminder | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_reminders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching job reminder by ID:", error);
      return null;
    }

    return data;
  }

  async getRemindersNeedingSending(): Promise<JobReminder[]> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("job_reminders")
      .select("*")
      .or(`last_sent.is.null,last_sent.lt.${now}`);

    if (error) {
      console.error("Error fetching reminders needing sending:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async updateLastSent(id: string, lastSent: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("job_reminders")
      .update({ last_sent: lastSent })
      .eq("id", id);

    if (error) {
      console.error("Error updating last sent:", error);
      throw new Error(JSON.stringify(error));
    }
  }
}
