import { NextRequest, NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { getSubaccountClient } from "@/lib/twilio/subaccountClient";

/**
 * GET /api/twilio/usage
 * 
 * Fetches usage data from Twilio Usage Records API for the authenticated user's company.
 * 
 * Query parameters:
 * - month: Month name (e.g., "december", "january")
 * - year: Year (e.g., "2024")
 * 
 * Returns usage data including SMS and WhatsApp message counts and credits.
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate user and get companyId
    const companyId = await requireCompanyId();

    // Step 2: Get query parameters
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "Month and year parameters are required" },
        { status: 400 }
      );
    }

    // Step 3: Calculate date range for the month/year
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    const monthIndex = monthNames.indexOf(monthParam.toLowerCase());
    if (monthIndex === -1) {
      return NextResponse.json(
        { error: "Invalid month parameter" },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { error: "Invalid year parameter" },
        { status: 400 }
      );
    }

    // Calculate start and end dates for the month
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // Last day of the month

    const startDateStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const endDateStr = endDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Step 4: Get subaccount client
    const subaccountClient = await getSubaccountClient(companyId);
    if (!subaccountClient) {
      // Return mock data for companies without subaccounts (for development/testing)
      console.log("No subaccount found for company, returning mock data");
      
      return NextResponse.json({
        smsMessages: 0,
        whatsappMessages: 0,
        smsCredits: 0,
        whatsappCredits: 0,
        totalCreditsUsed: 0,
        creditLimit: 25000,
        billingPeriodStart: startDate.toISOString(),
        billingPeriodEnd: endDate.toISOString(),
      });
    }

    // Step 5: Query Twilio Usage Records API
    try {
      // Query SMS usage
      const smsRecords = await subaccountClient.usage.records.list({
        category: "sms" as any,
        startDate: startDateStr,
        endDate: endDateStr,
      } as any);

      // Query WhatsApp usage (handle gracefully if not available)
      let whatsappRecords: any[] = [];
      try {
        whatsappRecords = await subaccountClient.usage.records.list({
          category: "whatsapp" as any,
          startDate: startDateStr,
          endDate: endDateStr,
        } as any);
      } catch (whatsappError: any) {
        // WhatsApp not enabled or category not available - that's okay
        console.log("WhatsApp usage not available:", whatsappError.message);
      }

      // Step 6: Extract counts from usage records
      const smsCount = smsRecords.length > 0 
        ? parseInt(smsRecords[0].count || "0", 10) 
        : 0;
      
      const whatsappCount = whatsappRecords.length > 0
        ? parseInt(whatsappRecords[0].count || "0", 10)
        : 0;

      // Step 7: Calculate credits
      const SMS_CREDIT_MULTIPLIER = 7;
      const WHATSAPP_CREDIT_MULTIPLIER = 5;
      
      const smsCredits = smsCount * SMS_CREDIT_MULTIPLIER;
      const whatsappCredits = whatsappCount * WHATSAPP_CREDIT_MULTIPLIER;
      const totalCreditsUsed = smsCredits + whatsappCredits;

      // TODO: Get credit limit from company settings or config
      const creditLimit = 25000;

      // Step 8: Return JSON matching UsageData interface UsageData
      return NextResponse.json({
        smsMessages: smsCount,
        whatsappMessages: whatsappCount,
        smsCredits,
        whatsappCredits,
        totalCreditsUsed,
        creditLimit,
        billingPeriodStart: startDate.toISOString(),
        billingPeriodEnd: endDate.toISOString(),
      });
    } catch (twilioError: any) {
      console.error("Twilio API error:", twilioError);
      
      // Handle Twilio-specific errors
      if (twilioError.code === 20003) {
        // Invalid credentials
        return NextResponse.json(
          { error: "Invalid Twilio credentials for subaccount" },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to fetch usage data from Twilio", details: twilioError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in usage API:", error);
    
    if (error.message?.includes("Company not found")) {
      return NextResponse.json(
        { error: "Company not found for authenticated user" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

