import { NextRequest, NextResponse } from "next/server";
import { submitTemplateForApproval } from "@/lib/twilio/templates";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

/**
 * POST /api/twilio/templates/[sid]/approve
 * Submit a template for WhatsApp approval
 *
 * Request body:
 * {
 *   category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
 *   name?: string; // Optional template name, defaults to SID
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { sid: contentSid } = await params;
    const body = await request.json();

    if (!contentSid) {
      return NextResponse.json(
        { error: "Template SID is required" },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (
      !["MARKETING", "UTILITY", "AUTHENTICATION"].includes(body.category)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid category. Must be MARKETING, UTILITY, or AUTHENTICATION",
        },
        { status: 400 }
      );
    }

    const result = await submitTemplateForApproval(
      contentSid,
      body.category,
      companyId,
      body.name
    );

    return NextResponse.json(
      {
        success: true,
        approvalRequestSid: result.approvalRequestSid,
        status: result.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting template for approval:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit template for approval",
      },
      { status: 500 }
    );
  }
}



