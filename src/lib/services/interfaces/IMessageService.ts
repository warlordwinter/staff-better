// Abstract interface for message services

import { SMSMessage, SMSResult, WhatsAppMessage, WhatsAppResult } from "../../twilio/types";

export interface IMessageService {
  sendSMS(message: SMSMessage): Promise<SMSResult>;
  sendReminderSMS(message: Omit<SMSMessage, "from">): Promise<SMSResult>;
  sendTwoWaySMS(
    message: Omit<SMSMessage, "from">,
    twoWayPhoneNumber: string
  ): Promise<SMSResult>;
  formatPhoneNumber(phoneNumber: string): string;
  // WhatsApp methods
  sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult>;
  sendWhatsAppBusiness(
    message: Omit<WhatsAppMessage, "from">,
    whatsappBusinessNumber: string
  ): Promise<WhatsAppResult>;
}
