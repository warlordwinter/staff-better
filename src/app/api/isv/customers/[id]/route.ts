// API route for individual ISV customer operations
import { NextRequest, NextResponse } from 'next/server';
import { ISVCustomerDao } from '@/lib/isv/dao/ISVCustomerDao';
import { CustomerOnboardingService } from '@/lib/isv/services/CustomerOnboardingService';
import { requireAuthWithSetup } from '@/lib/auth/utils';

/**
 * GET /api/isv/customers/[id]
 * Get customer details and onboarding status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const onboardingService = new CustomerOnboardingService();
    const status = await onboardingService.getOnboardingStatus(id);

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Error fetching customer status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/isv/customers/[id]
 * Update customer information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const customerDao = new ISVCustomerDao();
    const updated = await customerDao.update(id, body);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update customer' },
      { status: 500 }
    );
  }
}

