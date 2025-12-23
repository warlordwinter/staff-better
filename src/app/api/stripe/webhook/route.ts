import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;

        if (!companyId) {
          console.error('No company_id in session metadata');
          break;
        }

        // Get the subscription
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update company with subscription details
        await supabase
          .from('companies')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscription.status,
            subscription_plan_id: subscription.items.data[0].price.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', companyId);

        console.log('Subscription created for company:', companyId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find company by customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_plan_id: subscription.items.data[0].price.id,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', company.id);

          console.log('Subscription updated for company:', company.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find company by customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({
              subscription_status: 'canceled',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', company.id);

          console.log('Subscription canceled for company:', company.id);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Find company by customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (company && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          await supabase
            .from('companies')
            .update({
              subscription_status: 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', company.id);

          console.log('Invoice paid for company:', company.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Find company by customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', company.id);

          console.log('Payment failed for company:', company.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}


