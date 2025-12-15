-- Add channel column to conversations table to separate SMS and WhatsApp conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms' CHECK (channel IN ('sms', 'whatsapp'));

-- Create index for faster lookups by associate, company, and channel
CREATE INDEX IF NOT EXISTS idx_conversations_associate_company_channel 
ON conversations(associate_id, company_id, channel);

-- Update existing conversations to have 'sms' as default (if they don't have it)
UPDATE conversations 
SET channel = 'sms' 
WHERE channel IS NULL;

