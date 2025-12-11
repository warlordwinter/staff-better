import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TwilioMessageStatus } from "@/lib/twilio/types";

/**
 * POST /api/twilio/status-callback
 *
 * Handles Twilio status callback webhooks for message delivery status updates.
 * Twilio calls this endpoint when a message status changes (sent, delivered, failed, etc.)
 *
 * Twilio sends form data with:
 * - MessageSid: The Twilio message SID
 * - MessageStatus: Current status (queued, sent, delivered, failed, etc.)
 * - To: Recipient phone number
 * - From: Sender phone number
 * - ErrorCode: Error code if status is failed/undelivered
 * - ErrorMessage: Error message if status is failed/undelivered
 *
 * This endpoint:
 * 1. Finds the message in the database by twilio_sid
 * 2. Updates the message status
 * 3. Updates delivered_at timestamp if status is "delivered"
 */
export async function POST(request: NextRequest) {
  try {
    console.log("📞 [STATUS CALLBACK] Received Twilio status callback");

    // Parse form data from Twilio
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as TwilioMessageStatus;
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;
    const errorCode = formData.get("ErrorCode") as string | null;
    const errorMessage = formData.get("ErrorMessage") as string | null;

    console.log("📞 [STATUS CALLBACK] Message SID:", messageSid);
    console.log("📞 [STATUS CALLBACK] Status:", messageStatus);
    console.log("📞 [STATUS CALLBACK] To:", to);
    console.log("📞 [STATUS CALLBACK] From:", from);

    if (!messageSid || !messageStatus) {
      console.error("📞 [STATUS CALLBACK] Missing required fields:", {
        messageSid: !!messageSid,
        messageStatus: !!messageStatus,
      });
      // Return 200 to prevent Twilio from retrying
      return new NextResponse("OK", { status: 200 });
    }

    // Update message in database
    const supabaseAdmin = createAdminClient();

    // Build update object
    const updateData: {
      status: string;
      delivered_at?: string;
    } = {
      status: messageStatus,
    };

    // Set delivered_at timestamp if message was delivered
    if (messageStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    // Try to find and update message by twilio_sid first
    // Note: This assumes twilio_sid field exists in messages table
    // If it doesn't exist yet, you'll need to add it via migration
    const { data: updatedMessage, error: updateError } = await supabaseAdmin
      .from("messages")
      .update(updateData)
      .eq("twilio_sid", messageSid)
      .select()
      .single();

    if (updateError) {
      // If twilio_sid field doesn't exist, log error but don't fail
      // This allows the endpoint to work before migration is applied
      console.error(
        "📞 [STATUS CALLBACK] Error updating message by twilio_sid:",
        updateError
      );
      console.log(
        "📞 [STATUS CALLBACK] Note: If twilio_sid field doesn't exist, add it via migration"
      );

      // Fallback: Try to find message by conversation and approximate matching
      // This is less reliable but can work as a temporary solution
      // You could match by: conversation_id + direction + recent sent_at timestamp
      // For now, we'll just log and return success
    } else if (updatedMessage) {
      console.log(
        "✅ [STATUS CALLBACK] Successfully updated message:",
        updatedMessage.id,
        "Status:",
        messageStatus
      );

      // Log error details if message failed
      if (
        (messageStatus === "failed" || messageStatus === "undelivered") &&
        errorCode
      ) {
        console.error("📞 [STATUS CALLBACK] Message delivery failed:", {
          messageSid,
          errorCode,
          errorMessage,
          to,
          from,
        });
      }
    } else {
      console.warn(
        "📞 [STATUS CALLBACK] Message not found in database:",
        messageSid
      );
    }

    // Always return 200 to Twilio to acknowledge receipt
    // Twilio will retry if we return an error status
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("📞 [STATUS CALLBACK] Error processing status callback:", error);

    // Always return 200 to prevent Twilio from retrying
    // Log the error for debugging
    return new NextResponse("OK", { status: 200 });
  }
}


