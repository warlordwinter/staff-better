import { NextRequest, NextResponse } from "next/server";

// Lightweight endpoint to receive confirmation choice from Twilio Studio
// Expected body from Studio (HTTP Request widget):
// {
//   "confirmation_choice": "1" | "2",
//   "associate_id": "...",           // optional
//   "job_id": "...",                 // optional
//   "contact_channel_address": "+1...", // optional
//   "flow_sid": "FW..."              // optional
// }

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      // Try JSON, otherwise default empty
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    const confirmationChoice = String(body.confirmation_choice || "").trim();
    const associateId = body.associate_id || null;
    const jobId = body.job_id || null;
    const phoneNumber =
      body.contact_channel_address || body.phone_number || null;
    const flowSid = body.flow_sid || null;

    console.log("Studio confirm-response received:", {
      confirmationChoice,
      associateId,
      jobId,
      phoneNumber,
      flowSid,
      raw: body,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      received: {
        confirmationChoice,
        associateId,
        jobId,
        phoneNumber,
        flowSid,
      },
    });
  } catch (error) {
    console.error("Error in confirm-response handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  // Basic CORS support for Studio if needed
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
