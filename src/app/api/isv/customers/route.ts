// API route for ISV customer management
import { NextRequest, NextResponse } from "next/server";
import { CustomerOnboardingService } from "@/lib/isv/services/CustomerOnboardingService";
import { ISVCustomerDao } from "@/lib/isv/dao/ISVCustomerDao";
import { CustomerOnboardingData } from "@/lib/isv/types";
import { requireAuthWithSetup } from "@/lib/auth/utils";
import { getCompanyId } from "@/lib/auth/getCompanyId";

/**
 * POST /api/isv/customers
 * Create a new ISV customer and initiate onboarding
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the company_id for the authenticated user
    const companyId = await getCompanyId();

    const body = await request.json();
    const onboardingData: CustomerOnboardingData = {
      name: body.name,
      legal_name: body.legal_name,
      tax_id: body.tax_id,
      business_type: body.business_type,
      website: body.website,
      address: body.address,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      meta_business_manager_id: body.meta_business_manager_id,
      meta_admin_email: body.meta_admin_email,
      phone_number_preference: body.phone_number_preference,
      estimated_monthly_volume: body.estimated_monthly_volume,
      use_case_descriptions: body.use_case_descriptions,
      opt_in_description: body.opt_in_description,
    };

    // Validate required fields
    if (
      !onboardingData.name ||
      !onboardingData.legal_name ||
      !onboardingData.contact_email
    ) {
      return NextResponse.json(
        { error: "Missing required fields: name, legal_name, contact_email" },
        { status: 400 }
      );
    }

    const onboardingService = new CustomerOnboardingService();
    const customer = await onboardingService.onboardCustomer(
      onboardingData,
      companyId
    );

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Error creating ISV customer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create customer",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/isv/customers
 * List all ISV customers
 */
export async function GET() {
  try {
    // Require authentication
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerDao = new ISVCustomerDao();
    const customers = await customerDao.listAll();

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error("Error listing ISV customers:", error);
    return NextResponse.json(
      { error: "Failed to list customers" },
      { status: 500 }
    );
  }
}
