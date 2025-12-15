-- Add twilio_sid column to messages table
-- This column stores the Twilio Message SID for tracking message status updates

-- Check if column exists before adding (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'twilio_sid'
    ) THEN
        ALTER TABLE messages 
        ADD COLUMN twilio_sid VARCHAR(255);
        
        -- Create index for faster lookups by twilio_sid
        CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_sid);
        
        RAISE NOTICE 'Added twilio_sid column to messages table';
    ELSE
        RAISE NOTICE 'Column twilio_sid already exists in messages table';
    END IF;
END $$;

