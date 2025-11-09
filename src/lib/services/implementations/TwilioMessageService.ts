// Twilio message service implementation

import { IMessageService } from "../interfaces/index";
import {
  formatPhoneNumber,
  sendSMS,
  sendReminderSMS,
  sendTwoWaySMS as twilioSendTwoWaySMS,
} from "../../twilio/sms";
import { SMSMessage, SMSResult } from "../../twilio/types";

export class TwilioMessageService implements IMessageService {
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    return await sendSMS(message);
  }

  async sendReminderSMS(message: Omit<SMSMessage, "from">): Promise<SMSResult> {
    return await sendReminderSMS(message);
  }

  async sendTwoWaySMS(
    message: Omit<SMSMessage, "from">,
    twoWayPhoneNumber: string
  ): Promise<SMSResult> {
    return await twilioSendTwoWaySMS(message, twoWayPhoneNumber);
  }

  formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber);
  }
}
