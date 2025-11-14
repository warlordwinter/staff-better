// Service for provisioning phone numbers
import { SubaccountService } from './SubaccountService';
import { ISVNumberDao } from '../dao/ISVNumberDao';
import { CampaignDao } from '../dao/CampaignDao';
import { ISVNumber } from '../types';

export class NumberProvisioningService {
  private subaccountService = new SubaccountService();
  private numberDao = new ISVNumberDao();
  private campaignDao = new CampaignDao();

  /**
   * Purchase and provision a phone number
   */
  async provisionNumber(
    customerId: string,
    options: {
      countryCode?: string;
      areaCode?: string;
      campaignId?: string;
    }
  ): Promise<ISVNumber> {
    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

    try {
      // Search for available numbers
      const searchParams: any = {
        smsEnabled: true,
        voiceEnabled: false, // For SMS/WhatsApp only
      };

      if (options.countryCode) {
        searchParams.countryCode = options.countryCode;
      }

      if (options.areaCode) {
        searchParams.areaCode = options.areaCode;
      }

      const availableNumbers = await twilioClient.availablePhoneNumbers(searchParams.countryCode || 'US')
        .local.list(searchParams);

      if (availableNumbers.length === 0) {
        throw new Error('No available phone numbers found');
      }

      // Purchase the first available number
      const phoneNumber = availableNumbers[0].phoneNumber;
      const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        smsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/isv/webhooks/twilio/inbound`,
      });

      // Get messaging service if campaign is provided
      let messagingServiceSid: string | undefined;
      if (options.campaignId) {
        const campaign = await this.campaignDao.findById(options.campaignId);
        if (campaign?.messaging_service_sid) {
          messagingServiceSid = campaign.messaging_service_sid;
          
          // Associate number with messaging service
          await twilioClient.incomingPhoneNumbers(purchasedNumber.sid)
            .update({
              smsApplicationSid: messagingServiceSid,
            });
        }
      }

      // Store in database
      const dbNumber = await this.numberDao.create({
        customer_id: customerId,
        twilio_number_sid: purchasedNumber.sid,
        phone_number: phoneNumber,
        messaging_service_sid: messagingServiceSid,
        country_code: options.countryCode || 'US',
        provisioned_for_whatsapp: false,
      });

      return dbNumber;
    } catch (error) {
      console.error('Error provisioning number:', error);
      throw error;
    }
  }

  /**
   * Enable WhatsApp for a number
   */
  async enableWhatsApp(numberId: string): Promise<ISVNumber> {
    const number = await this.numberDao.findById(numberId);
    if (!number) {
      throw new Error('Number not found');
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(number.customer_id);

    try {
      // Enable WhatsApp via Twilio API
      // Note: Actual API may vary
      const whatsappNumber = await twilioClient.messaging.v1.services(number.messaging_service_sid || '')
        .phoneNumbers.create({
          phoneNumberSid: number.twilio_number_sid,
        });

      // Update database
      const updated = await this.numberDao.update(numberId, {
        provisioned_for_whatsapp: true,
        whatsapp_status: 'pending',
      });

      return updated;
    } catch (error) {
      console.error('Error enabling WhatsApp:', error);
      throw error;
    }
  }

  /**
   * List all numbers for a customer
   */
  async listCustomerNumbers(customerId: string): Promise<ISVNumber[]> {
    return await this.numberDao.findByCustomerId(customerId);
  }
}

