// Handles different notification types
import { sendSMS } from "../twilio/sms";
import { SMSMessage, SMSResult } from "../twilio/types";

export class NotificationService {

    static async sendSMSNotification(phoneNumber: string, messageBody: string): Promise<SMSResult> {
        const smsMessage: SMSMessage = {
            to: phoneNumber,
            body: messageBody,
        };

        try {
            const smsResult: SMSResult = await sendSMS(smsMessage);
            return smsResult;
        } catch (error) {
            console.error("Error sending SMS:", error);
            throw new Error("Failed to send SMS.");
        }
    }
}