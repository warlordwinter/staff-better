import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

const schedulerService = serviceContainer.getSchedulerService();

// Log immediately when module loads
console.log("🔵 [ROUTE] /api/reminders/process route.ts module loaded");
console.log("🔵 [ROUTE] Service container available:", !!serviceContainer);
console.log("🔵 [ROUTE] Scheduler service available:", !!schedulerService);

export async function POST(request: NextRequest) {
  // Log immediately when handler is called
  console.log("🔵 [ROUTE] POST /api/reminders/process - HANDLER CALLED");
  console.log("🔵 [ROUTE] Request URL:", request.url);
  console.log("🔵 [ROUTE] Request method:", request.method);

  try {
    const authHeader = request.headers.get("authorization");
    console.log("🔵 [ROUTE] Auth header present:", !!authHeader);

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("🔵 [ROUTE] Auth failed - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔵 [ROUTE] Auth passed - proceeding");

    console.log("=== REMINDER PROCESSING START (POST) ===");
    console.log("Current time:", new Date().toISOString());

    const results = await schedulerService.runNow();

    console.log("=== REMINDER PROCESSING RESULTS ===");
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${results.filter((r) => r.success).length}`);
    console.log(`Failed: ${results.filter((r) => !r.success).length}`);

    if (results.length === 0) {
      console.warn("⚠️ WARNING: No reminders were processed. This could mean:");
      console.warn("  - No reminders are due at this time");
      console.warn(
        "  - All reminders were filtered out (recently reminded, confirmed, etc.)"
      );
      console.warn("  - Database queries returned no results");
    }

    // Start the reoccurence:
    schedulerService.start();
    console.log("Starting reoccuring scheduler");

    return NextResponse.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      message:
        results.length === 0
          ? "No reminders were found to process. Check logs for details."
          : `Processed ${results.length} reminders successfully.`,
    });
  } catch (error) {
    console.error("=== ERROR PROCESSING REMINDERS (POST) ===");
    console.error("Error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// For manual testing via GET
export async function GET(request: NextRequest) {
  // Log immediately when handler is called
  console.log("🔵 [ROUTE] GET /api/reminders/process - HANDLER CALLED");
  console.log("🔵 [ROUTE] Request URL:", request?.url || "unknown");
  console.log(
    "🔵 [ROUTE] Request headers:",
    JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2)
  );

  try {
    console.log("=== REMINDER PROCESSING START ===");
    console.log("Current time:", new Date().toISOString());

    const results = await schedulerService.runNow();

    console.log("=== REMINDER PROCESSING RESULTS ===");
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${results.filter((r) => r.success).length}`);
    console.log(`Failed: ${results.filter((r) => !r.success).length}`);

    if (results.length === 0) {
      console.warn("⚠️ WARNING: No reminders were processed. This could mean:");
      console.warn("  - No reminders are due at this time");
      console.warn(
        "  - All reminders were filtered out (recently reminded, confirmed, etc.)"
      );
      console.warn("  - Database queries returned no results");
    }

    if (results.length > 0) {
      console.log("Sample results:", results.slice(0, 3));
    }

    return NextResponse.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      message:
        results.length === 0
          ? "No reminders were found to process. Check logs for details."
          : `Processed ${results.length} reminders successfully.`,
    });
  } catch (error) {
    console.error("=== ERROR PROCESSING REMINDERS ===");
    console.error("Error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
