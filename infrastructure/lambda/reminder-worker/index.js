// PSEUDOCODE
// 1. Lambda invoked by SQS (reminder messages via filter).
// 2. Parse JSON payloads from Records.
// 3. Open RabbitMQ connection inside VPC.
// 4. Publish each reminder payload to the broker reminder queue.
// 5. Send failures to the DLQ without blocking the remaining batch.

const amqp = require("amqplib");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;
const RABBITMQ_ENDPOINT = process.env.RABBITMQ_ENDPOINT;
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME;
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD;
const REMINDER_QUEUE = "reminder-queue";

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

function buildRabbitMQUrl(endpoint, username, password) {
  if (!endpoint || !username || !password) {
    throw new Error("RabbitMQ endpoint, username, and password are required");
  }

  // Remove protocol if present, extract hostname
  let hostname = endpoint.replace(/^amqps?:\/\//, "").replace(/:\d+$/, "");

  // URL encode username and password to handle special characters
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);

  // Construct full connection URL: amqps://username:password@hostname:5671/%2F
  return `amqps://${encodedUsername}:${encodedPassword}@${hostname}:5671/%2F`;
}

async function publishReminder(channel, payload) {
  if (!payload || !payload.target_time) {
    throw new Error("Invalid reminder payload: missing target_time");
  }
  const parsed = new Date(payload.target_time);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid reminder payload: target_time is not ISO-8601");
  }

  await channel.assertQueue(REMINDER_QUEUE, { durable: true });
  channel.sendToQueue(REMINDER_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

exports.handler = async (event) => {
  console.log("ReminderWorker event:", JSON.stringify(event));
  const payloads = extractPayloadsFromEvent(event);

  if (!payloads.length) {
    return;
  }

  if (!RABBITMQ_ENDPOINT || !RABBITMQ_USERNAME || !RABBITMQ_PASSWORD) {
    console.error("RabbitMQ configuration is incomplete. Failing batch.");
    await Promise.all(
      payloads.map((p) =>
        sendToDlq(p, new Error("Missing RabbitMQ configuration"))
      )
    );
    return;
  }

  let connection;
  let channel;

  try {
    const rabbitMQUrl = buildRabbitMQUrl(
      RABBITMQ_ENDPOINT,
      RABBITMQ_USERNAME,
      RABBITMQ_PASSWORD
    );
    connection = await amqp.connect(rabbitMQUrl);
    channel = await connection.createChannel();

    for (const payload of payloads) {
      try {
        await publishReminder(channel, payload);
      } catch (error) {
        console.error("Error forwarding reminder payload:", error);
        await sendToDlq(payload, error);
      }
    }
  } catch (connectionError) {
    console.error("Failed to establish RabbitMQ connection:", connectionError);
    await Promise.all(
      payloads.map((payload) => sendToDlq(payload, connectionError))
    );
  } finally {
    if (channel) {
      await channel
        .close()
        .catch((err) => console.error("Failed to close channel:", err));
    }
    if (connection) {
      await connection
        .close()
        .catch((err) => console.error("Failed to close connection:", err));
    }
  }
};
