// PSEUDOCODE
// 1. Lambda triggered by EventBridge schedule (runs periodically to drain queue)
// 2. Connects to RabbitMQ and consumes messages from send-queue
// 3. Decrypts Twilio auth token from payload
// 4. Creates Twilio client with subaccount credentials
// 5. Sends SMS via Twilio
// 6. Acknowledges messages after successful sending
// 7. Handles errors and sends to DLQ if needed

const amqp = require("amqplib");
const twilio = require("twilio");
const { createDecipheriv } = require("crypto");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const SEND_QUEUE = "send-queue";
const TWILIO_SUBACCOUNT_ENCRYPTION_KEY = process.env.TWILIO_SUBACCOUNT_ENCRYPTION_KEY;
const MAX_MESSAGES_PER_INVOCATION = parseInt(process.env.MAX_MESSAGES_PER_INVOCATION || "10", 10);

const sqs = new AWS.SQS();

const ENCRYPTION_KEY_LENGTH = 32;
const HEX_KEY_LENGTH = ENCRYPTION_KEY_LENGTH * 2;

function ensureEncryptionKey() {
  if (!TWILIO_SUBACCOUNT_ENCRYPTION_KEY) {
    throw new Error("TWILIO_SUBACCOUNT_ENCRYPTION_KEY is required");
  }

  let keyBuffer;
  if (/^[0-9a-fA-F]+$/.test(TWILIO_SUBACCOUNT_ENCRYPTION_KEY) && 
      TWILIO_SUBACCOUNT_ENCRYPTION_KEY.length === HEX_KEY_LENGTH) {
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

async function sendSMS(payload) {
  const {
    to,
    from,
    body: messageBody,
    twilio_subaccount_sid,
    twilio_auth_token_encrypted,
    message_id,
    company_id,
  } = payload;

  if (!to || !messageBody || !twilio_subaccount_sid || !twilio_auth_token_encrypted) {
    throw new Error("Missing required fields: to, body, twilio_subaccount_sid, or twilio_auth_token_encrypted");
  }

  console.log("Sending SMS:", {
    messageId: message_id,
    companyId: company_id,
    to: to,
    from: from,
  });

  // Decrypt auth token
  const authToken = decryptTwilioAuthToken(twilio_auth_token_encrypted);

  // Create Twilio client with subaccount credentials
  const twilioClient = twilio(twilio_subaccount_sid, authToken);

  // Format phone numbers
  const formattedTo = formatPhoneNumber(to);
  const formattedFrom = from ? formatPhoneNumber(from) : null;

  // Send SMS
  const message = await twilioClient.messages.create({
    to: formattedTo,
    from: formattedFrom || undefined,
    body: messageBody,
  });

  console.log("SMS sent successfully:", {
    messageId: message_id,
    twilioSid: message.sid,
    status: message.status,
  });

  return {
    success: true,
    messageId: message_id,
    twilioSid: message.sid,
    status: message.status,
  };
}

async function processMessage(channel, message) {
  let payload;
  try {
    payload = JSON.parse(message.content.toString());
    console.log("Processing message from queue:", {
      messageId: payload.message_id,
      companyId: payload.company_id,
      to: payload.to,
    });

    await sendSMS(payload);
    
    // Acknowledge message after successful processing
    channel.ack(message);
    console.log("Message processed and acknowledged:", payload.message_id);
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

    // Reject message (don't requeue if it's a permanent error)
    const isPermanentError = error.message.includes("Missing required") || 
                            error.message.includes("Invalid") ||
                            error.message.includes("Encrypted token");
    channel.nack(message, false, !isPermanentError);
    return { success: false, messageId: payload?.message_id, error: error.message };
  }
}

exports.handler = async (event) => {
  console.log("MessageSender Lambda invoked");

  if (!RABBITMQ_URL) {
    console.error("RABBITMQ_URL is not configured");
    return { statusCode: 500, body: "RABBITMQ_URL not configured" };
  }

  if (!TWILIO_SUBACCOUNT_ENCRYPTION_KEY) {
    console.error("TWILIO_SUBACCOUNT_ENCRYPTION_KEY is not configured");
    return { statusCode: 500, body: "TWILIO_SUBACCOUNT_ENCRYPTION_KEY not configured" };
  }

  let connection;
  let channel;
  const results = { processed: 0, succeeded: 0, failed: 0 };

  try {
    console.log("Connecting to RabbitMQ...");
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    console.log(`Asserting queue '${SEND_QUEUE}' exists`);
    await channel.assertQueue(SEND_QUEUE, { durable: true });

    // Get queue info to see how many messages are waiting
    const queueInfo = await channel.checkQueue(SEND_QUEUE);
    console.log(`Queue '${SEND_QUEUE}' has ${queueInfo.messageCount} messages waiting`);

    if (queueInfo.messageCount === 0) {
      console.log("No messages in queue, exiting");
      return { statusCode: 200, body: JSON.stringify({ message: "No messages to process" }) };
    }

    // Consume up to MAX_MESSAGES_PER_INVOCATION messages
    const messagesToProcess = Math.min(queueInfo.messageCount, MAX_MESSAGES_PER_INVOCATION);
    console.log(`Processing up to ${messagesToProcess} messages`);

    const processingPromises = [];
    let messagesReceived = 0;

    // Set up consumer
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 50000); // Stop after 50 seconds to leave time for cleanup

      channel.consume(SEND_QUEUE, async (message) => {
        if (!message) {
          return;
        }

        if (messagesReceived >= messagesToProcess) {
          channel.cancel(message.fields.consumerTag);
          clearTimeout(timeout);
          resolve();
          return;
        }

        messagesReceived++;
        results.processed++;

        const result = await processMessage(channel, message);
        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
        }

        // If we've processed all
