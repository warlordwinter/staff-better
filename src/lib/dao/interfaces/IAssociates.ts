import { Associate } from "@/model/interfaces/Associate";

export interface IAssociates {
  getAssociates(): Promise<Associate[]>;
  insertAssociates(
    associates: {
      first_name: string;
      last_name: string;
      work_date: string;
      start_date: string;
      phone_number: string;
      email_address: string;
    }[]
  ): Promise<Associate[]>;
  updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      work_date: string;
      start_date: string;
      phone_number: string;
      email_address: string;
    }>
  ): Promise<Associate[]>;
  deleteAssociate(id: string): Promise<{ success: boolean }>;
  getAssociateByPhone(phoneNumber: string): Promise<Associate | null>;
  optOutAssociate(associateId: string): Promise<void>;
}
