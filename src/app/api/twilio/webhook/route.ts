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

    console.log("Parsed values:", { fromNumber, messageBody, toNumber });

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

    // Find the associate first to get company_id for message processing
    const supabaseAdmin = createAdminClient();
    const { normalizePhoneForLookup } = await import("@/utils/phoneUtils");
    const normalizedFrom = normalizePhoneForLookup(fromNumber);

    console.log(
      `🔍 Looking up associate: ${fromNumber} → normalized: ${normalizedFrom}`
    );

    // Try normalized phone number first
    let { data: associate, error: associateError } = await supabaseAdmin
      .from("associates")
      .select("id, company_id, phone_number")
      .eq("phone_number", normalizedFrom)
      .single();

    // If no match and numbers are different, try original format
    if (
      associateError &&
      associateError.code === "PGRST116" &&
      normalizedFrom !== fromNumber
    ) {
      console.log(
        `⚠️ No match for normalized phone, trying original: ${fromNumber}`
      );
      const result = await supabaseAdmin
        .from("associates")
        .select("id, company_id, phone_number")
        .eq("phone_number", fromNumber)
        .single();

      associate = result.data;
      associateError = result.error;
    }

    const companyId = associate?.company_id || undefined;

    // Process message for reminders/confirmations (existing functionality)
    // Pass toNumber and companyId so handlers can reply from correct number
    const result = await messageService.processIncomingMessage(
      fromNumber,
      messageBody,
      toNumber || undefined,
      companyId
    );

    console.log("Message processing result:", result);

    // Also save message to database for messages UI (new functionality)
    // Note: toNumber is optional - we can find the conversation by associate_id alone
    try {
      if (fromNumber && messageBody) {
        if (associateError || !associate || !associate.company_id) {
          console.error(
            "❌ Error finding associate for conversation:",
            associateError
          );
          console.error(
            "❌ Failed to save message - associate not found for phone:",
            normalizedFrom,
            "(also tried original:",
            fromNumber,
            ")"
          );
        } else {
          console.log(
            `✅ Found associate: ${associate.id} (company: ${associate.company_id}, stored phone: ${associate.phone_number})`
          );
          // Find or create conversation using associate_id and company_id
          console.log(
            `🔍 Looking for conversation: associate_id=${associate.id}, company_id=${associate.company_id}`
          );
          const { data: conversations, error: conversationError } =
            await supabaseAdmin
              .from("conversations")
              .select("*")
              .eq("associate_id", associate.id)
              .eq("company_id", associate.company_id)
              .limit(1);

          let conversation_id: string | undefined;

          if (
            conversationError ||
            !conversations ||
            conversations.length === 0
          ) {
            // Create new conversation
            console.log("📝 Creating new conversation...");
            const { data: newConversation, error: createError } =
              await supabaseAdmin
                .from("conversations")
                .insert([
                  {
                    associate_id: associate.id,
                    company_id: associate.company_id,
                  },
                ])
                .select()
                .single();

            if (createError || !newConversation) {
              console.error("❌ Error creating conversation:", createError);
              console.error(
                "❌ Failed to save message - conversation creation failed"
              );
            } else {
              conversation_id = newConversation.id;
              console.log("✅ Created new conversation:", conversation_id);
            }
          } else {
            conversation_id = conversations[0].id;
            console.log("✅ Found existing conversation:", conversation_id);
          }

          // Save inbound message if we have a conversation_id
          if (conversation_id) {
            const messageData = {
              conversation_id,
              sender_type: "associate",
              body: messageBody.trim(),
              direction: "inbound",
              sent_at: new Date().toISOString(),
            };

            console.log("💾 Attempting to save message:", {
              conversation_id,
              body_length: messageData.body.length,
              direction: messageData.direction,
            });

            const { data: insertedMessage, error: insertError } =
              await supabaseAdmin
                .from("messages")
                .insert([messageData])
                .select()
                .single();

            if (insertError) {
              console.error(
                "❌ Error saving message to Supabase:",
                insertError
              );
              console.error(
                "❌ Failed to save message - insert error:",
                JSON.stringify(insertError, null, 2)
              );
            } else {
              console.log(
                "✅ Successfully saved incoming message to Supabase:",
                insertedMessage?.id
              );
            }
          } else {
            console.error(
              "❌ Failed to save message - no conversation_id available"
            );
          }
        }
      } else {
        console.error("Missing required fields for saving message:", {
          fromNumber: !!fromNumber,
          messageBody: !!messageBody,
          toNumber: !!toNumber,
        });
      }
    } catch (dbError) {
      // Don't fail the webhook if DB save fails
      console.error("Error saving message to database:", dbError);
      console.error(
        "Database error details:",
        dbError instanceof Error ? dbError.message : String(dbError)
      );
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
