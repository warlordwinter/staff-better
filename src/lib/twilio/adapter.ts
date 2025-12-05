import { twilioClient, TWILIO_PHONE_NUMBER_REMINDERS } from "./client";
import type { SMSMessage, SMSResult, SMSError } from "./types";
import { generateApiToken } from "@/lib/utils/jwtUtils";

// AWS SMS API URL from environment variable, with fallback to default
const AWS_SMS_API_URL = process.env.AWS_SMS_API_URL || null;

function ensureFromNumber(message: SMSMessage): string {
  if (!message.from) {
    throw new Error(
      "Phone number 'from' field is required. Use sendReminderSMS or sendTwoWaySMS, or provide 'from' explicitly."
    );
  }

  return message.from;
}

/**
 * Send a single SMS message via AWS API Gateway
 * @param message The SMS message to send
 * @param companyId Optional company ID for JWT token generation (required for AWS API Gateway)
 */
export async function sendSMS(
  message: SMSMessage,
  companyId?: string
): Promise<SMSResult> {
  try {
    let fromNumber = ensureFromNumber(message);
    // Format the from number to ensure it has the + prefix
    fromNumber = formatPhoneNumber(fromNumber);

    // Format the to number as well
    const toNumber = formatPhoneNumber(message.to);

    console.log("📞 [PHONE DEBUG] sendSMS function called:");
    console.log("📞 [PHONE DEBUG]   FROM number (raw):", message.from);
    console.log("📞 [PHONE DEBUG]   FROM number (formatted):", fromNumber);
    console.log("📞 [PHONE DEBUG]   TO number (raw):", message.to);
    console.log("📞 [PHONE DEBUG]   TO number (formatted):", toNumber);
    console.log(
      "📞 [PHONE DEBUG]   Message body preview:",
      message.body.substring(0, 50) + "..."
    );

    if (!AWS_SMS_API_URL) {
      throw new Error("AWS_SMS_API_URL is not defined.");
    }

    if (!companyId) {
      throw new Error(
        "companyId is required for AWS API Gateway authentication"
      );
    }

    // Ensure the URL ends with /messages path (required by API Gateway)
    const apiUrl = AWS_SMS_API_URL.endsWith("/messages")
      ? AWS_SMS_API_URL
      : `${AWS_SMS_API_URL.replace(/\/$/, "")}/messages`;

    console.log("📞 [PHONE DEBUG]   API URL:", apiUrl);

    // Generate JWT token for authentication
    const authToken = generateApiToken(companyId);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        to: toNumber,
        from: fromNumber,
        message: message.body, // Lambda expects 'message' not 'body'
        message_type: "immediate", // Explicitly set as immediate message
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const responseData = await response.json();

    console.log("📞 [PHONE DEBUG] AWS API response:");
    console.log("📞 [PHONE DEBUG]   Response data:", responseData);

    // Map response to SMSResult format
    // Assuming the API returns: { messageId/sid, status, to, from } or similar
    const messageId =
      responseData.messageId || responseData.sid || responseData.id || "";
    const status = responseData.status || "queued";
    const to = responseData.to || toNumber;
    const from = responseData.from || fromNumber;

    console.log("📞 [PHONE DEBUG]   Message ID:", messageId);
    console.log("📞 [PHONE DEBUG]   Status:", status);
    console.log("📞 [PHONE DEBUG]   From:", from);
    console.log("📞 [PHONE DEBUG]   To:", to);

    return {
      success: true,
      messageId,
      status: status as any,
      to,
      from,
      sentAt: new Date(),
    };
  } catch (error: unknown) {
    const apiError = error as { message?: string; code?: string };

    // Format the to number for error response
    const formattedTo = formatPhoneNumber(message.to);

    const smsError: SMSError = {
      success: false,
      error: apiError.message || "Unknown error occurred",
      code: apiError.code || "UNKNOWN",
      to: formattedTo,
      sentAt: new Date(),
    };

    console.error("SMS sending failed:", smsError);
    return smsError;
  }
}

export async function sendReminderSMS(
  message: Omit<SMSMessage, "from">,
  companyId?: string
): Promise<SMSResult> {
  return sendSMS(
    {
      ...message,
      from: TWILIO_PHONE_NUMBER_REMINDERS,
    },
    companyId
  );
}

export async function sendTwoWaySMS(
  message: Omit<SMSMessage, "from">,
  twoWayPhoneNumber: string,
  companyId?: string
): Promise<SMSResult> {
  return sendSMS(
    {
      ...message,
      from: twoWayPhoneNumber,
    },
    companyId
  );
}

export async function sendBatchSMS(
  messages: SMSMessage[],
  companyId?: string
): Promise<SMSResult[]> {
  const results: SMSResult[] = [];

  for (const message of messages) {
    const result = await sendSMS(message, companyId);
    results.push(result);

    // Add small delay between messages to avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error("Phone number is required but was not provided");
  }

  const digitsOnly = phoneNumber.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  return phoneNumber;
}

export const twilioMessagingAdapter = {
  sendSMS,
  sendReminderSMS,
  sendTwoWaySMS,
  sendBatchSMS,
  validatePhoneNumber,
  formatPhoneNumber,
};
