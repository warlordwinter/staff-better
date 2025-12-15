/**
 * Twilio Webhook Signature Validation
 *
 * Validates that incoming webhook requests are actually from Twilio
 * by verifying the X-Twilio-Signature header.
 *
 * This prevents malicious actors from sending fake webhook events.
 *
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

import crypto from "crypto";
import twilio from "twilio";

/**
 * Validates a Twilio webhook signature
 *
 * @param authToken - Your Twilio Auth Token (from environment variable)
 * @param url - The full URL of your webhook endpoint (including query string)
 * @param params - The POST parameters from the webhook (as a URL-encoded string or object)
 * @param signature - The X-Twilio-Signature header value
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = validateTwilioSignature(
 *   process.env.TWILIO_AUTH_TOKEN!,
 *   request.url,
 *   await request.formData(),
 *   request.headers.get('X-Twilio-Signature')
 * );
 * ```
 */
export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams | FormData | Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) {
    console.warn("⚠️ [TWILIO VALIDATION] Missing X-Twilio-Signature header");
    return false;
  }

  if (!authToken) {
    console.error("❌ [TWILIO VALIDATION] Missing TWILIO_AUTH_TOKEN");
    return false;
  }

  try {
    // Convert params to sorted key-value pairs
    let sortedParams: string;

    if (params instanceof URLSearchParams || params instanceof FormData) {
      // Convert FormData or URLSearchParams to sorted string
      const entries: [string, string][] = [];

      if (params instanceof FormData) {
        // FormData: get all entries (Twilio sends strings, not files)
        for (const [key, value] of params.entries()) {
          // Twilio webhooks only send string values, but TypeScript types allow File
          const stringValue = typeof value === "string" ? value : String(value);
          entries.push([key, stringValue]);
        }
      } else {
        // URLSearchParams: get all entries
        for (const [key, value] of params.entries()) {
          entries.push([key, value]);
        }
      }

      // Sort by key, then format as "key=value"
      sortedParams = entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}${value}`)
        .join("");
    } else {
      // Object: convert to sorted string
      sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}${params[key]}`)
        .join("");
    }

    // Build the signature string: URL + sorted params
    const signatureString = url + sortedParams;

    // Compute HMAC-SHA1 hash
    const computedSignature = crypto
      .createHmac("sha1", authToken)
      .update(signatureString, "utf-8")
      .digest("base64");

    // Compare signatures using constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );

    if (!isValid) {
      console.warn(
        "⚠️ [TWILIO VALIDATION] Invalid signature - request may not be from Twilio"
      );
    }

    return isValid;
  } catch (error) {
    console.error("❌ [TWILIO VALIDATION] Error validating signature:", error);
    return false;
  }
}

/**
 * Validates Twilio webhook signature from Next.js Request
 *
 * Uses Twilio's official validation method from their SDK.
 *
 * @param request - Next.js NextRequest object
 * @param authToken - Your Twilio Auth Token (from environment variable)
 * @param formData - Already-parsed FormData (to avoid reading request body twice)
 * @returns true if signature is valid, false otherwise
 */
export async function validateTwilioWebhook(
  request: Request,
  authToken: string,
  formData: FormData
): Promise<boolean> {
  try {
    // Get the full URL that Twilio used
    // This is critical - the URL must match exactly what Twilio called
    // Twilio signs the request using the exact URL it calls (including protocol, host, path, query)

    let fullUrl: string;

    // Allow override via environment variable for local development (e.g., ngrok URL)
    const webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
    if (webhookBaseUrl) {
      // Use environment variable if set (useful for local development with ngrok)
      const pathAndQuery = request.url.startsWith("/")
        ? request.url
        : new URL(request.url).pathname + new URL(request.url).search;
      fullUrl = `${webhookBaseUrl}${pathAndQuery}`;
      console.log(
        "📞 [TWILIO VALIDATION] Using TWILIO_WEBHOOK_BASE_URL:",
        fullUrl
      );
    } else if (
      request.url.startsWith("http://") ||
      request.url.startsWith("https://")
    ) {
      // Already a full URL - use it directly
      fullUrl = request.url;
    } else {
      // Need to reconstruct from headers
      // IMPORTANT: Use x-forwarded-* headers first (set by reverse proxies/load balancers)
      // These reflect the actual URL that Twilio called
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto");

      // Fall back to regular headers if forwarded headers not present
      const host = forwardedHost || request.headers.get("host");
      const protocol =
        forwardedProto ||
        (request.headers.get("x-forwarded-ssl") === "on" ? "https" : "http");

      if (!host) {
        console.error(
          "❌ [TWILIO VALIDATION] Cannot determine host from request headers"
        );
        console.error("❌ [TWILIO VALIDATION] Available headers:", {
          host: request.headers.get("host"),
          forwardedHost: request.headers.get("x-forwarded-host"),
          forwardedProto: request.headers.get("x-forwarded-proto"),
          url: request.url,
        });
        console.error(
          "💡 [TWILIO VALIDATION] Tip: Set TWILIO_WEBHOOK_BASE_URL environment variable with your public webhook URL (e.g., https://abc123.ngrok.io)"
        );
        return false;
      }

      // Construct full URL from parts
      // request.url should contain path + query string (e.g., "/api/webhooks/twilio/message-status")
      const pathAndQuery = request.url.startsWith("/")
        ? request.url
        : `/${request.url}`;
      fullUrl = `${protocol}://${host}${pathAndQuery}`;
    }

    // Convert FormData to object for Twilio validation
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = typeof value === "string" ? value : String(value);
    }

    // Use Twilio's official validation method
    // This handles all the edge cases (parameter sorting, URL encoding, etc.)
    // Signature: validateRequest(authToken, signature, url, params)
    const signature = request.headers.get("X-Twilio-Signature") || "";
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      fullUrl,
      params
    );

    if (!isValid) {
      console.warn(
        "⚠️ [TWILIO VALIDATION] Invalid signature - request may not be from Twilio"
      );
      console.warn("⚠️ [TWILIO VALIDATION] Debug:", {
        url: fullUrl,
        host,
        protocol,
        signature:
          request.headers.get("X-Twilio-Signature")?.substring(0, 20) + "...",
        paramKeys: Object.keys(params),
      });
    }

    return isValid;
  } catch (error) {
    console.error("❌ [TWILIO VALIDATION] Error validating signature:", error);
    return false;
  }
}
