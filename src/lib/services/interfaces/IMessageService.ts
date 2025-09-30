// Abstract interface for message services

import { SMSMessage, SMSResult } from "../../twilio/types";

export interface IMessageService {
  sendSMS(message: SMSMessage): Promise<SMSResult>;
  formatPhoneNumber(phoneNumber: string): string;
}
