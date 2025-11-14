// DAO for ISV Customers
import { createAdminClient } from "@/lib/supabase/admin";
import { ISVCustomer, CustomerOnboardingData } from "../types";

export class ISVCustomerDao {
  private supabase = createAdminClient();

  async create(
    data: CustomerOnboardingData,
    companyId?: string | null
  ): Promise<ISVCustomer> {
    const insertData: Record<string, unknown> = {
      name: data.name,
      legal_name: data.legal_name,
      tax_id: data.tax_id,
      business_type: data.business_type,
      website: data.website,
      address: data.address,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      meta_business_manager_id: data.meta_business_manager_id,
      meta_admin_email: data.meta_admin_email,
      phone_number_preference: data.phone_number_preference,
      estimated_monthly_volume: data.estimated_monthly_volume,
      use_case_descriptions: data.use_case_descriptions,
      opt_in_description: data.opt_in_description,
      status: "pending",
    };

    // Include company_id if provided
    if (companyId) {
      insertData.company_id = companyId;
    }

    const { data: customer, error } = await this.supabase
      .from("isv_customers")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ISV customer: ${error.message}`);
    }

    return customer as ISVCustomer;
  }

  async findById(id: string): Promise<ISVCustomer | null> {
    const { data, error } = await this.supabase
      .from("isv_customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to find ISV customer: ${error.message}`);
    }

    return data as ISVCustomer;
  }

  async findByEmail(email: string): Promise<ISVCustomer | null> {
    const { data, error } = await this.supabase
      .from("isv_customers")
      .select("*")
      .eq("contact_email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to find ISV customer by email: ${error.message}`);
    }

    return data as ISVCustomer;
  }

  async updateStatus(id: string, status: ISVCustomer["status"]): Promise<void> {
    const { error } = await this.supabase
      .from("isv_customers")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to update customer status: ${error.message}`);
    }
  }

  async update(
    id: string,
    updates: Partial<ISVCustomer>
  ): Promise<ISVCustomer> {
    const { data, error } = await this.supabase
      .from("isv_customers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ISV customer: ${error.message}`);
    }

    return data as ISVCustomer;
  }

  async findByCompanyId(companyId: string): Promise<ISVCustomer | null> {
    const { data, error } = await this.supabase
      .from("isv_customers")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(
        `Failed to find ISV customer by company_id: ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as ISVCustomer;
  }

  async listAll(): Promise<ISVCustomer[]> {
    const { data, error } = await this.supabase
      .from("isv_customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list ISV customers: ${error.message}`);
    }

    return (data || []) as ISVCustomer[];
  }
}
