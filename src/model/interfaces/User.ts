export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: "MANAGER" | "ASSOCIATE";
  email: string | null;
  phone_number: string;
  sms_opt_out: boolean | null;
  whatsapp: string | null;
  created_at: string;
  auth_id: string | null;
}
