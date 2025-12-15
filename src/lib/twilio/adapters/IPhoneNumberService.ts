// Interface for phone number provisioning service

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  isoCountry: string;
  region: string;
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
  };
}

export interface PurchasedPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
}

export interface IPhoneNumberService {
  /**
   * Search for available phone numbers
   */
  searchAvailableNumbers(
    twilioClient: any,
    params: {
      countryCode?: string;
      areaCode?: string;
      smsEnabled?: boolean;
      voiceEnabled?: boolean;
    }
  ): Promise<AvailablePhoneNumber[]>;

  /**
   * Purchase a phone number
   */
  purchaseNumber(
    twilioClient: any,
    phoneNumber: string,
    smsUrl: string
  ): Promise<PurchasedPhoneNumber>;

  /**
   * Associate a phone number with a messaging service
   */
  associateWithMessagingService(
    twilioClient: any,
    phoneNumberSid: string,
    messagingServiceSid: string
  ): Promise<void>;

  /**
   * Enable WhatsApp for a phone number
   */
  enableWhatsAppForNumber(
    twilioClient: any,
    phoneNumberSid: string,
    messagingServiceSid: string
  ): Promise<void>;
}

