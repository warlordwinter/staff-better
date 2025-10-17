export interface Company {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  zip_code?: string | null;
  system_readiness?: string | null;
  referral_source?: string | null;
  setup_completed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CompanyInsert {
  name: string;
  email?: string | null;
  phone_number?: string | null;
  zip_code?: string | null;
  system_readiness?: string | null;
  referral_source?: string | null;
  setup_completed?: boolean | null;
}

export interface CompanyUpdate {
  name?: string;
  email?: string | null;
  phone_number?: string | null;
  zip_code?: string | null;
  system_readiness?: string | null;
  referral_source?: string | null;
  setup_completed?: boolean | null;
}
