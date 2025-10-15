import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assignments, // Array of ReminderAssignment objects
      batchSize = 10, // Optional batch size for processing
    } = body;

    console.log("Processing confirmation SMS batch:", {
      assignmentCount: assignments?.length || 0,
      batchSize,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (
      !assignments ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      console.error("Missing or invalid assignments array");
      return NextResponse.json(
        {
          error: "Missing or invalid assignments array",
          required: "assignments (array of ReminderAssignment objects)",
        },
        { status: 400 }
      );
    }

    const studioReminderService = serviceContainer.getStudioReminderService();
    const logger = serviceContainer.getLogger();

    // Process assignments in batches to avoid overwhelming Twilio
    const results = [];
    const batchSizeNum = Math.min(batchSize, 50); // Cap at 50 to be safe

    for (let i = 0; i < assignments.length; i += batchSizeNum) {
      const batch = assignments.slice(i, i + batchSizeNum);

      logger.info(
        `Processing batch ${Math.floor(i / batchSizeNum) + 1}: ${
          batch.length
        } assignments`
      );

      const batchResult = await studioReminderService.sendBulkConfirmationSms(
        batch
      );
      results.push(batchResult);

      // Add delay between batches to respect rate limits
      if (i + batchSizeNum < assignments.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Aggregate results
    const totalSuccessful = results.reduce(
      (sum, r) => sum + r.summary.successful,
      0
    );
    const totalFailed = results.reduce((sum, r) => sum + r.summary.failed, 0);
    const totalProcessed = totalSuccessful + totalFailed;

    logger.info(
      `Confirmation SMS batch completed: ${totalSuccessful} successful, ${totalFailed} failed out of ${totalProcessed} total`
    );

    return NextResponse.json({
      success: totalFailed === 0,
      message: `Processed ${totalProcessed} confirmation SMS requests`,
      summary: {
        total: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        batches: results.length,
      },
      results: results.map((r) => ({
        summary: r.summary,
        results: r.results.map((item) => ({
          associateId: item.assignment.associate_id,
          jobId: item.assignment.job_id,
          success: item.result.success,
          executionSid: item.result.executionSid,
          error: item.result.error,
        })),
      })),
    });
  } catch (error) {
    console.error("Error processing confirmation SMS batch:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
