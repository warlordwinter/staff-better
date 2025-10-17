export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role?: string | null;
  email?: string | null;
  phone_number?: string | null;
  sms_opt_out?: boolean | null;
  whatsapp?: string | null;
  created_at?: string | null;
  auth_id?: string | null;
}

export interface UserInsert {
  first_name: string;
  last_name: string;
  role?: string | null;
  email?: string | null;
  phone_number?: string | null;
  sms_opt_out?: boolean | null;
  whatsapp?: string | null;
  auth_id?: string | null;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  role?: string | null;
  email?: string | null;
  phone_number?: string | null;
  sms_opt_out?: boolean | null;
  whatsapp?: string | null;
}
