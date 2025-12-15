// Twilio message service implementation

import { IMessageService } from "../interfaces/index";
import {
  formatPhoneNumber,
  sendSMS,
  sendReminderSMS,
  sendTwoWaySMS as twilioSendTwoWaySMS,
} from "../../twilio/sms";
import {
  sendWhatsApp,
  sendWhatsAppBusiness,
  sendWhatsAppBusinessTemplate,
} from "../../twilio/whatsapp";
import {
  SMSMessage,
  SMSResult,
  WhatsAppMessage,
  WhatsAppResult,
  WhatsAppTemplateMessage,
} from "../../twilio/types";

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

  // WhatsApp methods
  async sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
    return await sendWhatsApp(message);
  }

  async sendWhatsAppBusiness(
    message: Omit<WhatsAppMessage, "from">,
    whatsappBusinessNumber: string
  ): Promise<WhatsAppResult> {
    return await sendWhatsAppBusiness(message, whatsappBusinessNumber);
  }

  async sendWhatsAppBusinessTemplate(
    message: Omit<WhatsAppTemplateMessage, "from">,
    whatsappBusinessNumber: string
  ): Promise<WhatsAppResult> {
    return await sendWhatsAppBusinessTemplate(message, whatsappBusinessNumber);
  }
}
