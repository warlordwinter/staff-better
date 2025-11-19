import { NextRequest, NextResponse } from "next/server";
import { fetchApprovedTemplates, fetchTemplateBySid } from "@/lib/twilio/templates";

/**
 * GET /api/twilio/templates
 * Fetch approved Twilio WhatsApp templates
 * 
 * Query parameters:
 * - includePending: boolean - Include pending templates (default: false)
 * - contentType: string - Filter by content type (e.g., "twilio/text")
 * - sid: string - Fetch a specific template by SID
 * 
 * @example
 * GET /api/twilio/templates
 * GET /api/twilio/templates?includePending=true
 * GET /api/twilio/templates?sid=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateSid = searchParams.get("sid");
    const includePending = searchParams.get("includePending") === "true";
    const contentType = searchParams.get("contentType") || undefined;

    // If a specific SID is requested, fetch that template
    if (templateSid) {
      const template = await fetchTemplateBySid(templateSid);
      
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          template,
        },
        { status: 200 }
      );
    }

    // Otherwise, fetch all approved templates
    const result = await fetchApprovedTemplates({
      includePending,
      contentType,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to fetch templates",
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        templates: result.templates,
        total: result.total,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch templates",
      },
      { status: 500 }
    );
  }
}

