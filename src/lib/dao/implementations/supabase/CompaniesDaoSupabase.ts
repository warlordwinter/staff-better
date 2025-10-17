import { createClient } from "@/lib/supabase/server";
import { ICompanies } from "@/lib/dao/interfaces/ICompanies";
import {
  Company,
  CompanyInsert,
  CompanyUpdate,
} from "@/model/interfaces/Company";

export class CompaniesDaoSupabase implements ICompanies {
  async createCompany(companyData: CompanyInsert): Promise<Company> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("companies")
      .insert(companyData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create company: ${error.message}`);
    }

    return data;
  }

  async getCompanyById(id: string): Promise<Company | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No rows returned
      }
      throw new Error(`Failed to get company: ${error.message}`);
    }

    return data;
  }

  async getCompanyByManagerId(authUserId: string): Promise<Company | null> {
    const supabase = await createClient();

    // First, get the database user ID from the auth user ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUserId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        console.log("No database user found for auth user:", authUserId);
        return null; // No user found
      }
      throw new Error(`Failed to get user: ${userError.message}`);
    }

    if (!dbUser) {
      console.log("No database user found for auth user:", authUserId);
      return null;
    }

    console.log(
      "Found database user:",
      dbUser.id,
      "for auth user:",
      authUserId
    );

    // Now get the company for this database user
    const { data, error } = await supabase
      .from("company_managers")
      .select(
        `
        companies (
          id,
          name,
          email,
          phone_number,
          zip_code,
          system_readiness,
          referral_source,
          setup_completed,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", dbUser.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("No company found for database user:", dbUser.id);
        return null; // No rows returned
      }
      throw new Error(`Failed to get company by manager: ${error.message}`);
    }

    // Handle the case where companies might be an array or single object
    const company = Array.isArray(data.companies)
      ? data.companies[0]
      : data.companies;

    console.log("Found company:", company?.id, "for database user:", dbUser.id);
    return company || null;
  }

  async updateCompany(
    id: string,
    companyData: CompanyUpdate
  ): Promise<Company> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("companies")
      .update({
        ...companyData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update company: ${error.message}`);
    }

    return data;
  }

  async deleteCompany(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }

  async getAllCompanies(): Promise<Company[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get companies: ${error.message}`);
    }

    return data || [];
  }
}
