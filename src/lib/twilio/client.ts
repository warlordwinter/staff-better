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

export function createTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}

// Phone number for sending reminder messages
export const TWILIO_PHONE_NUMBER_REMINDERS =
  process.env.TWILIO_PHONE_NUMBER_REMINDERS;

// Note: Two-way phone number is stored in company.phone_number in the database
// and should be retrieved per company when sending two-way messages
