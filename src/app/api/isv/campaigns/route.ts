// API route for Campaign registration
import { NextRequest, NextResponse } from 'next/server';
import { A2PRegistrationService } from '@/lib/isv/services/A2PRegistrationService';
import { requireAuthWithSetup } from '@/lib/auth/utils';

/**
 * POST /api/isv/campaigns
 * Register a new A2P Campaign
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
    const { customer_id, brand_id, use_case, sample_message, estimated_volume } = body;

    if (!customer_id || !brand_id || !use_case || !sample_message) {
      return NextResponse.json(
        { error: 'customer_id, brand_id, use_case, and sample_message are required' },
        { status: 400 }
      );
    }

    const a2pService = new A2PRegistrationService();
    const campaign = await a2pService.registerCampaign(customer_id, brand_id, {
      useCase: use_case,
      sampleMessage: sample_message,
      estimatedVolume: estimated_volume,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error registering campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register campaign' },
      { status: 500 }
    );
  }
}

