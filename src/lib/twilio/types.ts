// Twilio message statuses (complete list from Twilio docs)
export type TwilioMessageStatus =
  | "accepted"
  | "scheduled"
  | "canceled"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "delivered"
  | "undelivered"
  | "receiving"
  | "received"
  | "read"
  | "partially_delivered";

// Input message structure
export interface SMSMessage {
  to: string;
  body: string;
  from: string; // Required: specify which Twilio number to use (reminder number or company two-way number)
}

// Successful SMS result
export interface SMSSuccess {
  success: true;
  messageId: string;
  status: TwilioMessageStatus;
  to: string;
  from: string | null;
  sentAt: Date;
}

// Failed SMS result
export interface SMSError {
  success: false;
  error: string;
  code: string;
  to: string;
  sentAt: Date;
}

// Union type for SMS results
export type SMSResult = SMSSuccess | SMSError;

// Twilio webhook payload structure (for delivery status updates)
export interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: TwilioMessageStatus;
  To: string;
  From: string;
  Body: string;
  NumSegments: string;
  AccountSid: string;
  ApiVersion: string;
  [key: string]: string; // Twilio sends additional fields
}

// Common Twilio error codes
export enum TwilioErrorCode {
  INVALID_PHONE_NUMBER = "21211",
  UNSUBSCRIBED_PHONE_NUMBER = "21610",
  QUEUE_OVERFLOW = "30001",
  ACCOUNT_SUSPENDED = "20003",
  INSUFFICIENT_FUNDS = "20005",
  MESSAGE_TOO_LONG = "30007",
  RATE_LIMIT_EXCEEDED = "20429",
}

// Batch processing result
export interface BatchSMSResult {
  total: number;
  successful: number;
  failed: number;
  results: SMSResult[];
}

// Configuration options
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl?: string;
}
