// Service for WhatsApp Business onboarding
import { SubaccountService } from './SubaccountService';
import { TemplateDao } from '../dao/TemplateDao';
import { ISVCustomerDao } from '../dao/ISVCustomerDao';
import { Template } from '../types';

export class WhatsAppOnboardingService {
  private subaccountService = new SubaccountService();
  private templateDao = new TemplateDao();
  private customerDao = new ISVCustomerDao();

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

    const twilioClient = await this.subaccountService.getCustomerTwilioClient(customerId);

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
      // Submit template via Twilio Content API
      // Note: Actual API may vary
      const template = await twilioClient.content.v1.contents.create({
        friendlyName: templateData.name,
        language: templateData.language || 'en',
        types: {
          'twilio/text': {
            body: templateData.body,
          },
        },
      });

      // Store in database
      const dbTemplate = await this.templateDao.create({
        customer_id: customerId,
        template_name: templateData.name,
        body: templateData.body,
        category: templateData.category,
        language: templateData.language || 'en',
        twilio_template_id: template.sid,
        status: 'pending',
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
      // Fetch latest status from Twilio
      const twilioTemplate = await twilioClient.content.v1.contents(template.twilio_template_id).fetch();
      
      // Update database with latest status
      const status = twilioTemplate.approvalRequests?.[0]?.status || 'pending';
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

