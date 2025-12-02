// PSEUDOCODE (kept as comments for clarity)
// 1. Parse HTTP request event from API Gateway
// 2. Extract Authorization header (JWT) and validate
// 3. Decode JWT to get company_id
// 4. Parse JSON body: { to, body, target_time?, message_type? }
// 5. Determine message_type: immediate vs reminder
// 6. Lookup Twilio subaccount for company via Supabase
// 7. Build payload with company/twilio info
// 8. Connect to RabbitMQ (Amazon MQ) using environment connection string
// 9. Publish to send-queue or reminder-queue
// 10. Return 200/4xx depending on validation

const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const { createClient } = require("@supabase/supabase-js");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_VERIFICATION_KEY = process.env.JWT_VERIFICATION_KEY;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RATE_LIMIT_TABLE_NAME = process.env.RATE_LIMIT_TABLE_NAME;
const DLQ_URL = process.env.DLQ_URL;

const SEND_QUEUE = "send-queue";
const REMINDER_QUEUE = "reminder-queue";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

function createSupabaseAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function verifyJwt(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.substring("Bearer ".length);
  return jwt.verify(token, JWT_VERIFICATION_KEY);
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function getTwilioSubaccountForCompany(supabase, companyId) {
  const { data, error } = await supabase
    .from("twilio_subaccounts")
    .select("subaccount_sid, auth_token_encrypted")
    .eq("customer_id", companyId)
    .single();

  if (error) {
    console.error("Error fetching Twilio subaccount:", error);
    throw new Error("Failed to resolve Twilio subaccount");
  }

  if (!data) {
    throw new Error("No Twilio subaccount configured for company");
  }

  return data;
}

async function publishToQueue(queueName, payload) {
  const conn = await amqp.connect(RABBITMQ_URL);
  try {
    const channel = await conn.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    await channel.close();
  } finally {
    await conn.close();
  }
}

async function sendToDlq(payload, error) {
  if (!DLQ_URL) {
    console.error("DLQ_URL not configured, skipping DLQ send");
    return;
  }
  const body = {
    payload,
    error: error ? error.message || String(error) : "Unknown error",
    failed_at: new Date().toISOString(),
    source: "message-router",
  };

  const command = new SendMessageCommand({
    QueueUrl: DLQ_URL,
    MessageBody: JSON.stringify(body),
  });

  await sqs.send(command);
}

async function checkRateLimit(companyId) {
  if (!RATE_LIMIT_TABLE_NAME) {
    return;
  }
  const now = new Date();
  const windowKey = `${now.getUTCFullYear()}-${
    now.getUTCMonth() + 1
  }-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
  const limitPerMinute = 60;

  const command = new UpdateCommand({
    TableName: RATE_LIMIT_TABLE_NAME,
    Key: {
      company_id: companyId,
      window: windowKey,
    },
    UpdateExpression: "ADD #count :inc",
    ExpressionAttributeNames: {
      "#count": "count",
    },
    ExpressionAttributeValues: {
      ":inc": 1,
    },
    ReturnValues: "UPDATED_NEW",
  });

  const result = await dynamoDb.send(command);
  const current =
    result.Attributes && result.Attributes.count ? result.Attributes.count : 1;
  if (current > limitPerMinute) {
    const err = new Error("Rate limit exceeded");
    err.code = "RATE_LIMIT";
    throw err;
  }
}

exports.handler = async (event) => {
  console.log("MessageRouter event:", JSON.stringify(event));

  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const authHeader =
      (event.headers &&
        (event.headers.authorization || event.headers.Authorization)) ||
      null;

    // Handle JWT/auth errors separately - don't send to DLQ, return immediately
    let claims;
    try {
      claims = await verifyJwt(authHeader);
    } catch (authError) {
      console.error("Authentication error:", authError.message);
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Unauthorized",
          message:
            authError.message || "Invalid or missing authentication token",
        }),
      };
    }

    const companyId = claims.company_id || claims["company_id"];

    if (!companyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "company_id missing from token" }),
      };
    }

    const body = parseBody(event);
    const { to, from, message, target_time, message_type } = body;

    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "to and message are required" }),
      };
    }

    const type = message_type || (target_time ? "reminder" : "immediate");

    if (type !== "immediate" && type !== "reminder") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid message_type" }),
      };
    }

    if (type === "reminder" && !target_time) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "target_time required for reminders" }),
      };
    }

    const supabase = createSupabaseAdminClient();
    const twilioSubaccount = await getTwilioSubaccountForCompany(
      supabase,
      companyId
    );

    const payload = {
      company_id: companyId,
      to,
      from: from || null,
      body: message,
      message_type: type,
      target_time: target_time || null,
      twilio_subaccount_sid: twilioSubaccount.subaccount_sid,
      twilio_auth_token_encrypted: twilioSubaccount.auth_token_encrypted,
      created_at: new Date().toISOString(),
    };

    await checkRateLimit(companyId);

    const queueName = type === "immediate" ? SEND_QUEUE : REMINDER_QUEUE;
    await publishToQueue(queueName, payload);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Router error:", error);

    // Determine if this is a client error (4xx) or server error (5xx)
    const isClientError =
      error.message &&
      (error.message.includes("required") ||
        error.message.includes("invalid") ||
        error.message.includes("missing") ||
        error.message.includes("No Twilio subaccount"));

    // Only send server errors to DLQ, and make it non-blocking
    if (!isClientError && DLQ_URL) {
      // Send to DLQ asynchronously without blocking response
      sendToDlq(event, error).catch((dlqError) => {
        console.error("Failed to send to DLQ (non-blocking):", dlqError);
      });
    }

    const statusCode = isClientError ? 400 : 500;
    return {
      statusCode: statusCode,
      body: JSON.stringify({
        error: error.message || "Internal server error",
        type: isClientError ? "client_error" : "server_error",
      }),
    };
  }
};
