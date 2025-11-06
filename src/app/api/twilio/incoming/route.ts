import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "twilio";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";
import { normalizePhoneForLookup } from "@/utils/phoneUtils";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";

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

    const supabaseAdmin = createAdminClient();

    // Normalize phone number for lookup
    const normalizedFrom = normalizePhoneForLookup(From);
    console.log(
      `🔍 Looking up associate: ${From} → normalized: ${normalizedFrom}`
    );

    // Try normalized phone number first
    // Use .limit(1) instead of .single() to handle duplicate phone numbers
    let { data: associates, error: associateError } = await supabaseAdmin
      .from("associates")
      .select("id, company_id, phone_number")
      .eq("phone_number", normalizedFrom)
      .limit(2); // Get up to 2 to detect duplicates

    let associate = null;

    // Handle the results
    if (associateError) {
      console.error("❌ Error querying associates:", associateError);
    } else if (associates && associates.length > 0) {
      if (associates.length > 1) {
        console.warn(
          `⚠️ WARNING: Found ${associates.length} associates with phone number ${normalizedFrom}. Using the first one.`
        );
        console.warn(
          "⚠️ Duplicate associates:",
          associates.map((a) => ({ id: a.id, company_id: a.company_id }))
        );
      }
      // Take the first associate
      associate = associates[0];
    }

    // If no match and numbers are different, try original format
    if (!associate && normalizedFrom !== From) {
      console.log(`⚠️ No match for normalized phone, trying original: ${From}`);
      const result = await supabaseAdmin
        .from("associates")
        .select("id, company_id, phone_number")
        .eq("phone_number", From)
        .limit(2);

      if (result.error) {
        associateError = result.error;
      } else if (result.data && result.data.length > 0) {
        if (result.data.length > 1) {
          console.warn(
            `⚠️ WARNING: Found ${result.data.length} associates with phone number ${From}. Using the first one.`
          );
        }
        associate = result.data[0];
        associateError = null;
      }
    }

    if (associateError || !associate || !associate.company_id) {
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

    console.log(
      `✅ Found associate: ${associate.id} (company: ${associate.company_id}, stored phone: ${associate.phone_number})`
    );

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

    let conversation_id: string;

    if (conversationError) {
      console.error("❌ Error fetching conversations:", conversationError);
      // Create new conversation if fetch failed
      console.log("📝 Creating new conversation (fetch failed)...");
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert([
          { associate_id: associate.id, company_id: associate.company_id },
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
      // Conversation exists
      conversation_id = conversations[0].id;
      console.log("✅ Found existing conversation:", conversation_id);
    } else {
      // No conversation found, create a new one
      console.log("📝 Creating new conversation (none found)...");
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert([
          { associate_id: associate.id, company_id: associate.company_id },
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
