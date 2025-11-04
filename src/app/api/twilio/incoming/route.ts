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
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const From = formData.get("From") as string;
    const To = formData.get("To") as string;
    const Body = formData.get("Body") as string;

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

    // Determine which phone number to use for the conversation
    // If the message is to the reminder number, we need to find the associate's company
    // and use that company's two-way phone number instead
    let conversationPhoneNumber = To;

    // Check if this is a reply to a reminder (To is the reminder number)
    if (To === TWILIO_PHONE_NUMBER_REMINDERS) {
      // Find the associate by their phone number to get their company
      const normalizedFrom = normalizePhoneForLookup(From);

      const { data: associate, error: associateError } = await supabaseAdmin
        .from("associates")
        .select("company_id")
        .eq("phone_number", normalizedFrom)
        .single();

      if (!associateError && associate?.company_id) {
        // Get the company's two-way phone number
        const twoWayNumber = await getCompanyPhoneNumberAdmin(
          associate.company_id
        );
        if (twoWayNumber) {
          conversationPhoneNumber = twoWayNumber;
          console.log(
            `Message from reminder number, using company two-way number: ${twoWayNumber}`
          );
        } else {
          console.warn(
            `Associate ${associate.company_id} has no two-way phone number configured`
          );
        }
      } else {
        console.warn(
          `Could not find associate for phone ${normalizedFrom} to determine company`
        );
      }
    }

    // Find or create conversation using the appropriate phone number
    const { data: conversations, error: conversationError } =
      await supabaseAdmin
        .from("conversations")
        .select("*")
        .or(`participant_a.eq.${From},participant_b.eq.${From}`)
        .limit(1);

    let conversation_id: string;

    if (conversationError) {
      console.error("Error fetching conversations:", conversationError);
      // Create new conversation if fetch failed
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert([
          { participant_a: From, participant_b: conversationPhoneNumber },
        ])
        .select()
        .single();

      if (createError || !newConversation) {
        console.error("Error creating conversation:", createError);
        // Still return valid TwiML
        const response = new twiml.MessagingResponse();
        return new NextResponse(response.toString(), {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      conversation_id = newConversation.id;
    } else if (conversations && conversations.length > 0) {
      // Conversation exists - check if we need to update it
      const existingConversation = conversations[0];
      conversation_id = existingConversation.id;

      // If the existing conversation uses the reminder number but we have a company two-way number,
      // update it to use the company's two-way number
      if (
        existingConversation.participant_b === TWILIO_PHONE_NUMBER_REMINDERS &&
        conversationPhoneNumber !== TWILIO_PHONE_NUMBER_REMINDERS
      ) {
        const { error: updateError } = await supabaseAdmin
          .from("conversations")
          .update({ participant_b: conversationPhoneNumber })
          .eq("id", conversation_id);

        if (updateError) {
          console.error(
            "Error updating conversation phone number:",
            updateError
          );
        } else {
          console.log(
            `Updated conversation ${conversation_id} to use company two-way number: ${conversationPhoneNumber}`
          );
        }
      }
    } else {
      // No conversation found, create a new one
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert([
          { participant_a: From, participant_b: conversationPhoneNumber },
        ])
        .select()
        .single();

      if (createError || !newConversation) {
        console.error("Error creating conversation:", createError);
        // Still return valid TwiML
        const response = new twiml.MessagingResponse();
        return new NextResponse(response.toString(), {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      conversation_id = newConversation.id;
    }

    // Save inbound message
    // Use conversationPhoneNumber as recipient (which may be the company's two-way number)
    const { error: insertError } = await supabaseAdmin.from("messages").insert([
      {
        conversation_id,
        sender: From,
        recipient: conversationPhoneNumber,
        body: Body.trim(),
        direction: "inbound",
      },
    ]);

    if (insertError) {
      console.error("Error saving message to Supabase:", insertError);
      // Message received from Twilio but failed to save
      // Log the error but still return success to Twilio
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
