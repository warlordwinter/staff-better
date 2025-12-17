# Twilio Message Status Webhook Setup Guide

This guide explains how to configure Twilio to send message status callbacks to our webhook endpoint.

## Overview

The webhook endpoint `/api/webhooks/twilio/message-status` receives delivery status updates from Twilio for both SMS and WhatsApp messages. It:

- ✅ Validates webhook authenticity using Twilio signatures
- ✅ Logs all message lifecycle events for audit purposes
- ✅ Detects WhatsApp policy failures (ErrorCode 63049)
- ✅ Automatically falls back to SMS when WhatsApp fails
- ✅ Ensures idempotency (safe for retries)

## Prerequisites

1. **Database Migration**: Run the migration to create the `message_events` table:

   ```bash
   # Apply the migration file
   migrations/create_message_events_table.sql
   ```

2. **Environment Variables**: Ensure these are set:
   - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token (used for signature validation)
   - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
   - `TWILIO_PHONE_NUMBER_REMINDERS` - Your Twilio phone number for SMS

## Twilio Console Configuration

### Step 1: Navigate to Messaging Settings

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Go to **Messaging** → **Settings** → **Messaging Services** (for SMS)
   OR
   Go to **Messaging** → **Settings** → **WhatsApp Senders** (for WhatsApp)

### Step 2: Configure Status Callback URL

#### For SMS (Messaging Service):

1. Select your Messaging Service
2. Scroll to **Integration** section
3. Under **Status Callback URL**, enter:
   ```
   https://yourdomain.com/api/webhooks/twilio/message-status
   ```
4. Select **HTTP POST** as the method
5. Click **Save**

#### For WhatsApp:

1. Go to **Messaging** → **Settings** → **WhatsApp Senders**
2. Select your WhatsApp Business number
3. Under **Status Callback URL**, enter:
   ```
   https://yourdomain.com/api/webhooks/twilio/message-status
   ```
4. Select **HTTP POST** as the method
5. Click **Save**

#### Alternative: Configure per Message Send

You can also set the status callback URL when sending messages programmatically:

```typescript
// SMS example
await twilioClient.messages.create({
  to: "+1234567890",
  from: "+0987654321",
  body: "Hello",
  statusCallback: "https://yourdomain.com/api/webhooks/twilio/message-status",
  statusCallbackMethod: "POST",
});

// WhatsApp example
await twilioClient.messages.create({
  to: "whatsapp:+1234567890",
  from: "whatsapp:+0987654321",
  body: "Hello",
  statusCallback: "https://yourdomain.com/api/webhooks/twilio/message-status",
  statusCallbackMethod: "POST",
});
```

### Step 3: Enable Signature Validation (Recommended)

Twilio automatically includes the `X-Twilio-Signature` header with all webhooks. Our endpoint validates this signature using your `TWILIO_AUTH_TOKEN`.

**Important**: Keep your `TWILIO_AUTH_TOKEN` secret and never expose it in client-side code.

## Webhook Payload

Twilio sends webhooks as `application/x-www-form-urlencoded` POST requests with these fields:

| Field           | Description                        | Example                                                |
| --------------- | ---------------------------------- | ------------------------------------------------------ |
| `MessageSid`    | Unique Twilio message identifier   | `SM1234567890abcdef`                                   |
| `MessageStatus` | Current message status             | `delivered`, `failed`, `sent`, `queued`, `undelivered` |
| `To`            | Recipient phone number             | `+1234567890` or `whatsapp:+1234567890`                |
| `From`          | Sender phone number                | `+0987654321` or `whatsapp:+0987654321`                |
| `ErrorCode`     | Error code (if failed/undelivered) | `63049` (WhatsApp policy violation)                    |
| `ErrorMessage`  | Human-readable error message       | `User has opted out`                                   |

## Message Status Values

Twilio sends these status values:

- `queued` - Message is queued for delivery
- `sent` - Message was sent to carrier
- `delivered` - Message was delivered to recipient
- `failed` - Message failed to send
- `undelivered` - Message could not be delivered
- `receiving` - Message is being received (inbound)
- `received` - Message was received (inbound)

## WhatsApp Policy Failures (ErrorCode 63049)

When a WhatsApp message fails with ErrorCode `63049`, it indicates a WhatsApp policy violation:

- User has blocked your WhatsApp Business number
- User has opted out of WhatsApp messages
- WhatsApp Business Account restrictions
- Other WhatsApp policy violations

**Automatic SMS Fallback**: Our webhook automatically detects ErrorCode 63049 and sends the same message via SMS as a fallback. This ensures message delivery even when WhatsApp fails.

## Idempotency

The webhook is **idempotent** - it's safe for Twilio to retry the same webhook multiple times. We use a unique constraint on `(message_sid, message_status)` to prevent duplicate processing.

If Twilio retries a webhook:

- The duplicate event is detected
- Processing is skipped
- No duplicate SMS fallbacks are sent

## Testing

### Test with Twilio CLI

```bash
# Install Twilio CLI if needed
npm install -g twilio-cli

# Send a test webhook
twilio api:core:messages:create \
  --to "+1234567890" \
  --from "+0987654321" \
  --body "Test message" \
  --status-callback "https://yourdomain.com/api/webhooks/twilio/message-status" \
  --status-callback-method POST
```

### Test with ngrok (Local Development)

1. Start your Next.js dev server:

   ```bash
   npm run dev
   ```

2. Expose it with ngrok:

   ```bash
   ngrok http 3000
   ```

3. Use the ngrok URL in Twilio Console:

   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/twilio/message-status
   ```

4. Send a test message and check your logs for webhook events

### Verify Webhook Receipt

Check your application logs for:

```
📞 [WEBHOOK] Received Twilio message status webhook
✅ [WEBHOOK] Twilio signature validated
✅ [WEBHOOK] Message event logged: <event-id>
```

## Monitoring

### Check Message Events

Query the `message_events` table to see all webhook events:

```sql
-- View recent events
SELECT * FROM message_events
ORDER BY created_at DESC
LIMIT 100;

-- View WhatsApp failures
SELECT * FROM message_events
WHERE channel = 'whatsapp'
  AND message_status = 'failed'
  AND error_code = '63049';

-- View SMS fallbacks
SELECT * FROM message_events
WHERE fallback_sms_message_id IS NOT NULL;
```

### Check Failed Messages

```sql
-- Messages that failed
SELECT m.*, me.error_code, me.error_message
FROM messages m
JOIN message_events me ON m.twilio_sid = me.message_sid
WHERE me.message_status = 'failed'
ORDER BY me.created_at DESC;
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Twilio Console**: Verify the status callback URL is configured correctly
2. **Check Logs**: Look for webhook requests in your application logs
3. **Check Signature Validation**: Ensure `TWILIO_AUTH_TOKEN` is set correctly
4. **Check URL**: Ensure the webhook URL is publicly accessible (not localhost)

### Signature Validation Failing

- Ensure `TWILIO_AUTH_TOKEN` matches your Twilio account
- Check that the webhook URL includes the full path (including query string if any)
- Verify the request is coming from Twilio (check `User-Agent` header)

### SMS Fallback Not Sending

1. Check logs for error messages
2. Verify `TWILIO_PHONE_NUMBER_REMINDERS` is set
3. Verify company phone number is configured in database
4. Check that the original message exists in `messages` table
5. Verify conversation has a `company_id`

### Duplicate Events

- The unique constraint on `(message_sid, message_status)` prevents duplicates
- If you see duplicate events, check for database constraint violations in logs

## Security Considerations

1. **Signature Validation**: Always validate Twilio signatures in production
2. **HTTPS**: Use HTTPS for webhook URLs (required by Twilio)
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Secrets**: Never expose `TWILIO_AUTH_TOKEN` in client-side code

## Related Documentation

- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Twilio Status Callbacks](https://www.twilio.com/docs/messaging/guides/status-callbacks)
- [WhatsApp Error Codes](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates#error-codes)
