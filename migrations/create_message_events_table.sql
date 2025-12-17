-- Migration: Create message_events table for tracking Twilio message lifecycle events
-- This table stores all status updates from Twilio webhooks for audit and idempotency

CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Twilio message identifiers
  message_sid TEXT NOT NULL,
  message_status TEXT NOT NULL,
  
  -- Channel information (whatsapp or sms)
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  
  -- Phone numbers (normalized, without whatsapp: prefix for storage)
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  
  -- Error information (nullable - only present on failures)
  error_code TEXT,
  error_message TEXT,
  
  -- Link to original message in messages table (nullable - may not exist for all events)
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Link to fallback SMS message if this was a WhatsApp failure that triggered SMS fallback
  fallback_sms_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotency: Ensure we don't process the same (message_sid + message_status) twice
  -- This prevents duplicate processing if Twilio retries the webhook
  UNIQUE(message_sid, message_status)
);

-- Index for fast lookups by message_sid (most common query)
CREATE INDEX IF NOT EXISTS idx_message_events_message_sid ON message_events(message_sid);

-- Index for finding messages by status (useful for monitoring)
CREATE INDEX IF NOT EXISTS idx_message_events_status ON message_events(message_status);

-- Index for finding WhatsApp failures (ErrorCode 63049)
CREATE INDEX IF NOT EXISTS idx_message_events_error_code ON message_events(error_code) WHERE error_code IS NOT NULL;

-- Index for finding events by channel
CREATE INDEX IF NOT EXISTS idx_message_events_channel ON message_events(channel);

-- Index for linking to original messages
CREATE INDEX IF NOT EXISTS idx_message_events_message_id ON message_events(message_id) WHERE message_id IS NOT NULL;

-- Index for finding fallback messages
CREATE INDEX IF NOT EXISTS idx_message_events_fallback_sms ON message_events(fallback_sms_message_id) WHERE fallback_sms_message_id IS NOT NULL;

-- Add comment to table
COMMENT ON TABLE message_events IS 'Tracks all Twilio message status webhook events for audit, idempotency, and automatic SMS fallback on WhatsApp failures';

-- Add comments to key columns
COMMENT ON COLUMN message_events.message_sid IS 'Twilio MessageSid - unique identifier for the message';
COMMENT ON COLUMN message_events.message_status IS 'Twilio MessageStatus (queued, sent, delivered, failed, undelivered, etc.)';
COMMENT ON COLUMN message_events.channel IS 'Channel type: whatsapp or sms';
COMMENT ON COLUMN message_events.error_code IS 'Twilio ErrorCode (e.g., 63049 for WhatsApp policy violations)';
COMMENT ON COLUMN message_events.fallback_sms_message_id IS 'If this WhatsApp message failed and triggered SMS fallback, links to the fallback SMS message';
COMMENT ON COLUMN message_events.message_id IS 'Links to the original message record in messages table';

