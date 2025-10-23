import { Associate } from "@/model/interfaces/Associate";

export interface IAssociates {
  getAssociates(): Promise<Associate[]>;
  insertAssociates(
    associates: {
      first_name: string | null;
      last_name: string | null;
      work_date: string | null;
      start_date: string | null;
      phone_number: string;
      email_address: string | null;
    }[]
  ): Promise<Associate[]>;
  updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string | null;
      last_name: string | null;
      work_date: string | null;
      start_date: string | null;
      phone_number: string;
      email_address: string | null;
    }>
  ): Promise<Associate[]>;
  deleteAssociate(id: string): Promise<{ success: boolean }>;
  getAssociateByPhone(phoneNumber: string): Promise<Associate | null>;
  optOutAssociate(associateId: string): Promise<void>;
}
