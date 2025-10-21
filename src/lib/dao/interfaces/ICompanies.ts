import { Company } from "@/model/interfaces/Company";

export interface ICompanies {
  getCompanies(): Promise<Company[]>;
  insertCompanies(
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
  ): Promise<Company[]>;
  updateCompany(
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
  ): Promise<Company[]>;
  deleteCompany(id: string): Promise<{ success: boolean }>;
  getCompanyById(id: string): Promise<Company | null>;
  getCompanyByUserId(userId: string): Promise<Company | null>;
}
