// Abstract interface for associate data access

import { Associate } from "@/model/interfaces/Associate";

export interface IAssociateRepository {
  getAssociateByPhone(phoneNumber: string): Promise<Associate | null>;
  optOutAssociate(associateId: string): Promise<void>;
}
