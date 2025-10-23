import { NextRequest, NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio/sms";

/**
 * POST /api/associates/[id]/message
 * Send a message to an individual associate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated and has a company
    await requireCompanyId();

    const { id: associateId } = await params;
    const body = await request.json();

    // Validate message
    if (
      !body.message ||
      typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get the associate details
    // Note: We need to get the associate to check their phone and opt-out status
    // For now, we'll use a simple select query
    const supabase = await (
      await import("@/lib/supabase/server")
    ).createClient();

    const { data: associate, error: associateError } = await supabase
      .from("associates")
      .select("id, first_name, last_name, phone_number, sms_opt_out")
      .eq("id", associateId)
      .single();

    if (associateError || !associate) {
      return NextResponse.json(
        { error: "Associate not found" },
        { status: 404 }
      );
    }

    // Check if associate has opted out
    if (associate.sms_opt_out) {
      return NextResponse.json(
        { error: "Associate has opted out of SMS messages" },
        { status: 400 }
      );
    }

    // Check if phone number exists
    if (!associate.phone_number) {
      return NextResponse.json(
        { error: "Associate does not have a phone number" },
        { status: 400 }
      );
    }

    // Send the SMS
    try {
      const formattedPhone = formatPhoneNumber(associate.phone_number);
      const result = await sendSMS({
        to: formattedPhone,
        body: body.message.trim(),
      });

      if (!result.success) {
        return NextResponse.json(
          {
            error: "Failed to send message",
            details: "error" in result ? result.error : "Unknown error",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message_id: result.messageId,
        to: associate.phone_number,
      });
    } catch (smsError) {
      console.error("Error sending SMS:", smsError);
      return NextResponse.json(
        {
          error: "Failed to send message",
          details:
            smsError instanceof Error ? smsError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Failed to send message to associate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
