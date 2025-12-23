# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe subscription billing for Staff Better.

## Prerequisites

- Stripe account (test mode is fine for development)
- Stripe CLI installed (for webhook testing)
- Environment variables configured

## Step 1: Set Up Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe API Keys (get from Stripe Dashboard > Developers > API keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # You'll get this in Step 4

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Price IDs (you'll create these in Step 2)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...
```

## Step 2: Create Products and Prices in Stripe Dashboard

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Create three products with monthly recurring prices:

   **Starter Plan:**
   - Name: `Starter`
   - Price: `$29/month`
   - Copy the Price ID (starts with `price_`) to `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`

   **Professional Plan:**
   - Name: `Professional`
   - Price: `$49/month`
   - Copy the Price ID to `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID`

   **Enterprise Plan:**
   - Name: `Enterprise`
   - Price: `$99/month`
   - Copy the Price ID to `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`

## Step 3: Update Database Schema

Add the following columns to your `companies` table in Supabase:

```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
```

## Step 4: Set Up Webhook Testing (Local Development)

1. Install Stripe CLI if you haven't already:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`) that appears in the terminal
5. Add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. In another terminal, start the Stripe CLI webhook listener:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Navigate to `http://localhost:3000/billing`

4. Test the subscription flow:
   - Click on a plan's "Choose" or "Switch to" button
   - You'll be redirected to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Any future date for expiry, any CVC
   - Complete the checkout

5. Verify the webhook events in the Stripe CLI terminal:
   - You should see `checkout.session.completed` event
   - Check your database to confirm the subscription was saved

6. Test other features:
   - Update payment method
   - View billing history
   - Cancel subscription

## Step 6: Production Setup

When you're ready to go live:

1. **Activate your Stripe account** (complete verification in Stripe Dashboard)

2. **Switch to live mode keys:**
   - Replace `pk_test_...` with `pk_live_...`
   - Replace `sk_test_...` with `sk_live_...`

3. **Recreate products in live mode:**
   - Create the same three products in live mode
   - Update the Price IDs in your environment variables

4. **Set up production webhook:**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the signing secret to your production environment variables

5. **Update production environment variables:**
   - Set `NEXT_PUBLIC_APP_URL` to your production domain
   - Add all Stripe keys and Price IDs

## Testing Scenarios

### Test Card Numbers

Stripe provides several test cards for different scenarios:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`
- **Insufficient funds:** `4000 0000 0000 9995`

[Full list of test cards](https://stripe.com/docs/testing)

### Webhook Events to Test

1. **Successful subscription:**
   - Complete checkout with test card
   - Verify `checkout.session.completed` is received
   - Check database for subscription data

2. **Subscription update:**
   - Change plans
   - Verify `customer.subscription.updated` is received

3. **Subscription cancellation:**
   - Cancel through customer portal
   - Verify `customer.subscription.deleted` is received

4. **Payment failure (using Stripe CLI):**
   ```bash
   stripe trigger payment_intent.payment_failed
   ```

## Troubleshooting

### Webhook signature verification fails
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify webhook listener is running
- Check that the secret matches between Stripe CLI and `.env.local`

### No subscription data appears
- Check the browser console for API errors
- Verify database columns exist
- Check webhook events in Stripe Dashboard

### Checkout redirect fails
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Check that Price IDs are correct
- Look for errors in the browser console

### Database not updating
- Check webhook handler logs
- Verify Supabase admin client has permissions
- Make sure webhook events are being received

## API Routes Reference

- **POST `/api/stripe/create-checkout-session`** - Creates a checkout session for subscription
- **POST `/api/stripe/customer-portal`** - Creates a customer portal session
- **POST `/api/stripe/webhook`** - Handles Stripe webhook events
- **GET `/api/billing/subscription`** - Fetches subscription and invoice data

## Next Steps

After basic integration:

1. **Email notifications:** Use Resend to send receipt emails
2. **Usage-based billing:** Track and bill based on message usage
3. **Proration:** Handle mid-cycle plan changes
4. **Grace period:** Implement retry logic for failed payments
5. **Analytics:** Add subscription metrics to dashboard

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)


