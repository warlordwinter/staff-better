// Twilio message service implementation

import { IMessageService } from "../interfaces/index";
import { formatPhoneNumber, sendSMS, sendReminderSMS } from "../../twilio/sms";
import { SMSMessage, SMSResult } from "../../twilio/types";

export class TwilioMessageService implements IMessageService {
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    return await sendSMS(message);
  }

  async sendReminderSMS(message: Omit<SMSMessage, "from">): Promise<SMSResult> {
    return await sendReminderSMS(message);
  }

  formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber);
  }
}
