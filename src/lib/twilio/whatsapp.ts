import { twilioClient } from "./client";
import {
  WhatsAppMessage,
  WhatsAppResult,
  SMSError,
  WhatsAppTemplateMessage,
} from "./types";
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

/**
 * Send a WhatsApp message using an approved template
 * This is required for sending messages outside the 24-hour window
 *
 * @param message - WhatsApp template message with contentSid and optional variables
 * @returns Promise resolving to WhatsAppResult
 *
 * @example
 * ```typescript
 * const result = await sendWhatsAppTemplate({
 *   to: "+1234567890",
 *   from: "+14155238886",
 *   contentSid: "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 *   contentVariables: {
 *     "1": "John",
 *     "2": "12345"
 *   }
 * });
 * ```
 */
export async function sendWhatsAppTemplate(
  message: WhatsAppTemplateMessage
): Promise<WhatsAppResult> {
  try {
    // Validate required fields
    if (!message.from) {
      throw new Error("WhatsApp 'from' field is required");
    }

    if (!message.to) {
      throw new Error("WhatsApp 'to' field is required");
    }

    if (!message.contentSid) {
      throw new Error("WhatsApp 'contentSid' (template SID) is required");
    }

    // NOTE: If error 21656 persists, it might be due to:
    // 1. Template structure mismatch (variables in different order than expected)
    // 2. Template not fully approved/ready
    // 3. Template format requirements we're not meeting
    // Consider fetching template details to verify structure matches

    // Format phone numbers with whatsapp: prefix
    const fromNumber = formatWhatsAppNumber(message.from);
    const toNumber = formatWhatsAppNumber(message.to);

    console.log("📱 [WHATSAPP DEBUG] Sending WhatsApp template message:");
    console.log("📱 [WHATSAPP DEBUG]   FROM:", fromNumber);
    console.log("📱 [WHATSAPP DEBUG]   TO:", toNumber);
    console.log("📱 [WHATSAPP DEBUG]   CONTENT SID:", message.contentSid);
    if (message.contentVariables) {
      console.log(
        "📱 [WHATSAPP DEBUG]   VARIABLES (raw):",
        JSON.stringify(message.contentVariables)
      );
      if (Array.isArray(message.contentVariables)) {
        console.log(
          "📱 [WHATSAPP DEBUG]   VARIABLES (array):",
          message.contentVariables
        );
        console.log(
          "📱 [WHATSAPP DEBUG]   VARIABLE COUNT:",
          message.contentVariables.length
        );
      } else {
        console.log(
          "📱 [WHATSAPP DEBUG]   VARIABLE KEYS:",
          Object.keys(message.contentVariables)
        );
        console.log(
          "📱 [WHATSAPP DEBUG]   VARIABLE VALUES:",
          Object.values(message.contentVariables)
        );
      }
    }

    // Build the content variables object for Twilio
    // Twilio expects contentVariables as a JSON stringified object: {"1": "value1", "2": "value2", ...}
    // The keys correspond to the variable placeholders in the template ({{1}}, {{2}}, etc.)
    let contentVariables: string | undefined;

    if (message.contentVariables) {
      let variablesObject: Record<string, string>;

      // Handle both array and object formats
      if (Array.isArray(message.contentVariables)) {
        // Convert array to object format
        // Array indices map to template variable numbers (1-indexed)
        variablesObject = {};
        message.contentVariables.forEach((value, index) => {
          const varNum = String(index + 1); // Convert 0-based index to 1-based variable number
          if (!value || typeof value !== "string" || !value.trim()) {
            throw new Error(
              `Template variable ${varNum} is required but is empty`
            );
          }
          variablesObject[varNum] = value.trim();
        });
      } else {
        // Already an object - use directly
        variablesObject = {};
        const contentVars = message.contentVariables as Record<string, string>;
        const sortedKeys = Object.keys(contentVars).sort(
          (a, b) => parseInt(a) - parseInt(b)
        );

        sortedKeys.forEach((key) => {
          const value = contentVars[key];
          if (!value || typeof value !== "string" || !value.trim()) {
            throw new Error(
              `Template variable ${key} is required but is empty`
            );
          }
          variablesObject[key] = value.trim();
        });
      }

      // Sanitize values to prevent Twilio error 21656
      // Replace problematic characters (especially apostrophes)
      Object.keys(variablesObject).forEach((key) => {
        variablesObject[key] = variablesObject[key].replace(/'/g, "\u2019");
      });

      // Validate all values are non-empty
      const emptyKeys = Object.keys(variablesObject).filter(
        (key) => !variablesObject[key] || variablesObject[key] === ""
      );

      if (emptyKeys.length > 0) {
        throw new Error(
          `Template variables ${emptyKeys.join(
            ", "
          )} are empty. All variables must be provided.`
        );
      }

      // Convert to JSON string for Twilio API
      // Twilio expects: JSON.stringify({"1": "value1", "2": "value2"})
      contentVariables = JSON.stringify(variablesObject);
    } else {
      console.log(
        "📱 [WHATSAPP DEBUG] No contentVariables provided - sending template without variables"
      );
    }

    // Build the request payload
    const requestPayload: any = {
      to: toNumber,
      from: fromNumber,
      contentSid: message.contentSid,
    };

    // Add contentVariables if provided
    // Twilio REST API expects contentVariables as a JSON stringified object
    if (contentVariables) {
      requestPayload.contentVariables = contentVariables;
      console.log("📱 [WHATSAPP DEBUG] Final request payload:", {
        to: requestPayload.to,
        from: requestPayload.from,
        contentSid: requestPayload.contentSid,
        contentVariables: requestPayload.contentVariables,
        contentVariablesType: typeof requestPayload.contentVariables,
      });
    } else {
      console.log("📱 [WHATSAPP DEBUG] Final request payload (no variables):", {
        to: requestPayload.to,
        from: requestPayload.from,
        contentSid: requestPayload.contentSid,
      });
    }

    // Send message via Twilio using template
    console.log("📱 [WHATSAPP DEBUG] Calling Twilio messages.create...");
    const twilioMessage = await twilioClient.messages.create(requestPayload);

    console.log(
      "📱 [WHATSAPP DEBUG] WhatsApp template message sent successfully:"
    );
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
    const twilioError = error as {
      message?: string;
      code?: string | number;
      status?: number;
      moreInfo?: string;
    };

    // Enhanced error logging for debugging
    console.error("📱 [WHATSAPP DEBUG] WhatsApp template sending failed:");
    console.error("📱 [WHATSAPP DEBUG]   Error message:", twilioError.message);
    console.error("📱 [WHATSAPP DEBUG]   Error code:", twilioError.code);
    console.error("📱 [WHATSAPP DEBUG]   Status:", twilioError.status);
    console.error("📱 [WHATSAPP DEBUG]   More info:", twilioError.moreInfo);
    console.error("📱 [WHATSAPP DEBUG]   Full error:", error);

    // If error 21656, provide more specific guidance
    if (twilioError.code === 21656 || twilioError.code === "21656") {
      console.error(
        "📱 [WHATSAPP DEBUG] ERROR 21656: Invalid ContentVariables"
      );
      console.error("📱 [WHATSAPP DEBUG]   This usually means:");
      console.error(
        "📱 [WHATSAPP DEBUG]   1. Variables don't match template structure"
      );
      console.error(
        "📱 [WHATSAPP DEBUG]   2. Special characters in variables (especially apostrophes)"
      );
      console.error(
        "📱 [WHATSAPP DEBUG]   3. Array length doesn't match template variable count"
      );
      console.error("📱 [WHATSAPP DEBUG]   4. Variables are in wrong order");
    }

    const whatsappError: SMSError = {
      success: false,
      error: twilioError.message || "Unknown error occurred",
      code: String(twilioError.code || "UNKNOWN"),
      to: message.to,
      sentAt: new Date(),
    };

    return whatsappError;
  }
}

/**
 * Send WhatsApp message using a template with a verified WhatsApp Business number
 *
 * @param message - WhatsApp template message (without 'from' field)
 * @param whatsappBusinessNumber - Your verified WhatsApp Business number in E.164 format
 * @returns Promise resolving to WhatsAppResult
 *
 * @example
 * ```typescript
 * const result = await sendWhatsAppBusinessTemplate({
 *   to: "+1234567890",
 *   contentSid: "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 *   contentVariables: { "1": "John" }
 * }, "+15551234567");
 * ```
 */
export async function sendWhatsAppBusinessTemplate(
  message: Omit<WhatsAppTemplateMessage, "from">,
  whatsappBusinessNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsAppTemplate({
    ...message,
    from: whatsappBusinessNumber,
  });
}
