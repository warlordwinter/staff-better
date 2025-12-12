// Twilio WhatsApp template service implementation
import { IWhatsAppTemplateService } from "./IWhatsAppTemplateService";

export class TwilioWhatsAppTemplateService implements IWhatsAppTemplateService {
  /**
   * Submit a WhatsApp message template for approval via Twilio Content API
   */
  async submitTemplate(
    twilioClient: any,
    templateData: {
      name: string;
      body: string;
      language?: string;
    }
  ): Promise<{ sid: string; status: string }> {
    try {
      // Submit template via Twilio Content API
      const template = await twilioClient.content.v1.contents.create({
        friendlyName: templateData.name,
        language: templateData.language || "en",
        types: {
          "twilio/text": {
            body: templateData.body,
          },
        },
      });

      return {
        sid: template.sid,
        status: template.approvalRequests?.[0]?.status || "pending",
      };
    } catch (error) {
      console.error("Error submitting template to Twilio:", error);
      throw error;
    }
  }

  /**
   * Get template approval status from Twilio
   */
  async getTemplateStatus(
    twilioClient: any,
    templateSid: string
  ): Promise<{ status: string }> {
    try {
      // Fetch latest status from Twilio
      const twilioTemplate = await twilioClient.content.v1
        .contents(templateSid)
        .fetch();

      const status = twilioTemplate.approvalRequests?.[0]?.status || "pending";

      return { status };
    } catch (error) {
      console.error("Error fetching template status from Twilio:", error);
      throw error;
    }
  }
}

