// PSEUDOCODE
// 1. Lambda invoked by SQS (immediate messages only via filter).
// 2. Parse JSON payloads from Records.
// 3. Establish a RabbitMQ channel inside the VPC.
// 4. Publish each payload onto the broker send queue.
// 5. Send failures to the DLQ without blocking other records.

const amqp = require("amqplib");
const AWS = require("aws-sdk");

const DLQ_URL = process.env.DLQ_URL;
const MESSAGE_SENDER_QUEUE_URL = process.env.MESSAGE_SENDER_QUEUE_URL;
const RABBITMQ_ENDPOINT = process.env.RABBITMQ_ENDPOINT;
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME;
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD;
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

async function publishToBroker(channel, payload) {
  if (!payload || !payload.company_id) {
    throw new Error("Invalid payload: missing company_id");
  }
  console.log(`Asserting queue '${SEND_QUEUE}' exists`);
  await channel.assertQueue(SEND_QUEUE, { durable: true });
  console.log(`Sending message to queue '${SEND_QUEUE}'`);
  const sent = channel.sendToQueue(
    SEND_QUEUE,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
    }
  );
  if (!sent) {
    console.warn("Message was not sent to queue (queue may be full)");
  } else {
    console.log("Message sent to RabbitMQ queue successfully");
  }
}

async function publishToSqs(payload) {
  if (!MESSAGE_SENDER_QUEUE_URL) {
    console.warn(
      "MESSAGE_SENDER_QUEUE_URL not configured, skipping SQS publish"
    );
    return;
  }

  try {
    await sqs
      .sendMessage({
        QueueUrl: MESSAGE_SENDER_QUEUE_URL,
        MessageBody: JSON.stringify(payload),
      })
      .promise();
    console.log("Message sent to SQS queue successfully");
  } catch (error) {
    console.error("Error sending message to SQS:", error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log("SendWorker invoked with event:", JSON.stringify(event, null, 2));
  const payloads = extractPayloadsFromEvent(event);

  console.log(`Extracted ${payloads.length} payload(s) from event`);

  if (!payloads.length) {
    console.warn("No payloads extracted from event, exiting");
    return;
  }

  payloads.forEach((payload, index) => {
    console.log(`Payload ${index + 1}:`, {
      messageId: payload.message_id,
      companyId: payload.company_id,
      to: payload.to,
      from: payload.from,
      messageType: payload.message_type,
    });
  });

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
        console.log("Publishing payload to RabbitMQ:", {
          messageId: payload.message_id,
          companyId: payload.company_id,
          to: payload.to,
        });
        await publishToBroker(channel, payload);
        // Also publish to SQS for MessageSender Lambda (outside VPC)
        await publishToSqs(payload);
        console.log("Successfully published payload to RabbitMQ and SQS:", {
          messageId: payload.message_id,
        });
      } catch (error) {
        console.error("Error forwarding payload to broker:", {
          messageId: payload.message_id,
          error: error.message,
          stack: error.stack,
        });
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
