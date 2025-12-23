import { NextResponse } from 'next/server';
import { getCompanyId } from '@/lib/auth/getCompanyId';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe not configured - STRIPE_SECRET_KEY missing');
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethod: null,
      });
    }

    // Import stripe only after checking env var
    const { stripe } = await import('@/lib/stripe/server');

    // Get authenticated user and company (using getCompanyId instead of requireCompanyId)
    const companyId = await getCompanyId();
    
    if (!companyId) {
      console.warn('No company ID found for user');
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethod: null,
      });
    }
    
    const supabase = await createClient();

    // Get company data including Stripe IDs
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.warn('Company not found or error:', companyError);
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethod: null,
      });
    }

    // If no subscription, return default state
    if (!company.stripe_customer_id || !company.stripe_subscription_id) {
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethod: null,
      });
    }

    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      company.stripe_subscription_id,
      {
        expand: ['default_payment_method'],
      }
    );

    // Fetch invoices
    const invoices = await stripe.invoices.list({
      customer: company.stripe_customer_id,
      limit: 10,
    });

    // Format subscription data
    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0].price.id,
      amount: subscription.items.data[0].price.unit_amount,
      currency: subscription.items.data[0].price.currency,
      interval: subscription.items.data[0].price.recurring?.interval,
    };

    // Format payment method data
    let paymentMethodData = null;
    if (subscription.default_payment_method) {
      const pm = subscription.default_payment_method as any;
      if (pm.card) {
        paymentMethodData = {
          type: pm.card.brand,
          last4: pm.card.last4,
          expiryMonth: pm.card.exp_month,
          expiryYear: pm.card.exp_year,
        };
      }
    }

    // Format invoices
    const invoicesData = invoices.data.map((invoice) => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      invoiceUrl: invoice.invoice_pdf || invoice.hosted_invoice_url,
    }));

    return NextResponse.json({
      subscription: subscriptionData,
      invoices: invoicesData,
      paymentMethod: paymentMethodData,
    });
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}


