// Twilio phone number service implementation
import {
  IPhoneNumberService,
  AvailablePhoneNumber,
  PurchasedPhoneNumber,
} from "./IPhoneNumberService";

export class TwilioPhoneNumberService implements IPhoneNumberService {
  /**
   * Search for available phone numbers
   */
  async searchAvailableNumbers(
    twilioClient: any,
    params: {
      countryCode?: string;
      areaCode?: string;
      smsEnabled?: boolean;
      voiceEnabled?: boolean;
    }
  ): Promise<AvailablePhoneNumber[]> {
    try {
      const searchParams: any = {
        smsEnabled: params.smsEnabled ?? true,
        voiceEnabled: params.voiceEnabled ?? false,
      };

      if (params.areaCode) {
        searchParams.areaCode = params.areaCode;
      }

      const availableNumbers = await twilioClient.availablePhoneNumbers(
        params.countryCode || "US"
      ).local.list(searchParams);

      return availableNumbers.map((number: any) => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        isoCountry: number.isoCountry,
        region: number.region,
        capabilities: {
          sms: number.capabilities?.SMS || false,
          voice: number.capabilities?.voice || false,
          mms: number.capabilities?.MMS || false,
        },
      }));
    } catch (error) {
      console.error("Error searching available numbers:", error);
      throw error;
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(
    twilioClient: any,
    phoneNumber: string,
    smsUrl: string
  ): Promise<PurchasedPhoneNumber> {
    try {
      const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        smsUrl,
      });

      return {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
        friendlyName: purchasedNumber.friendlyName,
      };
    } catch (error) {
      console.error("Error purchasing number:", error);
      throw error;
    }
  }

  /**
   * Associate a phone number with a messaging service
   */
  async associateWithMessagingService(
    twilioClient: any,
    phoneNumberSid: string,
    messagingServiceSid: string
  ): Promise<void> {
    try {
      await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
        smsApplicationSid: messagingServiceSid,
      });
    } catch (error) {
      console.error("Error associating number with messaging service:", error);
      throw error;
    }
  }

  /**
   * Enable WhatsApp for a phone number
   */
  async enableWhatsAppForNumber(
    twilioClient: any,
    phoneNumberSid: string,
    messagingServiceSid: string
  ): Promise<void> {
    try {
      // Enable WhatsApp via Twilio API
      // Note: Actual API may vary - this is a placeholder implementation
      await twilioClient.messaging.v1
        .services(messagingServiceSid)
        .phoneNumbers.create({
          phoneNumberSid: phoneNumberSid,
        });
    } catch (error) {
      console.error("Error enabling WhatsApp for number:", error);
      throw error;
    }
  }
}

