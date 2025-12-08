// PSEUDOCODE (kept as comments for clarity)
// 1. Validate HTTP method + Authorization header, verify JWT.
// 2. Parse request body, derive message_type (immediate/reminder) and validate inputs.
// 3. Normalize reminder timestamps and enforce rate limiting via DynamoDB.
// 4. Fetch Twilio subaccount metadata for the company from Supabase.
// 5. Build a broker payload and enqueue it onto the BrokerMessageQueue (SQS) with message attributes.
// 6. Return 200 on success, map validation/rate errors to 4xx, and push server errors to DLQ asynchronously.

const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
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
const RATE_LIMIT_TABLE_NAME = process.env.RATE_LIMIT_TABLE_NAME;
const DLQ_URL = process.env.DLQ_URL;
const BROKER_MESSAGE_QUEUE_URL = process.env.BROKER_MESSAGE_QUEUE_URL;

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
  const customer = await getIsvCustomerForCompany(supabase, companyId);

  const { data, error } = await supabase
    .from("twilio_subaccounts")
    .select("subaccount_sid, auth_token_encrypted, messaging_service_sid, created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    console.error("Error fetching Twilio subaccount:", error);
    throw new Error("Failed to resolve Twilio subaccount");
  }

  if (!data || data.length === 0) {
    throw new Error("No Twilio subaccount configured for company");
  }

  if (data.length > 1) {
    console.warn(
      `Multiple Twilio subaccounts found for customer ${customer.id}; using the most recent`
    );
  }

  return data[0];
}

async function getIsvCustomerForCompany(supabase, companyId) {
  const { data, error } = await supabase
    .from("isv_customers")
    .select("id")
    .eq("company_id", companyId)
    .single();

  if (error) {
    console.error("Error fetching ISV customer:", error);
    throw new Error("Failed to resolve ISV customer for company");
  }

  if (!data) {
    throw new Error("No ISV customer configured for company");
  }

  return data;
}

async function enqueueForBroker(messageType, payload) {
  if (!BROKER_MESSAGE_QUEUE_URL) {
    throw new Error("BROKER_MESSAGE_QUEUE_URL is not configured");
  }

  const command = new SendMessageCommand({
    QueueUrl: BROKER_MESSAGE_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
    MessageAttributes: {
      MessageType: {
        DataType: "String",
        StringValue: messageType,
      },
    },
  });

  console.log("Enqueuing message to broker:", {
    queueUrl: BROKER_MESSAGE_QUEUE_URL,
    messageType: messageType,
    messageId: payload.message_id,
    companyId: payload.company_id,
    to: payload.to,
    from: payload.from,
  });

  try {
    const result = await sqs.send(command);
    console.log("Successfully enqueued message to SQS:", {
      messageId: payload.message_id,
      sqsMessageId: result.MessageId,
      messageType: messageType,
    });
    return result;
  } catch (error) {
    console.error("Failed to enqueue message to SQS:", {
      messageId: payload.message_id,
      error: error.message,
      errorCode: error.code,
      messageType: messageType,
    });
    throw error;
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

    let normalizedTargetTime = null;
    if (type === "reminder") {
      const parsedTarget = new Date(target_time);
      if (
        !target_time ||
        typeof target_time !== "string" ||
        Number.isNaN(parsedTarget.getTime())
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "target_time must be a valid ISO-8601 timestamp",
          }),
        };
      }

      if (parsedTarget.getTime() <= Date.now()) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "target_time must be in the future",
          }),
        };
      }

      normalizedTargetTime = parsedTarget.toISOString();
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
      target_time: normalizedTargetTime,
      twilio_subaccount_sid: twilioSubaccount.subaccount_sid,
      twilio_auth_token_encrypted: twilioSubaccount.auth_token_encrypted,
      twilio_messaging_service_sid: twilioSubaccount.messaging_service_sid || null,
      created_at: new Date().toISOString(),
      message_id: randomUUID(),
    };

    await checkRateLimit(companyId);

    console.log("About to enqueue message:", {
      messageType: type,
      messageId: payload.message_id,
      companyId: companyId,
    });

    await enqueueForBroker(type, payload);

    console.log("Message successfully enqueued, returning success response");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: payload.message_id,
        status: "queued",
        to: payload.to,
        from: payload.from,
      }),
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
    const isRateLimitError = error.code === "RATE_LIMIT";

    // Only send server errors to DLQ, and make it non-blocking
    if (!isClientError && !isRateLimitError && DLQ_URL) {
      // Send to DLQ asynchronously without blocking response
      sendToDlq(event, error).catch((dlqError) => {
        console.error("Failed to send to DLQ (non-blocking):", dlqError);
      });
    }

    const statusCode = isRateLimitError ? 429 : isClientError ? 400 : 500;
    return {
      statusCode: statusCode,
      body: JSON.stringify({
        error: error.message || "Internal server error",
        type: isRateLimitError
          ? "rate_limit"
          : isClientError
          ? "client_error"
          : "server_error",
      }),
    };
  }
};
