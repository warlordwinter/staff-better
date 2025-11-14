// Service for A2P 10DLC Brand and Campaign registration
import { getSubaccountClient } from '../twilio/master-client';
import { SubaccountService } from './SubaccountService';
import { BrandDao } from '../dao/BrandDao';
import { CampaignDao } from '../dao/CampaignDao';
import { ISVCustomerDao } from '../dao/ISVCustomerDao';
import { Brand, Campaign } from '../types';

export class A2PRegistrationService {
  private subaccountService = new SubaccountService();
  private brandDao = new BrandDao();
  private campaignDao = new CampaignDao();
  private customerDao = new ISVCustomerDao();

  /**
   * Create TrustHub Customer Profile
   * Note: This is a placeholder - actual TrustHub API endpoints may vary
   */
  async createCustomerProfile(customerId: string) {
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

    // Note: TrustHub API endpoints are not publicly documented
    // This is a placeholder implementation
    // You'll need to use Twilio's TrustHub API or contact Twilio support
    try {
      // Example structure - actual API may differ
      // const customerProfile = await twilioClient.trusthub.v1.customerProfiles.create({
      //   friendlyName: customer.legal_name,
      //   email: customer.contact_email,
      //   // ... other required fields
      // });
      
      // For now, return a placeholder
      console.warn('TrustHub Customer Profile creation not yet implemented');
      return { sid: 'placeholder', status: 'pending' };
    } catch (error) {
      console.error('Error creating TrustHub Customer Profile:', error);
      throw error;
    }
  }

  /**
   * Register A2P Brand
   */
  async registerBrand(
    customerId: string,
    brandData: {
      brandName: string;
      brandType?: string;
      vertical?: string;
    }
  ): Promise<Brand> {
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

    try {
      // Register brand via Twilio Messaging API
      // Note: Actual API endpoint may be different
      const brand = await twilioClient.messaging.v1.brands.create({
        brandName: brandData.brandName,
        brandType: brandData.brandType || 'STANDARD',
        vertical: brandData.vertical || 'STAFFING',
      });

      // Store in database
      const dbBrand = await this.brandDao.create({
        customer_id: customerId,
        twilio_brand_sid: brand.sid,
        brand_name: brandData.brandName,
        brand_type: brandData.brandType,
        status: brand.status || 'pending',
      });

      return dbBrand;
    } catch (error) {
      console.error('Error registering brand:', error);
      throw error;
    }
  }

  /**
   * Register A2P Campaign
   */
  async registerCampaign(
    customerId: string,
    brandId: string,
    campaignData: {
      useCase: string;
      sampleMessage: string;
      estimatedVolume?: number;
    }
  ): Promise<Campaign> {
    const brand = await this.brandDao.findById(brandId);
    if (!brand || brand.customer_id !== customerId) {
      throw new Error('Brand not found or does not belong to customer');
    }

    if (!brand.twilio_brand_sid) {
      throw new Error('Brand not yet registered with Twilio');
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

    try {
      // Register campaign via Twilio Messaging API
      const campaign = await twilioClient.messaging.v1.campaigns.create({
        brandSid: brand.twilio_brand_sid,
        useCase: campaignData.useCase,
        sampleMessage: campaignData.sampleMessage,
        estimatedVolume: campaignData.estimatedVolume || 1000,
      });

      // Create Messaging Service for this campaign
      const messagingService = await twilioClient.messaging.v1.services.create({
        friendlyName: `Messaging Service for ${campaignData.useCase}`,
      });

      // Store in database
      const dbCampaign = await this.campaignDao.create({
        customer_id: customerId,
        brand_id: brandId,
        campaign_sid: campaign.sid,
        use_case: campaignData.useCase,
        sample_message: campaignData.sampleMessage,
        estimated_volume: campaignData.estimatedVolume,
        messaging_service_sid: messagingService.sid,
        status: campaign.status || 'pending',
      });

      return dbCampaign;
    } catch (error) {
      console.error('Error registering campaign:', error);
      throw error;
    }
  }

  /**
   * Check brand registration status
   */
  async getBrandStatus(brandId: string): Promise<Brand> {
    const brand = await this.brandDao.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    if (!brand.twilio_brand_sid) {
      return brand;
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(brand.customer_id);

    try {
      // Fetch latest status from Twilio
      const twilioBrand = await twilioClient.messaging.v1.brands(brand.twilio_brand_sid).fetch();
      
      // Update database with latest status
      const updated = await this.brandDao.update(brandId, {
        status: twilioBrand.status as Brand['status'],
      });

      return updated;
    } catch (error) {
      console.error('Error fetching brand status:', error);
      return brand; // Return cached status if API call fails
    }
  }

  /**
   * Check campaign registration status
   */
  async getCampaignStatus(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignDao.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!campaign.campaign_sid) {
      return campaign;
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(campaign.customer_id);

    try {
      // Fetch latest status from Twilio
      const twilioCampaign = await twilioClient.messaging.v1.campaigns(campaign.campaign_sid).fetch();
      
      // Update database with latest status
      const updated = await this.campaignDao.update(campaignId, {
        status: twilioCampaign.status as Campaign['status'],
      });

      return updated;
    } catch (error) {
      console.error('Error fetching campaign status:', error);
      return campaign; // Return cached status if API call fails
    }
  }
}

