# ISV Twilio + WhatsApp Platform

This document describes the ISV (Independent Software Vendor) platform that enables multi-tenant Twilio and WhatsApp Business integration.

## Overview

The ISV platform allows you to:
- Automatically create Twilio subaccounts for each customer
- Register A2P 10DLC Brands and Campaigns
- Onboard customers to WhatsApp Business
- Route messages per customer
- Manage templates and compliance

## Architecture

### Database Schema

The platform uses the following main tables:
- `isv_customers` - Customer business information
- `twilio_subaccounts` - Subaccount mappings (tokens encrypted)
- `brands` - A2P Brand registrations
- `campaigns` - A2P Campaign registrations
- `isv_numbers` - Provisioned phone numbers
- `templates` - WhatsApp message templates
- `isv_messages` - Message history
- `webhook_events` - Webhook event logs
- `opt_outs` - Suppression list

### Setup

1. **Database Migration**
   ```bash
   # Run the migration in Supabase SQL Editor or via CLI
   # File: supabase/migrations/001_isv_tables.sql
   ```

2. **Environment Variables**
   Copy `.env.example.isv` to `.env.local` and fill in:
   - `TWILIO_MASTER_ACCOUNT_SID` - Your ISV Twilio account SID
   - `TWILIO_MASTER_AUTH_TOKEN` - Your ISV Twilio auth token
   - `ENCRYPTION_KEY` - Generate with: `openssl rand -base64 32`
   - `NEXT_PUBLIC_BASE_URL` - Your app's base URL for webhooks

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Implementation Phases

### Phase 0: Infrastructure ✅
- [x] Database schema migration
- [x] Type definitions
- [x] Configuration setup
- [x] Encryption utilities
- [x] Master Twilio client
- [x] DAO layer foundation

### Phase 1: Core Backend & Subaccount Creation ✅
- [x] Subaccount creation service
- [x] Customer registration API
- [x] Frontend onboarding form
- [x] Customer onboarding service

### Phase 2: A2P 10DLC Registration ✅
- [x] TrustHub Customer Profile creation (placeholder)
- [x] Brand registration service
- [x] Campaign registration service
- [x] Messaging Service provisioning
- [x] Number provisioning service

### Phase 3: WhatsApp Business Onboarding ✅
- [x] WABA linking flow (placeholder)
- [x] Template submission service
- [x] Template status checking

### Phase 4: Webhooks & Message Routing ✅
- [x] Inbound webhook handler
- [x] Delivery status callbacks
- [x] Message storage
- [x] Opt-out handling

### Phase 5: Self-Service Portal
- [ ] Customer dashboard
- [ ] Template management UI
- [ ] Message logs viewer
- [ ] Status monitoring UI

### Phase 6: Monitoring & Production
- [ ] Metrics and alerts
- [ ] Comprehensive tests
- [ ] Security audit

## Security Notes

- All Twilio auth tokens are encrypted at rest using AES-256-GCM
- In production, use AWS KMS or Google Cloud KMS for key management
- Webhook endpoints validate Twilio signatures
- RBAC for admin endpoints

## API Endpoints

### Customer Onboarding
- `POST /api/isv/customers` - Create new customer
- `GET /api/isv/customers/:id` - Get customer details
- `GET /api/isv/customers` - List all customers

### Subaccount Management
- `POST /api/isv/subaccounts` - Create subaccount for customer
- `GET /api/isv/subaccounts/:id` - Get subaccount details

### Webhooks
- `POST /api/isv/webhooks/twilio/inbound` - Inbound message webhook
- `POST /api/isv/webhooks/twilio/status` - Delivery status callback

## Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Generate database types
npm run types:generate
```

## Production Deployment

1. Run database migrations
2. Set environment variables
3. Configure encryption key rotation
4. Set up monitoring and alerts
5. Configure webhook URLs in Twilio

