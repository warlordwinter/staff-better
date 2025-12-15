// Interface for WhatsApp template service

export interface IWhatsAppTemplateService {
  /**
   * Submit a WhatsApp message template for approval
   */
  submitTemplate(
    twilioClient: any,
    templateData: {
      name: string;
      body: string;
      language?: string;
    }
  ): Promise<{ sid: string; status: string }>;

  /**
   * Get template approval status from Twilio
   */
  getTemplateStatus(
    twilioClient: any,
    templateSid: string
  ): Promise<{ status: string }>;
}
