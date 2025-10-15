import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      associateName = "Test User",
      jobTitle = "Test Job",
      workDate = "2024-01-15",
      startTime = "09:00",
      location = "Test Location",
    } = body;

    console.log("Testing confirmation SMS:", {
      phoneNumber,
      associateName,
      jobTitle,
      workDate,
      startTime,
      location,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!phoneNumber) {
      console.error("Missing required field: phoneNumber");
      return NextResponse.json(
        {
          error: "Missing required field: phoneNumber",
        },
        { status: 400 }
      );
    }

    const studioService = serviceContainer.getStudioService();
    const logger = serviceContainer.getLogger();

    // Test the confirmation SMS
    const result = await studioService.initiateConfirmationSms({
      associateId: "test-associate-123",
      jobId: "test-job-456",
      phoneNumber,
      associateName,
      jobTitle,
      workDate,
      startTime,
      location,
    });

    if (result.success) {
      logger.info(
        `Test confirmation SMS sent successfully: ${result.executionSid}`
      );

      return NextResponse.json({
        success: true,
        message: "Test confirmation SMS sent successfully",
        data: {
          executionSid: result.executionSid,
          phoneNumber,
          initiatedAt: new Date().toISOString(),
        },
      });
    } else {
      logger.error(`Failed to send test confirmation SMS: ${result.error}`);

      return NextResponse.json(
        {
          error: "Failed to send test confirmation SMS",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending test confirmation SMS:", error);

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
