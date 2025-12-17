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

    // Detect channel: WhatsApp messages have "whatsapp:" prefix in From or To
    const isWhatsApp =
      fromNumber.toLowerCase().startsWith("whatsapp:") ||
      (toNumber && toNumber.toLowerCase().startsWith("whatsapp:"));
    const channel: "sms" | "whatsapp" = isWhatsApp ? "whatsapp" : "sms";
    console.log(`📱 Detected channel: ${channel} (From: ${fromNumber}, To: ${toNumber})`);

    // Strip whatsapp: prefix from phone numbers for lookup
    const normalizedFromForLookup = fromNumber.replace(/^whatsapp:/i, "");

    // Find the associate first to get company_id for message processing
    const supabaseAdmin = createAdminClient();
    const { normalizePhoneForLookup } = await import("@/utils/phoneUtils");
    const normalizedFrom = normalizePhoneForLookup(normalizedFromForLookup);

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
          // Find or create conversation using associate_id, company_id, and channel
          // This ensures SMS and WhatsApp conversations are kept separate
          console.log(
            `🔍 Looking for conversation: associate_id=${associate.id}, company_id=${associate.company_id}, channel=${channel}`
          );

          // First, try to find conversation with exact channel match
          const { data: conversations, error: conversationError } =
            await supabaseAdmin
              .from("conversations")
              .select("*")
              .eq("associate_id", associate.id)
              .eq("company_id", associate.company_id)
              .eq("channel", channel)
              .limit(1);

          let conversation_id: string | undefined;

          // If no conversation found with exact channel match, check for NULL channel (legacy conversations)
          if (!conversationError && (!conversations || conversations.length === 0)) {
            console.log(
              `⚠️ No conversation found with channel=${channel}, checking for legacy conversations (NULL channel)...`
            );
            const { data: legacyConversations, error: legacyError } =
              await supabaseAdmin
                .from("conversations")
                .select("*")
                .eq("associate_id", associate.id)
                .eq("company_id", associate.company_id)
                .is("channel", null)
                .order("updated_at", { ascending: false, nullsFirst: false })
                .order("created_at", { ascending: false, nullsFirst: false });

            if (
              !legacyError &&
              legacyConversations &&
              legacyConversations.length > 0
            ) {
              // If there's exactly one legacy conversation, we can safely update it
              // If there are multiple, we should create a new one to avoid misclassifying
              if (legacyConversations.length === 1) {
                const legacyConversation = legacyConversations[0];
                console.log(
                  `🔄 Found single legacy conversation (NULL channel), updating to channel=${channel}...`
                );
                const { data: updatedConversation, error: updateError } =
                  await supabaseAdmin
                    .from("conversations")
                    .update({ channel: channel })
                    .eq("id", legacyConversation.id)
                    .select()
                    .single();

                if (updateError || !updatedConversation) {
                  console.error("❌ Error updating legacy conversation:", updateError);
                  console.log(
                    `📝 Creating new conversation (update failed) for channel: ${channel}...`
                  );
                } else {
                  conversation_id = updatedConversation.id;
                  console.log(
                    `✅ Updated legacy conversation to channel=${channel}:`,
                    conversation_id
                  );
                }
              } else {
                console.log(
                  `⚠️ Found ${legacyConversations.length} legacy conversations with NULL channel. Creating a new conversation for channel=${channel} to avoid misclassification.`
                );
              }
            }

            // If still no conversation_id, create a new one
            if (!conversation_id) {
              console.log(
                `📝 Creating new conversation (none found) for channel: ${channel}...`
              );
              const { data: newConversation, error: createError } =
                await supabaseAdmin
                  .from("conversations")
                  .insert([
                    {
                      associate_id: associate.id,
                      company_id: associate.company_id,
                      channel: channel,
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
            }
          } else if (conversationError) {
            console.error("❌ Error finding conversation:", conversationError);
            console.log(
              `📝 Creating new conversation (fetch failed) for channel: ${channel}...`
            );
            const { data: newConversation, error: createError } =
              await supabaseAdmin
                .from("conversations")
                .insert([
                  {
                    associate_id: associate.id,
                    company_id: associate.company_id,
                    channel: channel,
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
            // Conversation exists with exact channel match
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
