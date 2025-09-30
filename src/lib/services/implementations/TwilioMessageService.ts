// Twilio message service implementation

import { IMessageService } from "../interfaces/index";
import { formatPhoneNumber, sendSMS } from "../../twilio/sms";
import { SMSMessage, SMSResult } from "../../twilio/types";

export class TwilioMessageService implements IMessageService {
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    return await sendSMS(message);
  }

  formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber);
  }
}
