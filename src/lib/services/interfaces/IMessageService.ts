// Abstract interface for message services

import { SMSMessage, SMSResult } from "../../twilio/types";

export interface IMessageService {
  sendSMS(message: SMSMessage): Promise<SMSResult>;
  sendReminderSMS(message: Omit<SMSMessage, "from">): Promise<SMSResult>;
  sendTwoWaySMS(
    message: Omit<SMSMessage, "from">,
    twoWayPhoneNumber: string
  ): Promise<SMSResult>;
  formatPhoneNumber(phoneNumber: string): string;
}
