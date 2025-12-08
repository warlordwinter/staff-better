// PSEUDOCODE
// 1. Lambda triggered by SQS (MessageSenderQueue)
// 2. Parses JSON payloads from SQS Records
// 3. Decrypts Twilio auth token from payload
// 4. Creates Twilio client with subaccount credentials
// 5. Sends SMS via Twilio
// 6. Handles errors and sends to DLQ if needed

const twilio = require("twilio");
const { createDecipheriv } = require("crypto");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;
const TWILIO_SUBACCOUNT_ENCRYPTION_KEY =
  process.env.TWILIO_SUBACCOUNT_ENCRYPTION_KEY;

const sqs = new AWS.SQS();

const ENCRYPTION_KEY_LENGTH = 32;
const HEX_KEY_LENGTH = ENCRYPTION_KEY_LENGTH * 2;

function ensureEncryptionKey() {
  if (!TWILIO_SUBACCOUNT_ENCRYPTION_KEY) {
    throw new Error("TWILIO_SUBACCOUNT_ENCRYPTION_KEY is required");
  }

  let keyBuffer;
  if (
    /^[0-9a-fA-F]+$/.test(TWILIO_SUBACCOUNT_ENCRYPTION_KEY) &&
    TWILIO_SUBACCOUNT_ENCRYPTION_KEY.length === HEX_KEY_LENGTH
  ) {
    keyBuffer = Buffer.from(TWILIO_SUBACCOUNT_ENCRYPTION_KEY, "hex");
  } else {
    keyBuffer = Buffer.from(TWILIO_SUBACCOUNT_ENCRYPTION_KEY, "base64");
  }

  if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error(
      "TWILIO_SUBACCOUNT_ENCRYPTION_KEY must be 32 bytes (provide 64-char hex or base64-encoded value)"
    );
  }

  return keyBuffer;
}

function decryptTwilioAuthToken(encryptedToken) {
  if (!encryptedToken) {
    throw new Error("Encrypted token is required");
  }

  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const key = ensureEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

async function sendToDlq(payload, error) {
  if (!DLQ_URL) {
    console.error("DLQ_URL not configured. Skipping DLQ send.");
    return;
  }
  const body = {
    payload,
    error: error ? error.message || String(error) : "Unknown error",
    worker: "message-sender",
    failed_at: new Date().toISOString(),
  };
  await sqs
    .sendMessage({
      QueueUrl: DLQ_URL,
      MessageBody: JSON.stringify(body),
    })
    .promise();
}

function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error("Phone number is required");
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

/**
 * Fetch a valid phone number from the Twilio subaccount
 * @param {object} twilioClient - Twilio client instance
 * @returns {Promise<string|null>} - A valid phone number or null if none found
 */
async function fetchValidPhoneNumberFromSubaccount(twilioClient) {
  try {
    // Fetch incoming phone numbers from the subaccount
    const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({
      limit: 10,
    });

    if (incomingNumbers && incomingNumbers.length > 0) {
      // Return the first available phone number
      const phoneNumber = incomingNumbers[0].phoneNumber;
      console.log(`Found valid phone number from subaccount: ${phoneNumber}`);
      return phoneNumber;
    }

    console.warn("No incoming phone numbers found in subaccount");
    return null;
  } catch (error) {
    console.error("Error fetching phone numbers from subaccount:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return null;
  }
}

async function sendSMS(payload) {
  const {
    to,
    from,
    body: messageBody,
    twilio_subaccount_sid,
    twilio_auth_token_encrypted,
    twilio_messaging_service_sid,
    message_id,
    company_id,
  } = payload;

  if (
    !to ||
    !messageBody ||
    !twilio_subaccount_sid ||
    !twilio_auth_token_encrypted
  ) {
    throw new Error(
      "Missing required fields: to, body, twilio_subaccount_sid, or twilio_auth_token_encrypted"
    );
  }

  console.log("Sending SMS:", {
    messageId: message_id,
    companyId: company_id,
    to: to,
    from: from,
    messagingServiceSid: twilio_messaging_service_sid || "not provided",
  });

  // Decrypt auth token
  const authToken = decryptTwilioAuthToken(twilio_auth_token_encrypted);

  // Create Twilio client with subaccount credentials
  // Note: Using default HTTP client - Twilio SDK handles timeouts appropriately
  // The retry logic below will handle network timeouts
  const twilioClient = twilio(twilio_subaccount_sid, authToken);

  // Format phone numbers
  const formattedTo = formatPhoneNumber(to);
  let formattedFrom = from ? formatPhoneNumber(from) : null;

  // Send SMS with retry logic for network issues
  let message;
  const maxRetries = 3;
  let lastError;
  let hasTriedFallbackPhone = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build message parameters
      const messageParams = {
        to: formattedTo,
        body: messageBody,
      };

      // Prefer messaging service SID if available (most reliable)
      if (twilio_messaging_service_sid) {
        messageParams.messagingServiceSid = twilio_messaging_service_sid;
        console.log(
          `Using messaging service SID: ${twilio_messaging_service_sid}`
        );
      } else if (formattedFrom) {
        messageParams.from = formattedFrom;
      }
      // If no from number and no messaging service, Twilio will use default

      message = await twilioClient.messages.create(messageParams);
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error;

      // Handle error 21660: Mismatch between 'From' number and account
      if (error.code === 21660 && !hasTriedFallbackPhone) {
        console.warn(
          `From number mismatch (error 21660). Attempting to fetch valid phone number from subaccount...`
        );
        hasTriedFallbackPhone = true;

        // Try to fetch a valid phone number from the subaccount
        const validPhoneNumber = await fetchValidPhoneNumberFromSubaccount(
          twilioClient
        );

        if (validPhoneNumber) {
          formattedFrom = validPhoneNumber;
          console.log(
            `Retrying with valid phone number from subaccount: ${formattedFrom}`
          );
          // Continue to retry with the valid phone number
          continue;
        } else {
          // If we can't get a phone number and no messaging service, this is a permanent error
          if (!twilio_messaging_service_sid) {
            console.error(
              "Cannot resolve valid phone number for subaccount and no messaging service SID available"
            );
            throw new Error(
              `From number ${formattedFrom} does not belong to subaccount ${twilio_subaccount_sid}. No valid phone numbers found in subaccount and no messaging service configured.`
            );
          }
          // If we have a messaging service, try using that instead
          console.log(
            "Falling back to messaging service SID due to phone number mismatch"
          );
          formattedFrom = null; // Clear from number to use messaging service
          continue;
        }
      }

      // Check if it's a network error (connection timeout, DNS, etc.)
      const isNetworkError =
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("connect") ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ENOTFOUND";

      // Check if it's a Twilio API error (authentication, validation, etc.)
      const isTwilioApiError =
        error.status === 401 || // Unauthorized
        error.status === 400 || // Bad Request
        error.status === 403 || // Forbidden
        error.status === 404 || // Not Found
        error.code === 20003 || // Twilio error codes
        error.code === 21211 || // Invalid 'To' phone number
        error.code === 21212 || // Invalid 'From' phone number
        (error.response && error.response.status >= 400);

      if (isTwilioApiError && error.code !== 21660) {
        // Twilio API error - don't retry, this is a permanent issue
        // (21660 is handled above with fallback logic)
        console.error("Twilio API error (credentials/validation issue):", {
          status: error.status,
          code: error.code,
          message: error.message,
          moreInfo: error.moreInfo,
        });
        throw error;
      }

      if (isNetworkError && attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
        console.warn(
          `Network error on attempt ${attempt}/${maxRetries}, retrying in ${delay}ms:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error; // Re-throw if not a network error or out of retries
    }
  }

  if (!message) {
    throw lastError || new Error("Failed to send SMS after retries");
  }

  console.log("SMS sent successfully:", {
    messageId: message_id,
    twilioSid: message.sid,
    status: message.status,
    from: message.from,
  });

  return {
    success: true,
    messageId: message_id,
    twilioSid: message.sid,
    status: message.status,
  };
}

function extractPayloadsFromEvent(event) {
  if (!event || !event.Records) {
    return [];
  }

  return event.Records.map((record) => {
    try {
      return JSON.parse(record.body);
    } catch (error) {
      console.error("Error parsing SQS message body:", error);
      return null;
    }
  }).filter(Boolean);
}

async function processMessage(payload) {
  try {
    console.log("Processing message:", {
      messageId: payload.message_id,
      companyId: payload.company_id,
      to: payload.to,
    });

    // Validate payload has required fields for SMS sending
    if (
      !payload.twilio_subaccount_sid ||
      !payload.twilio_auth_token_encrypted
    ) {
      const error = new Error(
        "Invalid message format: missing Twilio credentials. This message may be from a different source."
      );
      error.code = "INVALID_MESSAGE_FORMAT";
      throw error;
    }

    await sendSMS(payload);
    console.log("Message processed successfully:", payload.message_id);
    return { success: true, messageId: payload.message_id };
  } catch (error) {
    console.error("Error processing message:", {
      error: error.message,
      stack: error.stack,
      payload: payload ? { messageId: payload.message_id } : "unknown",
    });

    // Send to DLQ
    if (payload) {
      await sendToDlq(payload, error);
    }

    return {
      success: false,
      messageId: payload?.message_id,
      error: error.message,
    };
  }
}

exports.handler = async (event) => {
  console.log(
    "MessageSender Lambda invoked with event:",
    JSON.stringify(event)
  );

  if (!TWILIO_SUBACCOUNT_ENCRYPTION_KEY) {
    console.error("TWILIO_SUBACCOUNT_ENCRYPTION_KEY is not configured");
    // For SQS-triggered Lambdas, we should process messages even if config is missing
    // and let individual message processing handle the error
  }

  const payloads = extractPayloadsFromEvent(event);
  console.log(`Extracted ${payloads.length} payload(s) from SQS event`);

  if (!payloads.length) {
    console.log("No payloads to process");
    return;
  }

  const results = { processed: 0, succeeded: 0, failed: 0 };

  // Process all messages from SQS batch
  for (const payload of payloads) {
    results.processed++;
    const result = await processMessage(payload);
    if (result.success) {
      results.succeeded++;
    } else {
      results.failed++;
    }
  }

  console.log("Processing complete:", results);

  // SQS will automatically delete messages on success
  // Failed messages will be retried based on SQS configuration
  return {
    processed: results.processed,
    succeeded: results.succeeded,
    failed: results.failed,
  };
};
