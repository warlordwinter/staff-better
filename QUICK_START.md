# Quick Start - Stripe Integration

## 🚀 Get Started in 5 Steps

### 1️⃣ Get Your Stripe Keys
Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/test/apikeys)
- Copy **Publishable key** (pk_test_...)
- Copy **Secret key** (sk_test_...)

### 2️⃣ Add to .env.local
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# You'll add these after creating products
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### 3️⃣ Update Database
```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
```

### 4️⃣ Create Products in Stripe
1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Create:
   - Starter: $29/month → Copy price ID
   - Professional: $49/month → Copy price ID
   - Enterprise: $99/month → Copy price ID
4. Add price IDs to .env.local

### 5️⃣ Test It!
```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook secret (whsec_...) to .env.local
```

Visit: http://localhost:3000/billing

Test card: **4242 4242 4242 4242**

---

## 📁 Files Created

### Configuration
- `src/lib/stripe/server.ts` - Server-side Stripe client
- `src/lib/stripe/client.ts` - Client-side Stripe loader

### API Routes
- `src/app/api/stripe/create-checkout-session/route.ts` - Start subscription
- `src/app/api/stripe/customer-portal/route.ts` - Manage payments
- `src/app/api/stripe/webhook/route.ts` - Handle Stripe events
- `src/app/api/billing/subscription/route.ts` - Get subscription data

### Components
- `src/components/BillingPage.tsx` - Updated with real Stripe integration

### Documentation
- `STRIPE_SETUP.md` - Complete setup guide
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `QUICK_START.md` - This file!

---

## ✅ What Works

- ✅ Subscribe to plans
- ✅ Update payment methods
- ✅ Switch plans
- ✅ Cancel subscriptions
- ✅ View invoices
- ✅ Download invoice PDFs
- ✅ Real-time status updates

---

## 🧪 Test Cards

| Scenario | Card Number |
|----------|-------------|
| Success | 4242 4242 4242 4242 |
| Decline | 4000 0000 0000 0002 |
| 3D Secure | 4000 0027 6000 3184 |

Expiry: Any future date  
CVC: Any 3 digits

---

## 🐛 Troubleshooting

**Problem:** Webhook signature fails
- **Fix:** Make sure webhook secret matches between Stripe CLI and .env.local

**Problem:** No data appears
- **Fix:** Check browser console for errors, verify database columns exist

**Problem:** Can't create checkout session
- **Fix:** Verify price IDs are correct in environment variables

**Problem:** Stripe CLI not installed
- **Fix:** 
  - Mac: `brew install stripe/stripe-cli/stripe`
  - Windows: `scoop install stripe`
  - Or download: https://stripe.com/docs/stripe-cli

---

## 📚 Need More Help?

- Full setup guide: See `STRIPE_SETUP.md`
- Implementation details: See `IMPLEMENTATION_SUMMARY.md`
- Stripe docs: https://stripe.com/docs
- Stripe testing: https://stripe.com/docs/testing

---

## 🎯 Next Steps

1. Test the full subscription flow
2. Verify webhooks are working
3. Check database updates
4. Try canceling a subscription
5. Test payment method updates

When ready for production:
- Activate your Stripe account
- Switch to live keys
- Recreate products in live mode
- Set up production webhook


