import { NextRequest, NextResponse } from "next/server";
import { twilioClient } from "@/lib/twilio/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
} from "@/lib/auth/getCompanyId";

/**
 * POST /api/send-message
 *
 * Sends an SMS message via Twilio and saves it to the messages table.
 *
 * Request body:
 * - conversation_id: string (UUID of the conversation)
 * - to: string (recipient phone number)
 * - body: string (message text)
 * - sender: string (sender identifier)
 *
 * Response:
 * - 200: { sid: string } (Twilio message SID)
 * - 400: { error: string } (validation error)
 * - 405: Method not allowed
 * - 500: { error: string } (server error)
 */
export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Get company ID and phone number for two-way communication
    console.log("📞 [PHONE DEBUG] Starting send-message process...");
    const companyId = await requireCompanyId();
    console.log("📞 [PHONE DEBUG] Company ID:", companyId);

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

    const body = await request.json();
    const { conversation_id, to, body: messageBody, sender } = body;

    // Validate required fields
    if (!conversation_id || typeof conversation_id !== "string") {
      return NextResponse.json(
        { error: "conversation_id is required and must be a string" },
        { status: 400 }
      );
    }

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        {
          error: "to (recipient phone number) is required and must be a string",
        },
        { status: 400 }
      );
    }

    if (
      !messageBody ||
      typeof messageBody !== "string" ||
      !messageBody.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "body (message text) is required and must be a non-empty string",
        },
        { status: 400 }
      );
    }

    if (!sender || typeof sender !== "string") {
      return NextResponse.json(
        { error: "sender is required and must be a string" },
        { status: 400 }
      );
    }

    // Send message via Twilio
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const statusCallback = baseUrl
      ? `${baseUrl}/api/twilio/status-callback`
      : undefined;

    console.log("📞 [PHONE DEBUG] About to send SMS via Twilio with:");
    console.log("📞 [PHONE DEBUG]   FROM:", twoWayPhoneNumber);
    console.log("📞 [PHONE DEBUG]   TO:", to);
    console.log(
      "📞 [PHONE DEBUG]   BODY:",
      messageBody.trim().substring(0, 50) + "..."
    );

    const message = await twilioClient.messages.create({
      from: twoWayPhoneNumber,
      to,
      body: messageBody.trim(),
      ...(statusCallback && { statusCallback }),
    });

    console.log("📞 [PHONE DEBUG] SMS sent successfully:");
    console.log("📞 [PHONE DEBUG]   Message SID:", message.sid);
    console.log("📞 [PHONE DEBUG]   Status:", message.status);
    console.log("📞 [PHONE DEBUG]   From (Twilio response):", message.from);
    console.log("📞 [PHONE DEBUG]   To (Twilio response):", message.to);

    // Save to Supabase messages table
    const supabaseAdmin = createAdminClient();
    const { error: insertError } = await supabaseAdmin.from("messages").insert([
      {
        conversation_id,
        sender_type: "company",
        body: messageBody.trim(),
        direction: "outbound",
        status: message.status,
        sent_at: message.dateCreated?.toISOString() || new Date().toISOString(),
        // Store Twilio SID for status callback tracking
        // Note: This requires twilio_sid field in messages table
        // If migration hasn't been applied yet, this field will be ignored
        twilio_sid: message.sid,
      },
    ]);

    if (insertError) {
      console.error("Error saving message to Supabase:", insertError);
      // Message was sent successfully via Twilio, but failed to save to DB
      // Log the error but still return success since SMS was delivered
      // In production, you might want to implement a retry mechanism here
    }

    return NextResponse.json({ sid: message.sid }, { status: 200 });
  } catch (error) {
    console.error("Error in send-message handler:", error);

    // Handle Twilio-specific errors
    if (error && typeof error === "object" && "code" in error) {
      const twilioError = error as { code?: number; message?: string };
      if (twilioError.code === 21211) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 }
        );
      }
      if (twilioError.code === 21610) {
        return NextResponse.json(
          { error: "Recipient has opted out of SMS messages" },
          { status: 400 }
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
