import { NextRequest, NextResponse } from "next/server";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
} from "@/lib/auth/getCompanyId";
import { TwilioMessageService } from "@/lib/services/implementations/TwilioMessageService";

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
    console.log("📞 [PHONE DEBUG] Starting message send process...");
    const companyId = await requireCompanyId();
    console.log("📞 [PHONE DEBUG] Company ID:", companyId);

    // Ensure ISV customer and Twilio subaccount exist (required by Lambda message router)
    try {
      const { ensureIsvCustomerForCompany } = await import(
        "@/lib/utils/isvCustomerUtils"
      );
      await ensureIsvCustomerForCompany(companyId);
    } catch (isvError) {
      console.error(
        "Failed to ensure ISV customer/Twilio subaccount:",
        isvError
      );
      const errorMessage =
        isvError instanceof Error ? isvError.message : "Unknown error";

      // Provide specific error message for missing Twilio subaccount
      if (errorMessage.includes("Twilio subaccount not configured")) {
        return NextResponse.json(
          {
            error:
              "Twilio subaccount not configured. Please complete the company setup process to enable SMS messaging.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Company setup incomplete. Please contact support to complete company setup.",
        },
        { status: 400 }
      );
    }

    const twoWayPhoneNumber = await requireCompanyPhoneNumber(companyId);
    console.log(
      "📞 [PHONE DEBUG] Company two-way phone number from database:",
      twoWayPhoneNumber
    );

    // Import reminder number for comparison
    const { TWILIO_PHONE_NUMBER_REMINDERS } = await import(
      "@/lib/twilio/client"
    );
    console.log(
      "📞 [PHONE DEBUG] Reminder phone number (for comparison):",
      TWILIO_PHONE_NUMBER_REMINDERS
    );
    console.log(
      "📞 [PHONE DEBUG] Using company two-way number? ",
      twoWayPhoneNumber !== TWILIO_PHONE_NUMBER_REMINDERS
    );
    console.log(
      "📞 [PHONE DEBUG] Numbers match? ",
      twoWayPhoneNumber === TWILIO_PHONE_NUMBER_REMINDERS
        ? "⚠️ WARNING: Using reminder number!"
        : "✓ Using two-way number"
    );

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

    // Send the SMS using TwilioMessageService
    try {
      const messageService = new TwilioMessageService(companyId);
      const formattedPhone = messageService.formatPhoneNumber(
        associate.phone_number
      );

      console.log("📞 [PHONE DEBUG] About to send SMS with:");
      console.log("📞 [PHONE DEBUG]   FROM:", twoWayPhoneNumber);
      console.log("📞 [PHONE DEBUG]   TO:", formattedPhone);
      console.log(
        "📞 [PHONE DEBUG]   BODY:",
        body.message.trim().substring(0, 50) + "..."
      );

      const result = await messageService.sendSMS({
        to: formattedPhone,
        body: body.message.trim(),
        from: twoWayPhoneNumber,
      });

      console.log("📞 [PHONE DEBUG] SMS sent result:", {
        success: result.success,
        messageId: result.success ? result.messageId : "N/A",
        from: result.success ? result.from : "N/A",
        to: result.to,
      });

      if (!result.success) {
        // Check for specific Twilio error codes
        const errorCode = "code" in result ? result.code : null;
        const errorMessage = "error" in result ? result.error : "Unknown error";

        // Twilio error code 21610 = "Attempt to send to unsubscribed recipient"
        // Check for both string and number format
        if (
          errorCode === "21610" ||
          String(errorCode) === "21610" ||
          (typeof errorMessage === "string" &&
            errorMessage.toLowerCase().includes("unsubscribed"))
        ) {
          return NextResponse.json(
            {
              error:
                "You cannot message this employee because they have unsubscribed from SMS notifications.",
              code: errorCode || "21610",
              userFriendly: true,
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            error: "Failed to send message",
            details: errorMessage,
            code: errorCode,
          },
          { status: 500 }
        );
      }

      // Send opt-out message if this is the first direct message (after sending the message)
      try {
        const { sendSMSOptOutIfNeeded } = await import(
          "@/lib/utils/optOutUtils"
        );
        await sendSMSOptOutIfNeeded(
          associate.id,
          associate.phone_number,
          companyId,
          twoWayPhoneNumber
        );
      } catch (optOutError) {
        // Log error but don't fail the message send
        console.error(
          `Failed to send opt-out message for direct message to associate ${associate.id}:`,
          optOutError
        );
      }

      // Find or create conversation and save message to database
      try {
        const supabaseAdmin = await (
          await import("@/lib/supabase/admin")
        ).createAdminClient();

        // Find or create conversation
        const { data: existingConversations } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("associate_id", associateId)
          .eq("company_id", companyId)
          .limit(1);

        let conversationId: string | undefined;
        if (existingConversations && existingConversations.length > 0) {
          conversationId = existingConversations[0].id;
        } else {
          // Create new conversation
          const { data: newConversation, error: createError } =
            await supabaseAdmin
              .from("conversations")
              .insert([
                {
                  associate_id: associateId,
                  company_id: companyId,
                },
              ])
              .select()
              .single();

          if (createError || !newConversation) {
            console.error("Error creating conversation:", createError);
            // Continue without saving message - SMS was sent successfully
          } else {
            conversationId = newConversation.id;
          }
        }

        // Save message to database if we have a conversation_id
        if (conversationId) {
          const { error: insertError } = await supabaseAdmin
            .from("messages")
            .insert([
              {
                conversation_id: conversationId,
                sender_type: "company",
                body: body.message.trim(),
                direction: "outbound",
                status: result.success && result.messageId ? "queued" : null,
                sent_at: new Date().toISOString(),
              },
            ]);

          if (insertError) {
            console.error("Error saving message to database:", insertError);
            // Continue - SMS was sent successfully
          }
        }
      } catch (dbError) {
        console.error("Error saving message to database:", dbError);
        // Continue - SMS was sent successfully
      }

      return NextResponse.json(result);
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
