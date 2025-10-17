import {
  Company,
  CompanyInsert,
  CompanyUpdate,
} from "@/model/interfaces/Company";

export interface ICompanies {
  createCompany(companyData: CompanyInsert): Promise<Company>;
  getCompanyById(id: string): Promise<Company | null>;
  getCompanyByManagerId(userId: string): Promise<Company | null>;
  updateCompany(id: string, companyData: CompanyUpdate): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  getAllCompanies(): Promise<Company[]>;
}
