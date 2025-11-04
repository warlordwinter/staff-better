import { NextRequest, NextResponse } from "next/server";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
} from "@/lib/auth/getCompanyId";

/**
 * GET /api/company/phone-number
 *
 * Get the company's two-way phone number for the authenticated user
 *
 * Response:
 * - 200: { phone_number: string }
 * - 401: { error: string } (not authenticated or company not found)
 * - 404: { error: string } (phone number not configured)
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const phoneNumber = await requireCompanyPhoneNumber(companyId);

    return NextResponse.json({ phone_number: phoneNumber }, { status: 200 });
  } catch (error) {
    console.error("Error fetching company phone number:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch company phone number";

    if (
      errorMessage.includes("Company not found") ||
      errorMessage.includes("not authenticated")
    ) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("phone number not found")) {
      return NextResponse.json(
        { error: "Company phone number not configured" },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
