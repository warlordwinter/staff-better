// API route for Number provisioning
import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/ServiceContainer';
import { requireAuthWithSetup } from '@/lib/auth/utils';

/**
 * POST /api/isv/numbers
 * Provision a phone number for a customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customer_id, country_code, area_code, campaign_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id is required' },
        { status: 400 }
      );
    }

    const numberService = serviceContainer.getNumberProvisioningService();
    const number = await numberService.provisionNumber(customer_id, {
      countryCode: country_code,
      areaCode: area_code,
      campaignId: campaign_id,
    });

    return NextResponse.json(number, { status: 201 });
  } catch (error) {
    console.error('Error provisioning number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision number' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/isv/numbers?customer_id=xxx
 * List numbers for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_id query parameter is required' },
        { status: 400 }
      );
    }

    const numberService = serviceContainer.getNumberProvisioningService();
    const numbers = await numberService.listCustomerNumbers(customerId);

    return NextResponse.json(numbers, { status: 200 });
  } catch (error) {
    console.error('Error listing numbers:', error);
    return NextResponse.json(
      { error: 'Failed to list numbers' },
      { status: 500 }
    );
  }
}

