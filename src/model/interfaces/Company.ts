export interface Company {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
  zip_code: string;
  system_readiness: "yes" | "no" | "maybe" | null;
  referral_source: string;
  setup_completed: boolean | null;
  created_at: string;
  updated_at: string | null;
  user_id: string | null;
}
