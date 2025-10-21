import { createClient } from "../../../supabase/server";
import { ICompanyUsers } from "../../interfaces/ICompanyUsers";

export class CompanyUsersDaoSupabase implements ICompanyUsers {
  // Company Associates
  async addAssociateToCompany(
    companyId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("company_associates")
      .insert({ company_id: companyId, user_id: userId });

    if (error) {
      console.error("Error adding associate to company:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async removeAssociateFromCompany(
    companyId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("company_associates")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing associate from company:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async getCompanyAssociates(companyId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_associates")
      .select("user_id")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching company associates:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.map((associate) => associate.user_id) || [];
  }

  async getCompaniesByAssociate(userId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_associates")
      .select("company_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching companies by associate:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.map((company) => company.company_id) || [];
  }

  // Company Managers
  async addManagerToCompany(companyId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("company_managers")
      .insert({ company_id: companyId, user_id: userId });

    if (error) {
      console.error("Error adding manager to company:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async removeManagerFromCompany(
    companyId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("company_managers")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing manager from company:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async getCompanyManagers(companyId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_managers")
      .select("user_id")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching company managers:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.map((manager) => manager.user_id) || [];
  }

  async getCompaniesByManager(userId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_managers")
      .select("company_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching companies by manager:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.map((company) => company.company_id) || [];
  }

  // Check relationships
  async isUserAssociateOfCompany(
    userId: string,
    companyId: string
  ): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_associates")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  }

  async isUserManagerOfCompany(
    userId: string,
    companyId: string
  ): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_managers")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  }
}
