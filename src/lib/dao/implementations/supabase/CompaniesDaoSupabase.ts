import { createClient } from "../../../supabase/server";
import { ICompanies } from "../../interfaces/ICompanies";
import { Company } from "@/model/interfaces/Company";

export class CompaniesDaoSupabase implements ICompanies {
  async getCompanies(): Promise<Company[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("companies").select("*");

    if (error) {
      console.error("Error fetching companies:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async insertCompanies(
    companies: {
      name: string;
      email: string;
      phone_number?: string | null;
      zip_code: string;
      system_readiness?: "yes" | "no" | "maybe" | null;
      referral_source: string;
      setup_completed?: boolean | null;
      user_id?: string | null;
    }[]
  ): Promise<Company[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .insert(companies)
      .select();

    if (error) {
      console.error("Error inserting companies:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async updateCompany(
    id: string,
    updates: Partial<{
      name: string;
      email: string;
      phone_number: string | null;
      zip_code: string;
      system_readiness: "yes" | "no" | "maybe" | null;
      referral_source: string;
      setup_completed: boolean | null;
      user_id: string | null;
    }>
  ): Promise<Company[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating company:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async deleteCompany(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      console.error("Error deleting company:", error);
      throw new Error(JSON.stringify(error));
    }

    return { success: true };
  }

  async getCompanyById(id: string): Promise<Company | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching company by ID:", error);
      return null;
    }

    return data;
  }

  async getCompanyByUserId(userId: string): Promise<Company | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching company by user ID:", error);
      return null;
    }

    return data;
  }
}
