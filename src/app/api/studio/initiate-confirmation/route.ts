import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      associateId,
      jobId,
      phoneNumber,
      associateName,
      jobTitle,
      workDate,
      startTime,
      location,
    } = body;

    console.log("Initiating confirmation SMS:", {
      associateId,
      jobId,
      phoneNumber,
      associateName,
      jobTitle,
      workDate,
      startTime,
      location,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!associateId || !jobId || !phoneNumber) {
      console.error("Missing required fields:", {
        associateId,
        jobId,
        phoneNumber,
      });
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["associateId", "jobId", "phoneNumber"],
        },
        { status: 400 }
      );
    }

    const studioService = serviceContainer.getStudioService();
    const logger = serviceContainer.getLogger();

    // Initiate the confirmation SMS
    const result = await studioService.initiateConfirmationSms({
      associateId,
      jobId,
      phoneNumber,
      associateName,
      jobTitle,
      workDate,
      startTime,
      location,
    });

    if (result.success) {
      logger.info(
        `Confirmation SMS initiated successfully: ${result.executionSid}`
      );

      return NextResponse.json({
        success: true,
        message: "Confirmation SMS initiated successfully",
        data: {
          executionSid: result.executionSid,
          associateId,
          jobId,
          phoneNumber,
          initiatedAt: new Date().toISOString(),
        },
      });
    } else {
      logger.error(`Failed to initiate confirmation SMS: ${result.error}`);

      return NextResponse.json(
        {
          error: "Failed to initiate confirmation SMS",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error initiating confirmation SMS:", error);

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
