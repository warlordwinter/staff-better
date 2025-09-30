// Supabase implementation of associate repository

import { IAssociateRepository } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { AssociatesDaoSupabase } from "../../dao/implementations/supabase/AssociatesDaoSupabase";

export class AssociateRepositorySupabase implements IAssociateRepository {
  private associatesDao = new AssociatesDaoSupabase();

  async getAssociateByPhone(phoneNumber: string): Promise<Associate | null> {
    return await this.associatesDao.getAssociateByPhone(phoneNumber);
  }

  async optOutAssociate(associateId: string): Promise<void> {
    await this.associatesDao.optOutAssociate(associateId);
  }
}
