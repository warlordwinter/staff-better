import twilio from "twilio";

if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error("TWILIO_ACCOUNT_SID is required");
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("TWILIO_AUTH_TOKEN is required");
}

// Support for reminder phone number from environment variable
// The two-way phone number is stored in company.phone_number in the database
if (!process.env.TWILIO_PHONE_NUMBER_REMINDERS) {
  throw new Error("TWILIO_PHONE_NUMBER_REMINDERS is required");
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Phone number for sending reminder messages
export const TWILIO_PHONE_NUMBER_REMINDERS =
  process.env.TWILIO_PHONE_NUMBER_REMINDERS;

// WhatsApp Business phone number (optional - for WhatsApp messaging)
// If not set, you'll need to provide it when sending WhatsApp messages
export const TWILIO_WHATSAPP_NUMBER =
  process.env.TWILIO_WHATSAPP_NUMBER || null;

// Note: Two-way phone number is stored in company.phone_number in the database
// and should be retrieved per company when sending two-way messages
