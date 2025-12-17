# Twilio Message Status Webhook Implementation Summary

## Overview

This implementation provides a production-ready Twilio delivery status callback system that handles message lifecycle events, validates webhook authenticity, and automatically falls back to SMS when WhatsApp messages fail due to policy violations.

## Architecture

### Components

1. **Database Schema** (`migrations/create_message_events_table.sql`)
   - `message_events` table for tracking all webhook events
   - Unique constraint on `(message_sid, message_status)` for idempotency
   - Links to original messages and fallback SMS messages

2. **Signature Validation** (`src/lib/twilio/webhookValidation.ts`)
   - Validates `X-Twilio-Signature` header using HMAC-SHA1
   - Prevents unauthorized webhook requests
   - Supports FormData, URLSearchParams, and object formats

3. **Webhook Endpoint** (`src/app/api/webhooks/twilio/message-status/route.ts`)
   - POST endpoint at `/api/webhooks/twilio/message-status`
   - Processes webhooks asynchronously (returns 200 immediately)
   - Implements business logic for WhatsApp failures and SMS fallback

## Key Features

### ✅ Twilio Signature Validation

- Validates all incoming webhooks using `X-Twilio-Signature` header
- Uses `TWILIO_AUTH_TOKEN` from environment variables
- Prevents malicious actors from sending fake webhook events

### ✅ Message Event Logging

- Logs all message lifecycle events to `message_events` table
- Tracks: message_sid, status, channel, error codes, timestamps
- Links events to original messages in `messages` table

### ✅ Idempotency

- Unique constraint on `(message_sid, message_status)` prevents duplicates
- Safe for Twilio retries - duplicate events are automatically skipped
- No duplicate SMS fallbacks sent

### ✅ WhatsApp Failure Detection

- Detects ErrorCode `63049` (WhatsApp policy violations)
- Common causes:
  - User blocked WhatsApp Business number
  - User opted out of WhatsApp messages
  - WhatsApp Business Account restrictions

### ✅ Automatic SMS Fallback

- When WhatsApp fails with ErrorCode 63049:
  1. Finds original message in database
  2. Gets company phone number for SMS
  3. Sends same message via SMS
  4. Links fallback SMS to original WhatsApp message
  5. Prevents duplicate fallbacks (checks before sending)

### ✅ Channel Detection

- Automatically detects channel from phone number format:
  - `whatsapp:+1234567890` → WhatsApp
  - `+1234567890` → SMS
- Normalizes phone numbers for storage (removes `whatsapp:` prefix)

### ✅ Status Updates

- Updates `messages` table with latest status
- Sets `delivered_at` timestamp when status is "delivered"
- Handles all Twilio status values: queued, sent, delivered, failed, undelivered

## Database Schema

```sql
CREATE TABLE message_events (
  id UUID PRIMARY KEY,
  message_sid TEXT NOT NULL,
  message_status TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  message_id UUID REFERENCES messages(id),
  fallback_sms_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_sid, message_status)  -- Idempotency
);
```

## API Endpoint

**POST** `/api/webhooks/twilio/message-status`

### Request (from Twilio)

```
Content-Type: application/x-www-form-urlencoded

MessageSid=SM1234567890abcdef
MessageStatus=failed
To=whatsapp:+1234567890
From=whatsapp:+0987654321
ErrorCode=63049
ErrorMessage=User has opted out
```

### Response

```
200 OK
```

Always returns 200 immediately, processes webhook asynchronously.

## Flow Diagram

```
Twilio Webhook
    ↓
Validate Signature
    ↓
Parse Webhook Data
    ↓
Check Idempotency (message_sid + message_status)
    ↓ (if duplicate)
Skip Processing
    ↓ (if new)
Insert message_events record
    ↓
Update messages table status
    ↓
Is WhatsApp + Failed + ErrorCode 63049?
    ↓ (yes)
Check if fallback already sent
    ↓ (if not)
Get company phone number
    ↓
Send SMS fallback
    ↓
Link fallback SMS to original message
    ↓
Done
```

## Error Handling

- **Invalid Signature**: Webhook rejected, logged, not processed
- **Missing Fields**: Logged, processing skipped, 200 returned
- **Database Errors**: Logged, processing continues where possible
- **SMS Fallback Failures**: Logged, don't affect webhook response

## Security

1. **Signature Validation**: All webhooks validated before processing
2. **Environment Variables**: Secrets stored in environment, not hardcoded
3. **HTTPS Required**: Twilio requires HTTPS for webhook URLs
4. **Idempotency**: Prevents replay attacks and duplicate processing

## Performance

- **Fast Response**: Returns 200 immediately (< 100ms)
- **Async Processing**: Long operations (SMS fallback) run asynchronously
- **Database Indexes**: Optimized queries with indexes on:
  - `message_sid` (most common lookup)
  - `message_status` (monitoring)
  - `error_code` (failure analysis)
  - `channel` (channel-specific queries)

## Monitoring

### Key Metrics to Track

1. **Webhook Volume**: Count of events per hour/day
2. **Failure Rate**: Percentage of failed messages
3. **WhatsApp Failures**: Count of ErrorCode 63049 events
4. **SMS Fallbacks**: Count of fallback messages sent
5. **Signature Validation Failures**: Potential security issues

### Useful Queries

```sql
-- Recent webhook events
SELECT * FROM message_events 
ORDER BY created_at DESC 
LIMIT 100;

-- WhatsApp failures requiring attention
SELECT * FROM message_events 
WHERE channel = 'whatsapp' 
  AND message_status = 'failed' 
  AND error_code = '63049'
ORDER BY created_at DESC;

-- SMS fallback success rate
SELECT 
  COUNT(*) as total_fallbacks,
  COUNT(fallback_sms_message_id) as successful_fallbacks
FROM message_events 
WHERE fallback_sms_message_id IS NOT NULL;
```

## Testing

### Unit Tests

Test signature validation, phone number extraction, channel detection.

### Integration Tests

Test webhook processing, idempotency, SMS fallback logic.

### Manual Testing

1. Send test message via Twilio
2. Check webhook received in logs
3. Verify event logged in database
4. Test WhatsApp failure scenario
5. Verify SMS fallback sent

## Deployment Checklist

- [ ] Run database migration (`create_message_events_table.sql`)
- [ ] Set `TWILIO_AUTH_TOKEN` environment variable
- [ ] Configure webhook URL in Twilio Console
- [ ] Test webhook with test message
- [ ] Verify signature validation working
- [ ] Monitor logs for first few webhooks
- [ ] Set up alerts for signature validation failures

## Future Enhancements

1. **Retry Logic**: Custom retry for undelivered messages
2. **Analytics Dashboard**: Visualize message delivery metrics
3. **Alerting**: Notify on high failure rates
4. **Template Reconstruction**: Better SMS fallback message formatting
5. **Multi-Channel Fallback**: Try multiple channels before giving up

## Related Files

- `migrations/create_message_events_table.sql` - Database schema
- `src/lib/twilio/webhookValidation.ts` - Signature validation
- `src/app/api/webhooks/twilio/message-status/route.ts` - Webhook endpoint
- `docs/TWILIO_WEBHOOK_SETUP.md` - Setup guide for Twilio Console

