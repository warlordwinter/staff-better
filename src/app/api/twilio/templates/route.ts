import { NextRequest, NextResponse } from "next/server";
import {
  fetchApprovedTemplates,
  fetchTemplateBySid,
  createTemplate,
  submitTemplateForApproval,
} from "@/lib/twilio/templates";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

/**
 * GET /api/twilio/templates
 * Fetch approved Twilio WhatsApp templates for the authenticated company
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
    // Get company ID for the authenticated user
    const companyId = await requireCompanyId();

    const searchParams = request.nextUrl.searchParams;
    const templateSid = searchParams.get("sid");
    const includePending = searchParams.get("includePending") === "true";
    const contentType = searchParams.get("contentType") || undefined;

    // If a specific SID is requested, fetch that template
    if (templateSid) {
      const template = await fetchTemplateBySid(templateSid, companyId);

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

    // Otherwise, fetch all approved templates for this company
    const result = await fetchApprovedTemplates(
      {
        includePending,
        contentType,
      },
      companyId
    );

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

/**
 * POST /api/twilio/templates
 * Create a new Twilio Content API template
 *
 * Request body:
 * {
 *   friendlyName: string;
 *   language: string;
 *   category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
 *   contentType: string;
 *   types: Record<string, any>;
 *   variables?: Record<string, string>;
 *   submitForApproval?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const body = await request.json();

    // Validate required fields
    if (!body.friendlyName || !body.types) {
      return NextResponse.json(
        { error: "friendlyName and types are required" },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (body.category && !["MARKETING", "UTILITY", "AUTHENTICATION"].includes(body.category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be MARKETING, UTILITY, or AUTHENTICATION" },
        { status: 400 }
      );
    }

    // Create template in Twilio
    const result = await createTemplate(
      {
        friendlyName: body.friendlyName,
        language: body.language || "en",
        types: body.types,
        variables: body.variables,
      },
      companyId
    );

    // If submitForApproval is true, submit immediately
    let approvalStatus = null;
    if (body.submitForApproval && body.category) {
      try {
        const approvalResult = await submitTemplateForApproval(
          result.sid,
          body.category,
          companyId,
          body.friendlyName
        );
        approvalStatus = approvalResult.status;
      } catch (approvalError) {
        console.error("Error submitting template for approval:", approvalError);
        // Continue even if approval submission fails - template was created
      }
    }

    return NextResponse.json(
      {
        success: true,
        sid: result.sid,
        status: result.status,
        approvalStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create template",
      },
      { status: 500 }
    );
  }
}
