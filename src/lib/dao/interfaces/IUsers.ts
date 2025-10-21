import { User } from "@/model/interfaces/User";

export interface IUsers {
  getUsers(): Promise<User[]>;
  insertUsers(
    users: {
      first_name: string;
      last_name: string;
      role: "MANAGER" | "ASSOCIATE";
      email?: string | null;
      phone_number: string;
      sms_opt_out?: boolean | null;
      whatsapp?: string | null;
      auth_id?: string | null;
    }[]
  ): Promise<User[]>;
  updateUser(
    id: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      role: "MANAGER" | "ASSOCIATE";
      email: string | null;
      phone_number: string;
      sms_opt_out: boolean | null;
      whatsapp: string | null;
      auth_id: string | null;
    }>
  ): Promise<User[]>;
  deleteUser(id: string): Promise<{ success: boolean }>;
  getUserById(id: string): Promise<User | null>;
  getUserByPhone(phoneNumber: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUsersByRole(role: "MANAGER" | "ASSOCIATE"): Promise<User[]>;
}
