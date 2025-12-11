import { NextRequest, NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { createTemplate, submitTemplateForApproval } from "@/lib/twilio/templates";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/templates/[id]/submit
 * Submit a template for WhatsApp approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: templateId } = await params;
    const supabase = await createClient();

    // Fetch template from database
    // Try company_templates first, fallback to templates table
    let { data: template, error: fetchError } = await supabase
      .from("company_templates")
      .select("*")
      .eq("id", templateId)
      .eq("company_id", companyId)
      .single();

    // If company_templates doesn't exist, try templates table
    if (fetchError && fetchError.code === "PGRST116") {
      const fallback = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .eq("company_id", companyId)
        .single();
      template = fallback.data;
      fetchError = fallback.error;
    }

    if (fetchError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if template is already submitted or approved
    if (template.status === "pending" || template.status === "approved") {
      return NextResponse.json(
        { error: `Template is already ${template.status}` },
        { status: 400 }
      );
    }

    // Create template in Twilio if not already created
    let twilioTemplateId = template.twilio_template_id;
    if (!twilioTemplateId) {
      try {
        const twilioResult = await createTemplate({
          friendlyName: template.template_name,
          body: template.body,
          language: template.language || "en",
        });
        twilioTemplateId = twilioResult.sid;
      } catch (error) {
        console.error("Error creating template in Twilio:", error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to create template in Twilio",
          },
          { status: 500 }
        );
      }
    }

    // Submit template for approval
    try {
      await submitTemplateForApproval(
        twilioTemplateId,
        (template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION") ||
          "UTILITY"
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

    // Update template status in database
    // Try company_templates first, fallback to templates table
    let { error: updateError } = await supabase
      .from("company_templates")
      .update({
        status: "pending",
        twilio_template_id: twilioTemplateId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .eq("company_id", companyId);

    // If company_templates doesn't exist, try templates table
    if (updateError && updateError.code === "PGRST116") {
      const fallback = await supabase
        .from("templates")
        .update({
          status: "pending",
          twilio_template_id: twilioTemplateId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .eq("company_id", companyId);
      updateError = fallback.error;
    }

    if (updateError) {
      console.warn("Error updating template status:", updateError);
      // Continue anyway since Twilio submission succeeded
    }

    return NextResponse.json({
      success: true,
      message: "Template submitted for approval",
      twilioTemplateId,
    });
  } catch (error: unknown) {
    console.error("Failed to submit template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to submit template";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

