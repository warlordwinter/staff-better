import { twilioClient, TWILIO_PHONE_NUMBER } from './client';
import { SMSMessage, SMSResult, SMSError } from './types';

/**
 * Send a single SMS message
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  try {
    const twilioMessage = await twilioClient.messages.create({
      to: message.to,
      from: TWILIO_PHONE_NUMBER,
      body: message.body,
    });

    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from,
      sentAt: new Date(),
    };
  } catch (error: unknown) {
    const twilioError = error as { message?: string; code?: string };
    
    const smsError: SMSError = {
      success: false,
      error: twilioError.message || 'Unknown error occurred',
      code: twilioError.code || 'UNKNOWN',
      to: message.to,
      sentAt: new Date(),
    };

    // Log the error for debugging
    console.error('SMS sending failed:', smsError);
    
    return smsError;
  }
}

/**
 * Send multiple SMS messages in batch
 */
export async function sendBatchSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
  const results: SMSResult[] = [];
  
  // Process messages sequentially to avoid rate limiting
  for (const message of messages) {
    const result = await sendSMS(message);
    results.push(result);
    
    // Add small delay between messages to be respectful of rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Format phone number to E.164 format if it's a US number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required but was not provided');
  }

  // Remove all non-digits
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If it's 11 digits and starts with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If it already has +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Otherwise, return the original (might need manual formatting)
  return phoneNumber;
}