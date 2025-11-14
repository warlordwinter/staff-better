// ISV Platform Type Definitions

export interface ISVCustomer {
  id: string;
  name: string;
  legal_name: string;
  tax_id?: string;
  business_type?: string;
  website?: string;
  address?: string;
  contact_name?: string;
  contact_email: string;
  contact_phone?: string;
  status: 'pending' | 'approved' | 'active' | 'suspended';
  meta_business_manager_id?: string;
  meta_admin_email?: string;
  phone_number_preference?: string;
  estimated_monthly_volume?: number;
  use_case_descriptions?: string;
  opt_in_description?: string;
  created_at: string;
  updated_at: string;
  company_id?: string;
}

export interface TwilioSubaccount {
  id: string;
  customer_id: string;
  subaccount_sid: string;
  auth_token_encrypted: string;
  friendly_name?: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  customer_id: string;
  twilio_brand_sid?: string;
  waba_id?: string;
  brand_type?: string;
  brand_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  customer_id: string;
  brand_id: string;
  campaign_sid?: string;
  use_case?: string;
  estimated_volume?: number;
  sample_message?: string;
  status: 'pending' | 'approved' | 'rejected';
  messaging_service_sid?: string;
  created_at: string;
  updated_at: string;
}

export interface ISVNumber {
  id: string;
  customer_id: string;
  twilio_number_sid: string;
  phone_number: string;
  messaging_service_sid?: string;
  provisioned_for_whatsapp: boolean;
  whatsapp_status?: 'pending' | 'verified' | 'active';
  country_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  customer_id: string;
  template_name: string;
  body: string;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'pending' | 'approved' | 'rejected';
  twilio_template_id?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ISVMessage {
  id: string;
  customer_id: string;
  direction: 'inbound' | 'outbound';
  to_number: string;
  from_number: string;
  body?: string;
  status?: string;
  twilio_sid?: string;
  error_code?: string;
  error_message?: string;
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  customer_id?: string;
  processed: boolean;
  error?: string;
  retry_count: number;
  created_at: string;
  processed_at?: string;
}

export interface OptOut {
  id: string;
  customer_id: string;
  phone_number: string;
  opt_out_type?: 'SMS' | 'WhatsApp' | 'ALL';
  opt_out_method?: 'STOP' | 'MANUAL' | 'COMPLAINT';
  opt_in_proof?: Record<string, unknown>;
  created_at: string;
}

// Onboarding form data
export interface CustomerOnboardingData {
  name: string;
  legal_name: string;
  tax_id?: string;
  business_type?: string;
  website?: string;
  address?: string;
  contact_name?: string;
  contact_email: string;
  contact_phone?: string;
  meta_business_manager_id?: string;
  meta_admin_email?: string;
  phone_number_preference?: string;
  estimated_monthly_volume?: number;
  use_case_descriptions?: string;
  opt_in_description?: string;
}

// Status enums
export type CustomerStatus = 'pending' | 'approved' | 'active' | 'suspended';
export type BrandStatus = 'pending' | 'approved' | 'rejected';
export type CampaignStatus = 'pending' | 'approved' | 'rejected';
export type TemplateStatus = 'pending' | 'approved' | 'rejected';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received';

