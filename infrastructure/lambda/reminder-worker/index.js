// PSEUDOCODE
// 1. Receive event with one or more reminder payloads
// 2. For each payload:
//    - Ensure target_time is due (<= now)
//    - Create Twilio client from subaccount credentials
//    - Send SMS
//    - On error, push to DLQ

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
    worker: "reminder-worker",
    failed_at: new Date().toISOString(),
  };
  await sqs
    .sendMessage({
      QueueUrl: DLQ_URL,
      MessageBody: JSON.stringify(body),
    })
    .promise();
}

async function processReminder(messagePayload) {
  const {
    to,
    from,
    body,
    target_time,
    twilio_subaccount_sid,
    twilio_auth_token_encrypted,
  } = messagePayload;

  if (!to || !body || !target_time) {
    throw new Error("Invalid reminder payload: missing to/body/target_time");
  }

  const now = new Date();
  const dueTime = new Date(target_time);
  if (isNaN(dueTime.getTime())) {
    throw new Error("Invalid target_time");
  }

  if (dueTime > now) {
    console.log(
      "Reminder not yet due, skipping for now:",
      target_time,
      "current:",
      now.toISOString()
    );
    return;
  }

  if (!twilio_subaccount_sid || !twilio_auth_token_encrypted) {
    throw new Error("Missing Twilio subaccount credentials");
  }

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

  console.log("Reminder SMS sent:", {
    sid: result.sid,
    status: result.status,
    to: result.to,
    from: result.from,
  });
}

function extractPayloadsFromEvent(event) {
  if (!event) return [];
  if (event.company_id && event.to && event.body) {
    return [event];
  }
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
  console.log("ReminderWorker event:", JSON.stringify(event));
  const payloads = extractPayloadsFromEvent(event);

  for (const payload of payloads) {
    try {
      await processReminder(payload);
    } catch (error) {
      console.error("Error processing reminder payload:", error);
      await sendToDlq(payload, error);
    }
  }
};
