import { serviceContainer } from "@/lib/services/ServiceContainer";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const messageService = serviceContainer.getIncomingMessageService();

export async function POST(request: NextRequest) {
  console.log("=== WEBHOOK HIT ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  // Simple test - if no data, return success to avoid 400 errors
  const url = new URL(request.url);
  if (url.searchParams.get("test") === "true") {
    console.log("Test webhook hit - returning success");
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }

  try {
    // Debug: Log request headers and content type
    console.log(
      "Request headers:",
      Object.fromEntries(request.headers.entries())
    );
    console.log("Content-Type:", request.headers.get("content-type"));

    let fromNumber: string | null = null;
    let messageBody: string | null = null;
    let toNumber: string | null = null;

    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      // Handle form data
      const body = await request.formData();
      fromNumber = body.get("From") as string;
      messageBody = body.get("Body") as string;
      toNumber = body.get("To") as string;

      console.log("Form data keys:", Array.from(body.keys()));
      console.log("Form data entries:", Array.from(body.entries()));
    } else if (contentType?.includes("application/json")) {
      // Handle JSON data
      const body = await request.json();
      fromNumber = body.From || body.from;
      messageBody = body.Body || body.body;
      toNumber = body.To || body.to;

      console.log("JSON data:", body);
    } else {
      // Try to parse as form data anyway
      try {
        const body = await request.formData();
        fromNumber = body.get("From") as string;
        messageBody = body.get("Body") as string;
        toNumber = body.get("To") as string;
        console.log("Fallback form data keys:", Array.from(body.keys()));
      } catch (error) {
        console.error("Failed to parse form data:", error);
      }
    }

    console.log("Parsed values:", { fromNumber, messageBody });

    if (!fromNumber || !messageBody) {
      console.error("Missing required fields:", {
        fromNumber: fromNumber,
        messageBody: messageBody,
        contentType: contentType,
      });
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 400,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Process message for reminders/confirmations (existing functionality)
    const result = await messageService.processIncomingMessage(
      fromNumber,
      messageBody
    );

    console.log("Message processing result:", result);

    // Also save message to database for messages UI (new functionality)
    try {
      if (toNumber && fromNumber && messageBody) {
        const supabaseAdmin = createAdminClient();

        // Find or create conversation
        const { data: conversations, error: conversationError } =
          await supabaseAdmin
            .from("conversations")
            .select("*")
            .or(`participant_a.eq.${fromNumber},participant_b.eq.${fromNumber}`)
            .limit(1);

        let conversation_id: string | undefined;

        if (conversationError || !conversations || conversations.length === 0) {
          // Create new conversation
          const { data: newConversation, error: createError } =
            await supabaseAdmin
              .from("conversations")
              .insert([{ participant_a: fromNumber, participant_b: toNumber }])
              .select()
              .single();

          if (createError || !newConversation) {
            console.error("Error creating conversation:", createError);
          } else {
            conversation_id = newConversation.id;
          }
        } else {
          conversation_id = conversations[0].id;
        }

        // Save inbound message if we have a conversation_id
        if (conversation_id) {
          const { error: insertError } = await supabaseAdmin
            .from("messages")
            .insert([
              {
                conversation_id,
                sender: fromNumber,
                recipient: toNumber,
                body: messageBody.trim(),
                direction: "inbound",
              },
            ]);

          if (insertError) {
            console.error("Error saving message to Supabase:", insertError);
          }
        }
      }
    } catch (dbError) {
      // Don't fail the webhook if DB save fails
      console.error("Error saving message to database:", dbError);
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Error in Twilio webhook handler:", error);

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
