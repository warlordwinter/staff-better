-- ISV Twilio + WhatsApp Platform Database Schema
-- This migration creates all tables needed for the ISV platform

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ISV Customers table
-- Maps to the existing companies table but for ISV-specific customer onboarding
CREATE TABLE IF NOT EXISTS isv_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  business_type VARCHAR(50), -- LLC, Corporation, Sole Proprietor, Nonprofit
  website VARCHAR(255),
  address TEXT,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, active, suspended
  meta_business_manager_id VARCHAR(255), -- For WhatsApp integration
  meta_admin_email VARCHAR(255),
  phone_number_preference VARCHAR(50), -- country/area code preference
  estimated_monthly_volume INTEGER,
  use_case_descriptions TEXT,
  opt_in_description TEXT, -- How they collect consent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL -- Link to existing company if applicable
);

-- Twilio Subaccounts table
CREATE TABLE IF NOT EXISTS twilio_subaccounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  subaccount_sid VARCHAR(255) NOT NULL UNIQUE,
  auth_token_encrypted TEXT NOT NULL, -- Encrypted with KMS
  friendly_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands table (A2P 10DLC Brand registrations)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  twilio_brand_sid VARCHAR(255) UNIQUE,
  waba_id VARCHAR(255), -- WhatsApp Business Account ID
  brand_type VARCHAR(50), -- STANDARD, SOLE_PROPRIETOR, etc.
  brand_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table (A2P 10DLC Campaign registrations)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_sid VARCHAR(255) UNIQUE,
  use_case VARCHAR(255),
  estimated_volume INTEGER,
  sample_message TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  messaging_service_sid VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phone Numbers table
CREATE TABLE IF NOT EXISTS isv_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  twilio_number_sid VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  messaging_service_sid VARCHAR(255),
  provisioned_for_whatsapp BOOLEAN DEFAULT FALSE,
  whatsapp_status VARCHAR(50), -- pending, verified, active
  country_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table (WhatsApp message templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50), -- MARKETING, UTILITY, AUTHENTICATION
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  twilio_template_id VARCHAR(255),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (enhanced for ISV)
CREATE TABLE IF NOT EXISTS isv_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  body TEXT,
  status VARCHAR(50), -- queued, sent, delivered, failed, received
  twilio_sid VARCHAR(255),
  error_code VARCHAR(50),
  error_message TEXT,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  event_payload JSONB NOT NULL,
  customer_id UUID REFERENCES isv_customers(id) ON DELETE SET NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Opt-out/Suppression list
CREATE TABLE IF NOT EXISTS opt_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES isv_customers(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  opt_out_type VARCHAR(50), -- SMS, WhatsApp, ALL
  opt_out_method VARCHAR(50), -- STOP, MANUAL, COMPLAINT
  opt_in_proof JSONB, -- Store consent proof (timestamp, IP, method, text)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, phone_number, opt_out_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_twilio_subaccounts_customer_id ON twilio_subaccounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_brands_customer_id ON brands(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_customer_id ON campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_isv_numbers_customer_id ON isv_numbers(customer_id);
CREATE INDEX IF NOT EXISTS idx_templates_customer_id ON templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_isv_messages_customer_id ON isv_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_isv_messages_twilio_sid ON isv_messages(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_id ON webhook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_opt_outs_customer_phone ON opt_outs(customer_id, phone_number);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_isv_customers_updated_at BEFORE UPDATE ON isv_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twilio_subaccounts_updated_at BEFORE UPDATE ON twilio_subaccounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_isv_numbers_updated_at BEFORE UPDATE ON isv_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_isv_messages_updated_at BEFORE UPDATE ON isv_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

