import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      associateId,
      jobId,
      confirmationStatus,
      phoneNumber,
      flowSid,
      contactChannelAddress,
    } = body;

    console.log("Received Studio confirmation:", {
      associateId,
      jobId,
      confirmationStatus,
      phoneNumber,
      flowSid,
      contactChannelAddress,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!associateId || !jobId || !confirmationStatus) {
      console.error("Missing required fields:", {
        associateId,
        jobId,
        confirmationStatus,
      });
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["associateId", "jobId", "confirmationStatus"],
        },
        { status: 400 }
      );
    }

    // Validate confirmation status
    const validStatuses = ["Confirmed", "Declined", "Unconfirmed"];
    if (!validStatuses.includes(confirmationStatus)) {
      console.error("Invalid confirmation status:", confirmationStatus);
      return NextResponse.json(
        {
          error: "Invalid confirmation status",
          validStatuses,
        },
        { status: 400 }
      );
    }

    const assignmentRepository = serviceContainer.getAssignmentRepository();
    const logger = serviceContainer.getLogger();

    // Update the assignment status
    await assignmentRepository.updateAssignmentStatus(
      jobId,
      associateId,
      confirmationStatus as "Confirmed" | "Declined" | "Unconfirmed"
    );

    logger.info(
      `Assignment status updated: Job ${jobId}, Associate ${associateId}, Status: ${confirmationStatus}`
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Assignment status updated successfully",
      data: {
        associateId,
        jobId,
        confirmationStatus,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating assignment status:", error);

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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
