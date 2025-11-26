// PSEUDOCODE
// 1. Receive event with one or more message payloads
// 2. For each payload:
//    - Extract Twilio subaccount SID and token
//    - Create Twilio client
//    - Send SMS immediately
//    - On error, log and send failed payload to DLQ

const twilio = require("twilio");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;

const sqs = new AWS.SQS();

async function sendToDlq(payload, error) {
  if (!DLQ_URL) {
    console.error("DLQ_URL not configured. Skipping DLQ send.");
    return;
  }
  const body = {
    payload,
    error: error ? error.message || String(error) : "Unknown error",
    worker: "send-worker",
    failed_at: new Date().toISOString(),
  };
  await sqs
    .sendMessage({
      QueueUrl: DLQ_URL,
      MessageBody: JSON.stringify(body),
    })
    .promise();
}

async function processMessage(messagePayload) {
  const {
    to,
    from,
    body,
    twilio_subaccount_sid,
    twilio_auth_token_encrypted,
  } = messagePayload;

  if (!to || !body || !twilio_subaccount_sid || !twilio_auth_token_encrypted) {
    throw new Error("Invalid payload: missing required fields");
  }

  // NOTE: auth_token_encrypted is assumed to be usable as-is here.
  // If KMS or another encryption mechanism is used, decrypt before use.
  const client = twilio(twilio_subaccount_sid, twilio_auth_token_encrypted);

  const fromNumber = from || process.env.TWILIO_DEFAULT_FROM;

  if (!fromNumber) {
    throw new Error("No FROM number configured");
  }

  const result = await client.messages.create({
    to,
    from: fromNumber,
    body,
  });

  console.log("SMS sent:", {
    sid: result.sid,
    status: result.status,
    to: result.to,
    from: result.from,
  });
}

function extractPayloadsFromEvent(event) {
  if (!event) return [];
  // Generic support: single payload
  if (event.company_id && event.to && event.body) {
    return [event];
  }
  // SQS-style Records
  if (Array.isArray(event.Records)) {
    return event.Records.map((r) => {
      try {
        return JSON.parse(r.body);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
  return [];
}

exports.handler = async (event) => {
  console.log("SendWorker event:", JSON.stringify(event));
  const payloads = extractPayloadsFromEvent(event);

  for (const payload of payloads) {
    try {
      await processMessage(payload);
    } catch (error) {
      console.error("Error processing send-worker payload:", error);
      await sendToDlq(payload, error);
    }
  }
};


