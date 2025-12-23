import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { requireCompanyId } from '@/lib/auth/getCompanyId';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Get authenticated user and company
    const companyId = await requireCompanyId();
    const supabase = await createClient();

    // Get company's Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company || !company.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      );
    }

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}


