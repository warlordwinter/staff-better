import { NextRequest, NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { fetchTemplateBySid } from "@/lib/twilio/templates";

/**
 * GET /api/templates/[sid]
 * Fetch template details by SID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sid: string } }
) {
  try {
    const companyId = await requireCompanyId();
    const templateSid = params.sid;

    if (!templateSid) {
      return NextResponse.json(
        { error: "Template SID is required" },
        { status: 400 }
      );
    }

    const template = await fetchTemplateBySid(templateSid, companyId);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sid: template.sid,
      friendlyName: template.friendlyName,
      content: template.content,
      variables: template.variables,
      status: template.status,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch template";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

