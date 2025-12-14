import { NextRequest, NextResponse } from "next/server";
import {
  requireCompanyId,
  requireCompanyWhatsAppNumber,
} from "@/lib/auth/getCompanyId";
import { TwilioMessageService } from "@/lib/services/implementations/TwilioMessageService";

/**
 * POST /api/associates/[id]/whatsapp
 * Send a WhatsApp message to an individual associate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated and has a company
    console.log(
      "📱 [WHATSAPP DEBUG] Starting WhatsApp message send process..."
    );
    const companyId = await requireCompanyId();
    console.log("📱 [WHATSAPP DEBUG] Company ID:", companyId);

    const whatsappNumber = await requireCompanyWhatsAppNumber(companyId);
    console.log("📱 [WHATSAPP DEBUG] Company WhatsApp number:", whatsappNumber);

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

    // Check if associate has opted out (using SMS opt-out for now, could add WhatsApp-specific opt-out later)
    if (associate.sms_opt_out) {
      return NextResponse.json(
        { error: "Associate has opted out of messages" },
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

    // Send the WhatsApp message using TwilioMessageService
    try {
      const messageService = new TwilioMessageService();
      const formattedPhone = messageService.formatPhoneNumber(
        associate.phone_number
      );

      console.log("📱 [WHATSAPP DEBUG] About to send WhatsApp message with:");
      console.log("📱 [WHATSAPP DEBUG]   FROM:", whatsappNumber);
      console.log("📱 [WHATSAPP DEBUG]   TO:", formattedPhone);
      console.log(
        "📱 [WHATSAPP DEBUG]   BODY:",
        body.message.trim().substring(0, 50) + "..."
      );

      const result = await messageService.sendWhatsAppBusiness(
        {
          to: formattedPhone,
          body: body.message.trim(),
        },
        whatsappNumber
      );

      console.log("📱 [WHATSAPP DEBUG] WhatsApp message sent result:", {
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
        if (
          errorCode === "21610" ||
          String(errorCode) === "21610" ||
          (typeof errorMessage === "string" &&
            errorMessage.toLowerCase().includes("unsubscribed"))
        ) {
          return NextResponse.json(
            {
              error:
                "You cannot message this employee because they have unsubscribed from WhatsApp notifications.",
              code: errorCode || "21610",
              userFriendly: true,
            },
            { status: 400 }
          );
        }

        // Check for WhatsApp-specific errors (e.g., outside 24-hour window without template)
        if (
          typeof errorMessage === "string" &&
          (errorMessage.toLowerCase().includes("template") ||
            errorMessage.toLowerCase().includes("24 hour") ||
            errorMessage.toLowerCase().includes("session"))
        ) {
          return NextResponse.json(
            {
              error:
                "Cannot send WhatsApp message. You may need to use an approved template for messages outside the 24-hour window.",
              details: errorMessage,
              code: errorCode,
              userFriendly: true,
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            error: "Failed to send WhatsApp message",
            details: errorMessage,
            code: errorCode,
          },
          { status: 500 }
        );
      }

      // Find or create conversation and save message to database
      try {
        const supabaseAdmin = await (
          await import("@/lib/supabase/admin")
        ).createAdminClient();

        // Find or create conversation for WhatsApp channel
        const { data: existingConversations } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("associate_id", associateId)
          .eq("company_id", companyId)
          .eq("channel", "whatsapp")
          .limit(1);

        let conversationId: string | undefined;
        if (existingConversations && existingConversations.length > 0) {
          conversationId = existingConversations[0].id;
        } else {
          // Create new conversation for WhatsApp
          const { data: newConversation, error: createError } =
            await supabaseAdmin
              .from("conversations")
              .insert([
                {
                  associate_id: associateId,
                  company_id: companyId,
                  channel: "whatsapp",
                },
              ])
              .select()
              .single();

          if (createError || !newConversation) {
            console.error("Error creating conversation:", createError);
            // Continue without saving message - WhatsApp was sent successfully
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
            // Continue - WhatsApp was sent successfully
          }
        }
      } catch (dbError) {
        console.error("Error saving message to database:", dbError);
        // Continue - WhatsApp was sent successfully
      }

      return NextResponse.json({
        success: true,
        message_id: result.messageId,
        to: associate.phone_number,
        channel: "whatsapp",
      });
    } catch (whatsappError) {
      console.error("Error sending WhatsApp message:", whatsappError);
      return NextResponse.json(
        {
          error: "Failed to send WhatsApp message",
          details:
            whatsappError instanceof Error
              ? whatsappError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Failed to send WhatsApp message to associate:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to send WhatsApp message";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("WhatsApp Business number not configured")) {
      return NextResponse.json(
        {
          error:
            "WhatsApp Business number not configured. Please set TWILIO_WHATSAPP_NUMBER environment variable.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
