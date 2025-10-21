export interface ICompanyUsers {
  // Company Associates
  addAssociateToCompany(companyId: string, userId: string): Promise<void>;
  removeAssociateFromCompany(companyId: string, userId: string): Promise<void>;
  getCompanyAssociates(companyId: string): Promise<string[]>; // Returns array of user IDs
  getCompaniesByAssociate(userId: string): Promise<string[]>; // Returns array of company IDs

  // Company Managers
  addManagerToCompany(companyId: string, userId: string): Promise<void>;
  removeManagerFromCompany(companyId: string, userId: string): Promise<void>;
  getCompanyManagers(companyId: string): Promise<string[]>; // Returns array of user IDs
  getCompaniesByManager(userId: string): Promise<string[]>; // Returns array of company IDs

  // Check relationships
  isUserAssociateOfCompany(userId: string, companyId: string): Promise<boolean>;
  isUserManagerOfCompany(userId: string, companyId: string): Promise<boolean>;
}
