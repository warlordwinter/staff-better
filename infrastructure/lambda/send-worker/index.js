// PSEUDOCODE
// 1. Lambda invoked by SQS (immediate messages only via filter).
// 2. Parse JSON payloads from Records.
// 3. Establish a RabbitMQ channel inside the VPC.
// 4. Publish each payload onto the broker send queue.
// 5. Send failures to the DLQ without blocking other records.

const amqp = require("amqplib");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const SEND_QUEUE = "send-queue";

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

async function publishToBroker(channel, payload) {
  if (!payload || !payload.company_id) {
    throw new Error("Invalid payload: missing company_id");
  }
  await channel.assertQueue(SEND_QUEUE, { durable: true });
  channel.sendToQueue(SEND_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

exports.handler = async (event) => {
  console.log("SendWorker event:", JSON.stringify(event));
  const payloads = extractPayloadsFromEvent(event);

  if (!payloads.length) {
    return;
  }

  if (!RABBITMQ_URL) {
    console.error("RABBITMQ_URL is not configured. Failing batch.");
    await Promise.all(payloads.map((p) => sendToDlq(p, new Error("Missing broker URL"))));
    return;
  }

  let connection;
  let channel;

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    for (const payload of payloads) {
      try {
        await publishToBroker(channel, payload);
      } catch (error) {
        console.error("Error forwarding payload to broker:", error);
        await sendToDlq(payload, error);
      }
    }
  } catch (connectionError) {
    console.error("Failed to establish RabbitMQ connection:", connectionError);
    await Promise.all(payloads.map((payload) => sendToDlq(payload, connectionError)));
  } finally {
    if (channel) {
      await channel.close().catch((err) =>
        console.error("Failed to close channel:", err)
      );
    }
    if (connection) {
      await connection.close().catch((err) =>
        console.error("Failed to close connection:", err)
      );
    }
  }
};
