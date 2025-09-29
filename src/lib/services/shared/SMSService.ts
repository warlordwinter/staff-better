// Shared SMS functionality across all services

import { sendSMS, formatPhoneNumber } from "../../twilio/sms";
import { SMSMessage, SMSResult } from "../../twilio/types";

export class SMSService {
  /**
   * Send an SMS message with proper error handling
   */
  async sendMessage(phoneNumber: string, message: string): Promise<SMSResult> {
    const smsMessage: SMSMessage = {
      to: phoneNumber,
      body: message,
    };

    try {
      const result = await sendSMS(smsMessage);

      if (!result.success) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, result.error);
      } else {
        console.log(`SMS sent successfully to ${phoneNumber}`);
      }

      return result;
    } catch (error) {
      console.error(`Error sending SMS to ${phoneNumber}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "UNKNOWN",
        to: phoneNumber,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Format phone number to standard format
   */
  formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber);
  }

  /**
   * Normalize phone number to consistent format
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    // If it starts with 1 and is 11 digits, remove the 1
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return "+1" + digitsOnly.substring(1);
    }

    // If it's 10 digits, add +1
    if (digitsOnly.length === 10) {
      return "+1" + digitsOnly;
    }

    // Otherwise, assume it's already properly formatted
    return phoneNumber;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    // Basic validation - should start with +1 and be 12 characters total
    return normalized.startsWith("+1") && normalized.length === 12;
  }
}
