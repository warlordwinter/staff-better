# Stripe Integration Checklist

Use this checklist to ensure everything is set up correctly.

## ✅ Pre-Integration Checklist

- [ ] Stripe account created at stripe.com
- [ ] In test mode (not activated yet)
- [ ] Stripe packages already installed (stripe, @stripe/stripe-js, @stripe/react-stripe-js)
- [ ] Development server can run (`npm run dev`)

## ✅ Configuration Checklist

### Environment Variables
- [ ] Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to .env.local
- [ ] Added `STRIPE_SECRET_KEY` to .env.local
- [ ] Added `STRIPE_WEBHOOK_SECRET` to .env.local (get from Stripe CLI)
- [ ] Added `NEXT_PUBLIC_APP_URL=http://localhost:3000` to .env.local
- [ ] Added `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` to .env.local
- [ ] Added `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID` to .env.local
- [ ] Added `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID` to .env.local
- [ ] Restarted dev server after adding environment variables

### Database Schema
- [ ] Added `stripe_customer_id` column to companies table
- [ ] Added `stripe_subscription_id` column to companies table
- [ ] Added `subscription_status` column to companies table
- [ ] Added `subscription_plan_id` column to companies table
- [ ] Added `current_period_end` column to companies table
- [ ] Verified columns exist in Supabase table editor

### Stripe Dashboard Setup
- [ ] Created "Starter" product at $29/month
- [ ] Copied Starter price ID to environment variables
- [ ] Created "Professional" product at $49/month
- [ ] Copied Professional price ID to environment variables
- [ ] Created "Enterprise" product at $99/month
- [ ] Copied Enterprise price ID to environment variables
- [ ] All products set to "Recurring" billing
- [ ] All products set to "Monthly" interval

### Stripe CLI
- [ ] Installed Stripe CLI
- [ ] Logged in with `stripe login`
- [ ] Started webhook listener: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Copied webhook signing secret to .env.local
- [ ] Webhook listener shows "Ready!"

## ✅ Testing Checklist

### Basic Flow
- [ ] Navigate to http://localhost:3000/billing
- [ ] Page loads without errors
- [ ] See "No Active Subscription" message (if first time)
- [ ] See three plan cards (Starter, Professional, Enterprise)

### Subscription Creation
- [ ] Click "Choose Professional" button
- [ ] Redirected to Stripe Checkout
- [ ] Checkout page loads correctly
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Enter any future expiry date
- [ ] Enter any CVC (e.g., 123)
- [ ] Enter billing details (can use fake info)
- [ ] Click "Subscribe"
- [ ] Redirected back to billing page
- [ ] See "Professional Plan" with "Active" badge
- [ ] See next billing date
- [ ] See payment method (Visa •••• 4242)

### Webhook Verification
- [ ] Check Stripe CLI terminal for `checkout.session.completed` event
- [ ] Check Supabase companies table for updated row:
  - [ ] `stripe_customer_id` is populated
  - [ ] `stripe_subscription_id` is populated
  - [ ] `subscription_status` is "active"
  - [ ] `subscription_plan_id` matches your Professional price ID
  - [ ] `current_period_end` is set to next month

### Billing History
- [ ] Scroll to "Billing History" section
- [ ] See at least one invoice
- [ ] Invoice shows correct amount ($49.00)
- [ ] Invoice status is "Paid"
- [ ] Click download button
- [ ] PDF opens in new tab

### Payment Method Update
- [ ] Click "Update Card" button
- [ ] Redirected to Stripe Customer Portal
- [ ] Customer Portal loads correctly
- [ ] See current payment method
- [ ] Click back to return to billing page
- [ ] Successfully returned to billing page

### Plan Change
- [ ] Click "Switch to Enterprise" button
- [ ] Redirected to Stripe Checkout
- [ ] Complete checkout with test card
- [ ] Redirected back to billing page
- [ ] Plan updated to "Enterprise Plan"
- [ ] Webhook event received: `customer.subscription.updated`
- [ ] Database updated with new plan ID

### Subscription Cancellation
- [ ] Click "Cancel Subscription" button
- [ ] Confirmation dialog appears
- [ ] Click "Cancel Subscription" in dialog
- [ ] Redirected to Customer Portal
- [ ] Can cancel subscription there
- [ ] Return to billing page
- [ ] Badge shows "Canceling"

## ✅ Error Handling Checklist

### Test Failed Payment
- [ ] Try subscribing with decline card: 4000 0000 0000 0002
- [ ] See appropriate error message
- [ ] No subscription created in database

### Test Missing Environment Variable
- [ ] Temporarily remove a price ID from .env.local
- [ ] Restart server
- [ ] Navigate to billing page
- [ ] Button is disabled for that plan
- [ ] Console shows warning

### Test Invalid Webhook Signature
- [ ] Stop Stripe CLI webhook listener
- [ ] Try to complete a checkout
- [ ] Checkout succeeds but webhook isn't processed
- [ ] Restart webhook listener
- [ ] Events start processing again

## ✅ Code Quality Checklist

- [ ] No console errors in browser
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Loading spinners show during async operations
- [ ] Error messages displayed to user via toast
- [ ] Success messages displayed after actions
- [ ] Buttons disabled during loading states
- [ ] All API routes return proper status codes
- [ ] Webhook signature verification working

## ✅ Documentation Checklist

- [ ] Read `QUICK_START.md`
- [ ] Read `STRIPE_SETUP.md`
- [ ] Read `IMPLEMENTATION_SUMMARY.md`
- [ ] Understand the data flow
- [ ] Know where to find Stripe logs
- [ ] Know how to access Stripe Dashboard

## ✅ Production Readiness Checklist (Do This Later)

- [ ] Stripe account fully activated
- [ ] Business information verified
- [ ] Bank account connected
- [ ] Products recreated in live mode
- [ ] Live mode API keys obtained
- [ ] Production environment variables set
- [ ] Production webhook endpoint configured
- [ ] Webhook signing secret updated
- [ ] SSL certificate installed
- [ ] Test with real (small) payment
- [ ] Customer support email configured
- [ ] Terms of service link added
- [ ] Privacy policy link added
- [ ] Refund policy documented

## 🎉 Success Criteria

You've successfully integrated Stripe if:

✅ You can create a subscription from the billing page
✅ The subscription appears in your Stripe Dashboard
✅ The subscription data is saved to your database
✅ Webhooks are being received and processed
✅ You can view invoices and download PDFs
✅ You can update payment methods via Customer Portal
✅ You can switch plans
✅ You can cancel subscriptions

## 🐛 Common Issues

**Issue:** "No such price" error
- **Cause:** Price ID doesn't exist or is from different mode
- **Fix:** Verify price ID in Stripe Dashboard matches .env.local

**Issue:** Webhook signature verification failed
- **Cause:** Wrong webhook secret or listener not running
- **Fix:** Copy correct secret from Stripe CLI, ensure listener is running

**Issue:** Database not updating
- **Cause:** Webhooks not being received or processed
- **Fix:** Check Stripe CLI terminal for events, check webhook handler logs

**Issue:** "Customer not found" error
- **Cause:** Trying to access portal before subscribing
- **Fix:** Subscribe first, then access portal features

**Issue:** Checkout doesn't redirect back
- **Cause:** Wrong NEXT_PUBLIC_APP_URL
- **Fix:** Verify URL matches your dev server (http://localhost:3000)

## 📞 Getting Help

If stuck:
1. Check browser console for errors
2. Check Stripe CLI terminal for webhook events
3. Check Supabase logs for database errors
4. Review Stripe Dashboard > Developers > Logs
5. See troubleshooting section in STRIPE_SETUP.md

## 🎯 What's Next?

Once basic integration works:
1. Test all scenarios thoroughly
2. Add email notifications
3. Customize Stripe Checkout branding
4. Add usage-based billing
5. Implement free trial
6. Add subscription analytics
7. Prepare for production launch


