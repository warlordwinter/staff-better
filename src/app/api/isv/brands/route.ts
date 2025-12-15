// API route for Brand registration
import { NextRequest, NextResponse } from 'next/server';
import { A2PRegistrationService } from '@/lib/isv/services/A2PRegistrationService';
import { requireAuthWithSetup } from '@/lib/auth/utils';

/**
 * POST /api/isv/brands
 * Register a new A2P Brand
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
    const { customer_id, brand_name, brand_type, vertical } = body;

    if (!customer_id || !brand_name) {
      return NextResponse.json(
        { error: 'customer_id and brand_name are required' },
        { status: 400 }
      );
    }

    const a2pService = new A2PRegistrationService();
    const brand = await a2pService.registerBrand(customer_id, {
      brandName: brand_name,
      brandType: brand_type,
      vertical,
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error registering brand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register brand' },
      { status: 500 }
    );
  }
}

