import { twilioClient } from "./client";
import { WhatsAppMessage, WhatsAppResult, SMSError } from "./types";
import { formatPhoneNumber } from "./sms";

/**
 * Format a phone number for WhatsApp messaging
 * Adds the 'whatsapp:' prefix required by Twilio
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove any existing whatsapp: prefix
  const cleaned = phoneNumber.replace(/^whatsapp:/i, "");

  // Format to E.164 if needed
  const formatted = formatPhoneNumber(cleaned);

  // Add whatsapp: prefix
  return `whatsapp:${formatted}`;
}

/**
 * Send a WhatsApp message via Twilio
 *
 * @param message - WhatsApp message object with to, body, and from fields
 * @returns Promise resolving to WhatsAppResult
 *
 * @example
 * ```typescript
 * const result = await sendWhatsApp({
 *   to: "+1234567890",
 *   from: "+14155238886", // Twilio WhatsApp sandbox or verified number
 *   body: "Hello from WhatsApp!"
 * });
 * ```
 *
 * Note: For production, you need a verified WhatsApp Business number.
 * For testing, use Twilio's sandbox number: +14155238886
 */
export async function sendWhatsApp(
  message: WhatsAppMessage
): Promise<WhatsAppResult> {
  try {
    // Validate required fields
    if (!message.from) {
      throw new Error("WhatsApp 'from' field is required");
    }

    if (!message.to) {
      throw new Error("WhatsApp 'to' field is required");
    }

    if (!message.body || !message.body.trim()) {
      throw new Error("WhatsApp message body is required");
    }

    // Format phone numbers with whatsapp: prefix
    const fromNumber = formatWhatsAppNumber(message.from);
    const toNumber = formatWhatsAppNumber(message.to);

    console.log("📱 [WHATSAPP DEBUG] Sending WhatsApp message:");
    console.log("📱 [WHATSAPP DEBUG]   FROM:", fromNumber);
    console.log("📱 [WHATSAPP DEBUG]   TO:", toNumber);
    console.log(
      "📱 [WHATSAPP DEBUG]   BODY:",
      message.body.substring(0, 50) + (message.body.length > 50 ? "..." : "")
    );

    // Send message via Twilio
    const twilioMessage = await twilioClient.messages.create({
      to: toNumber,
      from: fromNumber,
      body: message.body.trim(),
    });

    console.log("📱 [WHATSAPP DEBUG] WhatsApp message sent successfully:");
    console.log("📱 [WHATSAPP DEBUG]   Message SID:", twilioMessage.sid);
    console.log("📱 [WHATSAPP DEBUG]   Status:", twilioMessage.status);
    console.log("📱 [WHATSAPP DEBUG]   From (Twilio):", twilioMessage.from);
    console.log("📱 [WHATSAPP DEBUG]   To (Twilio):", twilioMessage.to);
    console.log(
      "📱 [WHATSAPP DEBUG]   Date Created:",
      twilioMessage.dateCreated
    );

    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from,
      sentAt: new Date(),
    };
  } catch (error: unknown) {
    const twilioError = error as { message?: string; code?: string };

    const whatsappError: SMSError = {
      success: false,
      error: twilioError.message || "Unknown error occurred",
      code: twilioError.code || "UNKNOWN",
      to: message.to,
      sentAt: new Date(),
    };

    // Log the error for debugging
    console.error("WhatsApp sending failed:", whatsappError);

    return whatsappError;
  }
}

/**
 * Send WhatsApp message using Twilio sandbox number
 * Useful for testing before you have a verified WhatsApp Business number
 *
 * @param message - WhatsApp message (without 'from' field)
 * @returns Promise resolving to WhatsAppResult
 *
 * @example
 * ```typescript
 * const result = await sendWhatsAppSandbox({
 *   to: "+1234567890",
 *   body: "Hello from WhatsApp sandbox!"
 * });
 * ```
 *
 * Note: To use the sandbox, the recipient must first send "join <sandbox-keyword>"
 * to +1 415 523 8886. Get your sandbox keyword from Twilio Console.
 */
export async function sendWhatsAppSandbox(
  message: Omit<WhatsAppMessage, "from">
): Promise<WhatsAppResult> {
  // Twilio WhatsApp sandbox number
  const SANDBOX_NUMBER = "+14155238886";

  return sendWhatsApp({
    ...message,
    from: SANDBOX_NUMBER,
  });
}

/**
 * Send WhatsApp message using a verified WhatsApp Business number
 *
 * @param message - WhatsApp message (without 'from' field)
 * @param whatsappBusinessNumber - Your verified WhatsApp Business number in E.164 format
 * @returns Promise resolving to WhatsAppResult
 *
 * @example
 * ```typescript
 * const result = await sendWhatsAppBusiness({
 *   to: "+1234567890",
 *   body: "Hello from our business!"
 * }, "+15551234567");
 * ```
 */
export async function sendWhatsAppBusiness(
  message: Omit<WhatsAppMessage, "from">,
  whatsappBusinessNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsApp({
    ...message,
    from: whatsappBusinessNumber,
  });
}
