// Supabase implementation of associate repository

import { IAssociateRepository } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { AssociatesDaoSupabase } from "../../dao/implementations/supabase/AssociatesDaoSupabase";

export class AssociateRepositorySupabase implements IAssociateRepository {
  private associatesDao = new AssociatesDaoSupabase();

  async getAssociateByPhone(phoneNumber: string): Promise<Associate | null> {
    return await this.associatesDao.getAssociateByPhone(phoneNumber);
  }

  async getAssociateCompanyId(associateId: string): Promise<string | null> {
    // Use admin client to get company_id
    const { createAdminClient } = await import("../../../supabase/admin");
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin
      .from("associates")
      .select("company_id")
      .eq("id", associateId)
      .single();

    return data?.company_id || null;
  }

  async optOutAssociate(associateId: string): Promise<void> {
    await this.associatesDao.optOutAssociate(associateId);
  }

  async optInAssociate(associateId: string): Promise<void> {
    await this.associatesDao.optInAssociate(associateId);
  }
}
