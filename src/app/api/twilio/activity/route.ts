import { NextRequest, NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { getSubaccountClient } from "@/lib/twilio/subaccountClient";

/**
 * GET /api/twilio/activity
 * 
 * Fetches daily activity data from Twilio Usage Records API for the authenticated user's company.
 * 
 * Query parameters:
 * - month: Month name (e.g., "december", "january")
 * - year: Year (e.g., "2024")
 * 
 * Returns daily breakdown of SMS and WhatsApp messages with credits.
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
      // Return empty array for companies without subaccounts
      console.log("No subaccount found for company, returning empty activity");
      return NextResponse.json([]);
    }

    // Step 5: Query Twilio Usage Records API with daily granularity
    try {
      // Query SMS usage with daily breakdown
      const smsRecords = await subaccountClient.usage.records.daily.list({
        category: "sms" as any,
        startDate: startDateStr,
        endDate: endDateStr,
      } as any);

      // Query WhatsApp usage with daily breakdown
      let whatsappRecords: any[] = [];
      try {
        whatsappRecords = await subaccountClient.usage.records.daily.list({
          category: "whatsapp" as any,
          startDate: startDateStr,
          endDate: endDateStr,
        } as any);
      } catch (whatsappError: any) {
        console.log("WhatsApp usage not available:", whatsappError.message);
      }

      // Step 6: Create a map of dates to usage counts
      const activityMap = new Map<string, { sms: number; whatsapp: number }>();

      // Process SMS records
      smsRecords.forEach((record: any) => {
        const date = record.startDate;
        const count = parseInt(record.count || "0", 10);
        if (!activityMap.has(date)) {
          activityMap.set(date, { sms: 0, whatsapp: 0 });
        }
        activityMap.get(date)!.sms = count;
      });

      // Process WhatsApp records
      whatsappRecords.forEach((record: any) => {
        const date = record.startDate;
        const count = parseInt(record.count || "0", 10);
        if (!activityMap.has(date)) {
          activityMap.set(date, { sms: 0, whatsapp: 0 });
        }
        activityMap.get(date)!.whatsapp = count;
      });

      // Step 7: Convert to array and calculate credits
      const SMS_CREDIT_MULTIPLIER = 7;
      const WHATSAPP_CREDIT_MULTIPLIER = 5;

      const activityData = Array.from(activityMap.entries())
        .map(([dateStr, counts]) => {
          const date = new Date(dateStr);
          return {
            date: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            sms: counts.sms,
            whatsapp: counts.whatsapp,
            credits:
              counts.sms * SMS_CREDIT_MULTIPLIER +
              counts.whatsapp * WHATSAPP_CREDIT_MULTIPLIER,
            rawDate: date,
          };
        })
        .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()) // Sort by date descending
        .slice(0, 30) // Limit to most recent 30 days
        .map((item) => ({
          date: item.date,
          sms: item.sms,
          whatsapp: item.whatsapp,
          credits: item.credits,
        })); // Remove rawDate from final output

      return NextResponse.json(activityData);
    } catch (twilioError: any) {
      console.error("Twilio API error:", twilioError);

      // Handle Twilio-specific errors
      if (twilioError.code === 20003) {
        return NextResponse.json(
          { error: "Invalid Twilio credentials for subaccount" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch activity data from Twilio",
          details: twilioError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in activity API:", error);

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

