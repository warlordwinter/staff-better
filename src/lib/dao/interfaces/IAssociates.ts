import { Associate } from "@/model/interfaces/Associate";

export interface IAssociates {
  getAssociates(): Promise<any[]>;
  insertAssociates(
    associates: {
      first_name: string;
      last_name: string;
      work_date: string;
      start_time: string;
      phone_number: string;
      email_address: string;
    }[]
  ): Promise<any[]>;
  updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      work_date: string;
      start_time: string;
      phone_number: string;
      email_address: string;
    }>
  ): Promise<any[]>;
  deleteAssociate(id: string): Promise<{ success: boolean }>;
  getAssociateByPhone(phoneNumber: string): Promise<Associate | null>;
  optOutAssociate(associateId: string): Promise<void>;
}
