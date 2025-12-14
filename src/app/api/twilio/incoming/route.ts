import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "twilio";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";
import { normalizePhoneForLookup } from "@/utils/phoneUtils";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";
import { serviceContainer } from "@/lib/services/ServiceContainer";

/**
 * POST /api/twilio/incoming
 *
 * Handles incoming SMS messages from Twilio.
 *
 * Process:
 * 1. Parses incoming form data from Twilio (From, To, Body)
 * 2. Finds or creates a conversation based on participant phone numbers
 * 3. Saves the inbound message to the messages table
 * 4. Returns an empty TwiML response to acknowledge receipt
 *
 * Request body (form-urlencoded):
 * - From: string (sender phone number)
 * - To: string (recipient phone number - your Twilio number)
 * - Body: string (message text)
 *
 * Response:
 * - 200: TwiML XML (empty MessagingResponse)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  console.log("=== INCOMING WEBHOOK HIT ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  // Log request headers to see what Twilio is sending
  console.log(
    "Request headers:",
    Object.fromEntries(request.headers.entries())
  );
  console.log("Content-Type:", request.headers.get("content-type"));
  console.log("User-Agent:", request.headers.get("user-agent"));

  try {
    // Parse form data from Twilio
    const formData = await request.formData();

    // Log all form data keys to see what Twilio sent
    console.log("Form data keys:", Array.from(formData.keys()));

    const From = formData.get("From") as string;
    const To = formData.get("To") as string;
    const Body = formData.get("Body") as string;

    // Log all form data entries for debugging
    console.log("All form data entries:", Array.from(formData.entries()));

    console.log("📨 Incoming message received:", {
      From,
      To,
      Body: Body?.substring(0, 50) + (Body && Body.length > 50 ? "..." : ""),
    });

    // Validate required fields
    if (!From || !To || !Body) {
      console.error("Missing required fields:", { From, To, Body });
      // Still return valid TwiML to avoid Twilio retries
      const response = new twiml.MessagingResponse();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Detect channel: WhatsApp messages have "whatsapp:" prefix in From or To
    const isWhatsApp =
      From.toLowerCase().startsWith("whatsapp:") ||
      To.toLowerCase().startsWith("whatsapp:");
    const channel: "sms" | "whatsapp" = isWhatsApp ? "whatsapp" : "sms";
    console.log(`📱 Detected channel: ${channel} (From: ${From}, To: ${To})`);

    const supabaseAdmin = createAdminClient();

    // Normalize phone number for lookup
    const normalizedFrom = normalizePhoneForLookup(From);
    console.log(
      `🔍 Looking up associate: ${From} → normalized: ${normalizedFrom}`
    );

    // Try normalized phone number first
    // Use .limit(10) to get all potential matches, then filter
    const { data: associates, error: initialAssociateError } =
      await supabaseAdmin
        .from("associates")
        .select("id, company_id, phone_number")
        .eq("phone_number", normalizedFrom)
        .limit(10); // Get all potential matches

    let associateError = initialAssociateError;
    let associate = null;

    // Handle the results
    if (associateError) {
      console.error("❌ Error querying associates:", associateError);
    } else if (associates && associates.length > 0) {
      if (associates.length > 1) {
        console.warn(
          `⚠️ WARNING: Found ${associates.length} associates with phone number ${normalizedFrom}.`
        );
        console.warn(
          "⚠️ Duplicate associates:",
          associates.map((a) => ({ id: a.id, company_id: a.company_id }))
        );
      }

      // Prefer associates with a company_id when there are multiple matches
      const associatesWithCompany = associates.filter((a) => a.company_id);
      if (associatesWithCompany.length > 0) {
        // Use the first associate with a company_id
        associate = associatesWithCompany[0];
        if (associates.length > 1) {
          console.log(
            `✅ Selected associate with company_id from ${associates.length} matches`
          );
        }
      } else {
        // If no associates have a company_id, use the first one (will fail later with better error)
        associate = associates[0];
        console.warn(
          `⚠️ All ${associates.length} associates have null company_id. This will prevent saving the message.`
        );
      }
    }

    // If no match and numbers are different, try original format
    if (!associate && normalizedFrom !== From) {
      console.log(`⚠️ No match for normalized phone, trying original: ${From}`);
      const result = await supabaseAdmin
        .from("associates")
        .select("id, company_id, phone_number")
        .eq("phone_number", From)
        .limit(10);

      if (result.error) {
        associateError = result.error;
      } else if (result.data && result.data.length > 0) {
        if (result.data.length > 1) {
          console.warn(
            `⚠️ WARNING: Found ${result.data.length} associates with phone number ${From}.`
          );
        }

        // Prefer associates with a company_id when there are multiple matches
        const associatesWithCompany = result.data.filter((a) => a.company_id);
        if (associatesWithCompany.length > 0) {
          associate = associatesWithCompany[0];
          if (result.data.length > 1) {
            console.log(
              `✅ Selected associate with company_id from ${result.data.length} matches`
            );
          }
        } else {
          associate = result.data[0];
          console.warn(
            `⚠️ All ${result.data.length} associates have null company_id. This will prevent saving the message.`
          );
        }
        associateError = null;
      }
    }

    if (associateError || !associate) {
      console.error(
        "❌ Error finding associate for conversation:",
        associateError
      );
      console.error(
        "❌ Failed to save message - associate not found for phone:",
        normalizedFrom,
        "(also tried original:",
        From,
        ")"
      );
      // Still return valid TwiML to avoid Twilio retries
      const response = new twiml.MessagingResponse();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (!associate.company_id) {
      console.error(
        "❌ Associate found but has no company_id - cannot save message"
      );
      console.error(
        "❌ Associate ID:",
        associate.id,
        "Phone:",
        normalizedFrom,
        "| Original:",
        From
      );
      console.error(
        "💡 SOLUTION: Update the associate's company_id in the database. The associate needs to be assigned to a company."
      );
      // Still return valid TwiML to avoid Twilio retries
      const response = new twiml.MessagingResponse();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    console.log(
      `✅ Found associate: ${associate.id} (company: ${associate.company_id}, stored phone: ${associate.phone_number})`
    );

    const companyId = associate.company_id;

    // Process message for reminders/confirmations (this updates assignment statuses)
    // This must happen BEFORE saving to database so confirmation status is updated
    const messageService = serviceContainer.getIncomingMessageService();
    try {
      console.log("🔄 Processing message for confirmations/reminders...");
      const result = await messageService.processIncomingMessage(
        From,
        Body,
        To,
        companyId
      );
      console.log("✅ Message processing result:", result);
    } catch (error) {
      // Log error but don't fail the webhook - still save message to DB
      console.error("❌ Error processing message for confirmations:", error);
    }

    // Determine which phone number to use for the conversation
    // If the message is to the reminder number, use the company's two-way number
    if (To === TWILIO_PHONE_NUMBER_REMINDERS) {
      const twoWayNumber = await getCompanyPhoneNumberAdmin(
        associate.company_id
      );
      if (twoWayNumber) {
        console.log(
          `Message from reminder number, using company two-way number: ${twoWayNumber}`
        );
      }
    }

    // Find or create conversation using associate_id, company_id, and channel
    // This ensures SMS and WhatsApp conversations are kept separate
    console.log(
      `🔍 Looking for conversation: associate_id=${associate.id}, company_id=${associate.company_id}, channel=${channel}`
    );

    // First, try to find conversation with exact channel match
    let { data: conversations, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("associate_id", associate.id)
      .eq("company_id", associate.company_id)
      .eq("channel", channel)
      .limit(1);

    let conversation_id: string | undefined;

    // If no conversation found with exact channel match, check for NULL channel (legacy conversations)
    // This handles conversations created before the migration
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
            console.error(
              "❌ Error updating legacy conversation:",
              updateError
            );
            // Fall through to create new conversation
          } else {
            conversation_id = updatedConversation.id;
            console.log(
              `✅ Updated legacy conversation to channel=${channel}:`,
              conversation_id
            );
          }
        } else {
          // Multiple legacy conversations - create a new one to avoid misclassifying
          console.warn(
            `⚠️ Found ${legacyConversations.length} legacy conversations with NULL channel. Creating a new conversation for channel=${channel} to avoid misclassification.`
          );
          // Will fall through to create new conversation
        }
      }
    }

    if (conversationError) {
      console.error("❌ Error fetching conversations:", conversationError);
      // Create new conversation if fetch failed
      console.log(
        `📝 Creating new conversation (fetch failed) for channel: ${channel}...`
      );
      const { data: newConversation, error: createError } = await supabaseAdmin
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
        // Still return valid TwiML
        const response = new twiml.MessagingResponse();
        return new NextResponse(response.toString(), {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      conversation_id = newConversation.id;
      console.log("✅ Created new conversation:", conversation_id);
    } else if (conversations && conversations.length > 0) {
      // Conversation exists with exact channel match
      conversation_id = conversations[0].id;
      console.log("✅ Found existing conversation:", conversation_id);
    } else if (!conversation_id) {
      // No conversation found (neither exact match nor legacy), create a new one
      console.log(
        `📝 Creating new conversation (none found) for channel: ${channel}...`
      );
      const { data: newConversation, error: createError } = await supabaseAdmin
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
        // Still return valid TwiML
        const response = new twiml.MessagingResponse();
        return new NextResponse(response.toString(), {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      conversation_id = newConversation.id;
      console.log("✅ Created new conversation:", conversation_id);
    }

    // Save inbound message
    console.log("💾 Attempting to save message to Supabase:", {
      conversation_id,
      body_length: Body.trim().length,
      direction: "inbound",
    });

    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id,
          sender_type: "associate",
          body: Body.trim(),
          direction: "inbound",
          sent_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error saving message to Supabase:", insertError);
      console.error(
        "❌ Failed to save message - insert error:",
        JSON.stringify(insertError, null, 2)
      );
      // Message received from Twilio but failed to save
      // Log the error but still return success to Twilio
    } else {
      console.log(
        "✅ Successfully saved incoming message to Supabase:",
        insertedMessage?.id
      );
    }

    // Respond to Twilio with empty TwiML
    const response = new twiml.MessagingResponse();
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error in incoming message handler:", error);

    // Always return valid TwiML to Twilio, even on error
    // This prevents Twilio from retrying the request
    const response = new twiml.MessagingResponse();
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
