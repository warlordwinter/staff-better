import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function GET() {
  try {
    console.log("=== TEST REMINDERS DEBUG ===");

    // Test the scheduler service runNow method
    const schedulerService = serviceContainer.getSchedulerService();
    const results = await schedulerService.runNow();

    console.log(`Scheduler returned ${results.length} results`);
    console.log("Results:", results);

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results,
    });
  } catch (error) {
    console.error("Error in test reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
