import { twilioClient, TWILIO_PHONE_NUMBER_REMINDERS } from "./client";
import { SMSMessage, SMSResult, SMSError } from "./types";

/**
 * Send a single SMS message
 * The 'from' field must be specified in the message (cannot be undefined)
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  try {
    // The 'from' field must be explicitly provided
    if (!message.from) {
      throw new Error(
        "Phone number 'from' field is required. Use sendReminderSMS or sendTwoWaySMS, or provide 'from' explicitly."
      );
    }

    const fromNumber = message.from;

    console.log("📞 [PHONE DEBUG] sendSMS function called:");
    console.log("📞 [PHONE DEBUG]   FROM number (from message):", fromNumber);
    console.log("📞 [PHONE DEBUG]   TO number:", message.to);
    console.log(
      "📞 [PHONE DEBUG]   Message body preview:",
      message.body.substring(0, 50) + "..."
    );

    const twilioMessage = await twilioClient.messages.create({
      to: message.to,
      from: fromNumber,
      body: message.body,
    });

    console.log("📞 [PHONE DEBUG] Twilio API response:");
    console.log("📞 [PHONE DEBUG]   Message SID:", twilioMessage.sid);
    console.log("📞 [PHONE DEBUG]   Status:", twilioMessage.status);
    console.log("📞 [PHONE DEBUG]   From (Twilio):", twilioMessage.from);
    console.log("📞 [PHONE DEBUG]   To (Twilio):", twilioMessage.to);
    console.log("📞 [PHONE DEBUG]   Date Created:", twilioMessage.dateCreated);

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

    const smsError: SMSError = {
      success: false,
      error: twilioError.message || "Unknown error occurred",
      code: twilioError.code || "UNKNOWN",
      to: message.to,
      sentAt: new Date(),
    };

    // Log the error for debugging
    console.error("SMS sending failed:", smsError);

    return smsError;
  }
}

/**
 * Send a reminder SMS message (uses reminder phone number)
 */
export async function sendReminderSMS(
  message: Omit<SMSMessage, "from">
): Promise<SMSResult> {
  return sendSMS({
    ...message,
    from: TWILIO_PHONE_NUMBER_REMINDERS,
  });
}

/**
 * Send a two-way communication SMS message
 * @param message The SMS message (without 'from' field)
 * @param twoWayPhoneNumber The company's two-way phone number (from company.phone_number)
 */
export async function sendTwoWaySMS(
  message: Omit<SMSMessage, "from">,
  twoWayPhoneNumber: string
): Promise<SMSResult> {
  return sendSMS({
    ...message,
    from: twoWayPhoneNumber,
  });
}

/**
 * Send multiple SMS messages in batch
 */
export async function sendBatchSMS(
  messages: SMSMessage[]
): Promise<SMSResult[]> {
  const results: SMSResult[] = [];

  // Process messages sequentially to avoid rate limiting
  for (const message of messages) {
    const result = await sendSMS(message);
    results.push(result);

    // Add small delay between messages to be respectful of rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Format phone number to E.164 format if it's a US number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error("Phone number is required but was not provided");
  }

  // Remove all non-digits
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If it's 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  // If it already has +, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  // Otherwise, return the original (might need manual formatting)
  return phoneNumber;
}
