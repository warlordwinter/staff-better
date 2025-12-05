// Twilio message service implementation

import { IMessageService } from "../interfaces/index";
import { twilioMessagingAdapter } from "../../twilio/adapter";
import { SMSMessage, SMSResult } from "../../twilio/types";

export class TwilioMessageService implements IMessageService {
  private companyId?: string;

  constructor(companyId?: string) {
    this.companyId = companyId;
  }

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    return twilioMessagingAdapter.sendSMS(message, this.companyId);
  }

  async sendReminderSMS(message: Omit<SMSMessage, "from">): Promise<SMSResult> {
    return twilioMessagingAdapter.sendReminderSMS(message, this.companyId);
  }

  async sendTwoWaySMS(
    message: Omit<SMSMessage, "from">,
    twoWayPhoneNumber: string
  ): Promise<SMSResult> {
    return twilioMessagingAdapter.sendTwoWaySMS(
      message,
      twoWayPhoneNumber,
      this.companyId
    );
  }

  formatPhoneNumber(phoneNumber: string): string {
    return twilioMessagingAdapter.formatPhoneNumber(phoneNumber);
  }
}
