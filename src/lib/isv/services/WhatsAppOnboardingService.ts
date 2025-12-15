// Service for WhatsApp Business onboarding
import { SubaccountService } from './SubaccountService';
import { TemplateDao } from '../dao/TemplateDao';
import { ISVCustomerDao } from '../dao/ISVCustomerDao';
import { Template } from '../types';
import { IWhatsAppTemplateService } from '../../twilio/adapters/IWhatsAppTemplateService';

export class WhatsAppOnboardingService {
  constructor(
    private readonly templateService: IWhatsAppTemplateService,
    private readonly subaccountService: SubaccountService,
    private readonly templateDao: TemplateDao,
    private readonly customerDao: ISVCustomerDao
  ) {}

  /**
   * Initiate WhatsApp Business Account (WABA) linking
   * Note: This requires Meta Business Manager integration
   */
  async initiateWABALinking(
    customerId: string,
    metaBusinessManagerId: string
  ): Promise<{ status: string; nextSteps?: string }> {
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.subaccountService.getCustomerTwilioClient(customerId);

    try {
      // Initiate WABA linking via Twilio API
      // Note: Actual API endpoint may vary
      // This is a placeholder implementation
      console.warn('WABA linking not yet fully implemented');
      
      // Update customer with Meta Business Manager ID
      await this.customerDao.update(customerId, {
        meta_business_manager_id: metaBusinessManagerId,
      });

      return {
        status: 'pending',
        nextSteps: 'Complete Meta Business verification and link WABA',
      };
    } catch (error) {
      console.error('Error initiating WABA linking:', error);
      throw error;
    }
  }

  /**
   * Submit WhatsApp message template for approval
   */
  async submitTemplate(
    customerId: string,
    templateData: {
      name: string;
      body: string;
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
      language?: string;
    }
  ): Promise<Template> {
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

    try {
      // Submit template via adapter
      const template = await this.templateService.submitTemplate(twilioClient, {
        name: templateData.name,
        body: templateData.body,
        language: templateData.language || 'en',
      });

      // Store in database
      const dbTemplate = await this.templateDao.create({
        customer_id: customerId,
        template_name: templateData.name,
        body: templateData.body,
        category: templateData.category,
        language: templateData.language || 'en',
        twilio_template_id: template.sid,
        status: template.status as Template['status'],
      });

      return dbTemplate;
    } catch (error) {
      console.error('Error submitting template:', error);
      throw error;
    }
  }

  /**
   * Check template approval status
   */
  async getTemplateStatus(templateId: string): Promise<Template> {
    const template = await this.templateDao.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.twilio_template_id) {
      return template;
    }

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(template.customer_id);

    try {
      // Fetch latest status from Twilio via adapter
      const { status } = await this.templateService.getTemplateStatus(
        twilioClient,
        template.twilio_template_id!
      );
      
      // Update database with latest status
      const updated = await this.templateDao.update(templateId, {
        status: status as Template['status'],
      });

      return updated;
    } catch (error) {
      console.error('Error fetching template status:', error);
      return template; // Return cached status if API call fails
    }
  }

  /**
   * List all templates for a customer
   */
  async listCustomerTemplates(customerId: string): Promise<Template[]> {
    return await this.templateDao.findByCustomerId(customerId);
  }
}

