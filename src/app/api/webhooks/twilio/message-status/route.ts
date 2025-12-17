/**
 * POST /api/webhooks/twilio/message-status
 *
 * Twilio Message Status Callback Webhook
 *
 * Receives delivery status updates from Twilio for both SMS and WhatsApp messages.
 * This endpoint:
 * 1. Validates the Twilio signature for security
 * 2. Logs all message lifecycle events in message_events table
 * 3. Detects WhatsApp policy failures (ErrorCode 63049)
 * 4. Automatically falls back to SMS when WhatsApp fails
 * 5. Ensures idempotency (safe for retries)
 *
 * Twilio sends webhooks as form-urlencoded POST requests with:
 * - MessageSid: The Twilio message SID
 * - MessageStatus: Current status (queued, sent, delivered, failed, undelivered, etc.)
 * - To: Recipient phone number (may include "whatsapp:" prefix)
 * - From: Sender phone number (may include "whatsapp:" prefix)
 * - ErrorCode: Error code if status is failed/undelivered (e.g., 63049 for WhatsApp policy violations)
 * - ErrorMessage: Human-readable error message
 *
 * WhatsApp vs SMS Behavior:
 * - WhatsApp messages have "whatsapp:" prefix in To/From fields
 * - SMS messages use regular phone numbers
 * - ErrorCode 63049 specifically indicates WhatsApp policy violations (user blocked, opt-out, etc.)
 * - When WhatsApp fails with 63049, we automatically send the same message via SMS
 *
 * Idempotency:
 * - Uses unique constraint on (message_sid, message_status) to prevent duplicate processing
 * - If Twilio retries the same webhook, it will be safely ignored
 *
 * Response:
 * - Always returns 200 OK quickly to acknowledge receipt
 * - Long-running operations (SMS fallback) are processed asynchronously
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioWebhook } from "@/lib/twilio/webhookValidation";
import { serviceContainer } from "@/lib/services/ServiceContainer";
import { sendSMS } from "@/lib/twilio/sms";
import { formatPhoneNumber } from "@/lib/twilio/sms";

// WhatsApp policy violation error code
const WHATSAPP_POLICY_ERROR_CODE = "63049";

/**
 * Extract phone number from Twilio format (removes "whatsapp:" prefix if present)
 */
function extractPhoneNumber(twilioNumber: string): string {
  return twilioNumber.replace(/^whatsapp:/i, "");
}

/**
 * Detect channel from phone number format
 */
function detectChannel(to: string, from: string): "whatsapp" | "sms" {
  const isWhatsApp =
    to.toLowerCase().startsWith("whatsapp:") ||
    from.toLowerCase().startsWith("whatsapp:");
  return isWhatsApp ? "whatsapp" : "sms";
}

/**
 * Send SMS fallback when WhatsApp message fails
 * This is called asynchronously after returning 200 to Twilio
 */
async function sendSMSFallback(
  originalMessage: {
    id: string;
    conversation_id: string;
    body: string | null;
    twilio_sid: string;
  },
  toNumber: string,
  fromNumber: string,
  companyId: string
): Promise<void> {
  try {
    console.log(
      `📱 [SMS FALLBACK] Sending SMS fallback for failed WhatsApp message ${originalMessage.twilio_sid}`
    );

    // Get company phone number for SMS
    const { getCompanyPhoneNumberAdmin } = await import(
      "@/lib/auth/getCompanyId"
    );
    const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);

    if (!companyPhoneNumber) {
      console.error(
        `❌ [SMS FALLBACK] No company phone number found for company ${companyId}`
      );
      return;
    }

    // Format phone numbers
    const formattedTo = formatPhoneNumber(toNumber);
    const formattedFrom = companyPhoneNumber;

    // Get original message body (remove template markers if present)
    let messageBody = originalMessage.body || "";

    // If message contains template markers, extract the actual message
    // Format: [Template: contentSid][Variables: {...}]
    const templateMatch = messageBody.match(
      /\[Template:.*?\]\[Variables: (.*?)\]/
    );
    if (templateMatch) {
      try {
        JSON.parse(templateMatch[1]); // Parse to validate, but we don't use the variables for SMS fallback
        // For SMS fallback, we'll use a simple text version
        // In production, you might want to reconstruct the message from the template
        messageBody = messageBody.replace(
          /\[Template:.*?\]\[Variables: .*?\]/,
          "[Message sent via SMS - original WhatsApp message failed]"
        );
      } catch {
        // If parsing fails, use original body
      }
    }

    // Send SMS
    const smsResult = await sendSMS({
      to: formattedTo,
      from: formattedFrom,
      body:
        messageBody ||
        "Your message could not be delivered via WhatsApp. Please check your phone.",
    });

    if (!smsResult.success) {
      console.error(
        `❌ [SMS FALLBACK] Failed to send SMS fallback:`,
        smsResult
      );
      return;
    }

    console.log(
      `✅ [SMS FALLBACK] SMS fallback sent successfully: ${smsResult.messageId}`
    );

    // Save fallback SMS message to database
    const supabaseAdmin = createAdminClient();
    const messagesDao = serviceContainer.getMessagesDao();

    try {
      const fallbackMessage = await messagesDao.createMessage({
        conversation_id: originalMessage.conversation_id,
        sender_type: "company",
        body:
          messageBody || "Your message could not be delivered via WhatsApp.",
        direction: "outbound",
        status: smsResult.success ? "queued" : null,
        twilio_sid: smsResult.success ? smsResult.messageId : null,
        sent_at: new Date().toISOString(),
      });

      // Update message_events to link fallback SMS
      await supabaseAdmin
        .from("message_events")
        .update({
          fallback_sms_message_id: fallbackMessage.id,
        })
        .eq("message_sid", originalMessage.twilio_sid)
        .eq("message_status", "failed");

      console.log(
        `✅ [SMS FALLBACK] Linked fallback SMS message ${fallbackMessage.id} to original WhatsApp message`
      );
    } catch (dbError) {
      console.error(
        `❌ [SMS FALLBACK] Error saving fallback SMS to database:`,
        dbError
      );
      // Don't throw - SMS was sent successfully
    }
  } catch (error) {
    console.error(`❌ [SMS FALLBACK] Error in SMS fallback process:`, error);
    // Don't throw - we've already returned 200 to Twilio
  }
}

export async function POST(request: NextRequest) {
  // Return 200 quickly - process asynchronously
  // This ensures Twilio doesn't retry the webhook
  const responsePromise = Promise.resolve(
    new NextResponse("OK", { status: 200 })
  );

  // Process webhook asynchronously
  processWebhookAsync(request).catch((error) => {
    console.error(
      "❌ [WEBHOOK] Error processing webhook asynchronously:",
      error
    );
  });

  return responsePromise;
}

/**
 * Process webhook asynchronously
 * This runs after we've returned 200 to Twilio
 */
async function processWebhookAsync(request: NextRequest): Promise<void> {
  try {
    console.log("📞 [WEBHOOK] Received Twilio message status webhook");

    // Parse form data from Twilio FIRST (before validation)
    // This is required because we need to pass it to validation
    const formData = await request.formData();

    // Validate Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const skipValidation =
      process.env.SKIP_TWILIO_SIGNATURE_VALIDATION === "true";

    if (!authToken) {
      console.error(
        "❌ [WEBHOOK] TWILIO_AUTH_TOKEN not configured - skipping signature validation"
      );
      // In production, you might want to reject the request
      // For now, we'll log and continue (allows testing without signature validation)
    } else if (skipValidation) {
      console.warn(
        "⚠️ [WEBHOOK] SKIP_TWILIO_SIGNATURE_VALIDATION=true - skipping validation (for testing only)"
      );
    } else {
      // Log request details for debugging signature issues
      console.log("📞 [WEBHOOK] Request details:", {
        url: request.url,
        method: request.method,
        headers: {
          host: request.headers.get("host"),
          "x-forwarded-host": request.headers.get("x-forwarded-host"),
          "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
          "x-forwarded-ssl": request.headers.get("x-forwarded-ssl"),
          "user-agent": request.headers.get("user-agent"),
        },
      });

      const isValid = await validateTwilioWebhook(request, authToken, formData);
      if (!isValid) {
        console.error(
          "❌ [WEBHOOK] Invalid Twilio signature - rejecting webhook"
        );
        console.error(
          "💡 [WEBHOOK] Tip: If using ngrok, ensure the webhook URL in Twilio Console matches your ngrok URL exactly"
        );
        return; // Exit early - don't process invalid webhooks
      }
      console.log("✅ [WEBHOOK] Twilio signature validated");
    }
    const messageSid = formData.get("MessageSid") as string | null;
    const messageStatus = formData.get("MessageStatus") as string | null;
    const to = formData.get("To") as string | null;
    const from = formData.get("From") as string | null;
    const errorCode = formData.get("ErrorCode") as string | null;
    const errorMessage = formData.get("ErrorMessage") as string | null;

    console.log("📞 [WEBHOOK] Webhook data:", {
      messageSid,
      messageStatus,
      to,
      from,
      errorCode,
      errorMessage,
    });

    // Special logging for read receipts
    if (messageStatus?.toLowerCase() === "read") {
      console.log("✅ [WEBHOOK] READ RECEIPT RECEIVED for message:", messageSid);
    }

    // Validate required fields
    if (!messageSid || !messageStatus) {
      console.error("❌ [WEBHOOK] Missing required fields:", {
        messageSid: !!messageSid,
        messageStatus: !!messageStatus,
      });
      return;
    }

    if (!to || !from) {
      console.error("❌ [WEBHOOK] Missing phone number fields:", {
        to: !!to,
        from: !!from,
      });
      return;
    }

    // Detect channel (whatsapp or sms)
    const channel = detectChannel(to, from);
    const toNumber = extractPhoneNumber(to);
    const fromNumber = extractPhoneNumber(from);

    console.log(
      `📱 [WEBHOOK] Channel: ${channel}, To: ${toNumber}, From: ${fromNumber}`
    );

    // Check idempotency: ensure we haven't processed this (message_sid + message_status) before
    const supabaseAdmin = createAdminClient();

    // Try to insert event (will fail if duplicate due to unique constraint)
    const { data: event, error: insertError } = await supabaseAdmin
      .from("message_events")
      .insert({
        message_sid: messageSid,
        message_status: messageStatus,
        channel: channel,
        to_number: toNumber,
        from_number: fromNumber,
        error_code: errorCode || null,
        error_message: errorMessage || null,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate (unique constraint violation)
      if (insertError.code === "23505") {
        console.log(
          `⏭️ [WEBHOOK] Duplicate event detected (idempotency): ${messageSid} + ${messageStatus} - skipping`
        );
        return; // Already processed - safe to ignore
      }

      // Other database error
      console.error("❌ [WEBHOOK] Error inserting message event:", insertError);
      return;
    }

    console.log(`✅ [WEBHOOK] Message event logged: ${event.id}`);

    // Find original message in database (if it exists)
    const { data: originalMessage } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, body, twilio_sid")
      .eq("twilio_sid", messageSid)
      .single();

    // Update message_events with message_id if found
    if (originalMessage) {
      await supabaseAdmin
        .from("message_events")
        .update({ message_id: originalMessage.id })
        .eq("id", event.id);
    }

    // Update message status in messages table (if message exists)
    if (originalMessage) {
      const updateData: {
        status: string;
        delivered_at?: string;
      } = {
        status: messageStatus,
      };

      if (messageStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from("messages")
        .update(updateData)
        .eq("id", originalMessage.id);

      console.log(
        `✅ [WEBHOOK] Updated message ${originalMessage.id} status to ${messageStatus}`
      );
    }

    // Business Logic: Handle WhatsApp failures with SMS fallback
    if (
      channel === "whatsapp" &&
      messageStatus === "failed" &&
      errorCode === WHATSAPP_POLICY_ERROR_CODE
    ) {
      console.log(
        `🚨 [WEBHOOK] WhatsApp policy violation detected (ErrorCode ${WHATSAPP_POLICY_ERROR_CODE}) - triggering SMS fallback`
      );

      // Only send fallback if we have the original message and haven't sent fallback before
      if (originalMessage) {
        // Check if we've already sent a fallback for this message
        const { data: existingFallback } = await supabaseAdmin
          .from("message_events")
          .select("fallback_sms_message_id")
          .eq("message_sid", messageSid)
          .not("fallback_sms_message_id", "is", null)
          .limit(1)
          .single();

        if (existingFallback?.fallback_sms_message_id) {
          console.log(
            `⏭️ [WEBHOOK] SMS fallback already sent for message ${messageSid} - skipping`
          );
          return;
        }

        // Get company_id from conversation
        const { data: conversation } = await supabaseAdmin
          .from("conversations")
          .select("company_id")
          .eq("id", originalMessage.conversation_id)
          .single();

        if (conversation?.company_id) {
          // Send SMS fallback asynchronously (don't await - already returned 200)
          sendSMSFallback(
            originalMessage,
            toNumber,
            fromNumber,
            conversation.company_id
          ).catch((error) => {
            console.error(`❌ [WEBHOOK] Error sending SMS fallback:`, error);
          });
        } else {
          console.error(
            `❌ [WEBHOOK] No company_id found for conversation ${originalMessage.conversation_id} - cannot send SMS fallback`
          );
        }
      } else {
        console.warn(
          `⚠️ [WEBHOOK] Original message not found in database for ${messageSid} - cannot send SMS fallback`
        );
      }
    }

    // Handle undelivered status (log but don't retry immediately)
    if (messageStatus === "undelivered") {
      console.log(
        `⚠️ [WEBHOOK] Message undelivered: ${messageSid} (ErrorCode: ${
          errorCode || "none"
        })`
      );
      // Don't retry immediately - Twilio will retry automatically
      // You could implement custom retry logic here if needed
    }

    console.log(`✅ [WEBHOOK] Webhook processing complete for ${messageSid}`);
  } catch (error) {
    console.error("❌ [WEBHOOK] Error processing webhook:", error);
    // Don't throw - we've already returned 200 to Twilio
  }
}
