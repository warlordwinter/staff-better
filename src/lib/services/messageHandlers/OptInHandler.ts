// Handler for opt-in messages

import { IMessageHandler } from "./IMessageHandler";
import { IAssociateRepository, IMessageService } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";

export class OptInHandler implements IMessageHandler {
  constructor(
    private readonly associateRepository: IAssociateRepository,
    private readonly messageService: IMessageService,
    private readonly logger: any
  ) {}

  canHandle(action: MessageAction): boolean {
    return action === MessageAction.OPT_IN;
  }

  async handle(
    associate: Associate,
    message: string,
    phoneNumber: string,
    toNumber?: string,
    companyId?: string
  ): Promise<IncomingMessageResult> {
    try {
      // Update associate to opt them in to SMS
      await this.associateRepository.optInAssociate(associate.id);

      const optInMessage =
        `${associate.first_name}, you've been re-subscribed to text reminders. Reply STOP to opt out anytime.`;

      // Determine which number to reply from
      // If message was sent to reminder number, reply from reminder number
      // Otherwise, reply from company's two-way number
      if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: optInMessage,
        });
      } else if (companyId) {
        // Get company phone number and reply from it
        const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);
        if (companyPhoneNumber) {
          await this.messageService.sendTwoWaySMS(
            {
              to: phoneNumber,
              body: optInMessage,
            },
            companyPhoneNumber
          );
        } else {
          // Fallback to reminder number if company number not found
          await this.messageService.sendReminderSMS({
            to: phoneNumber,
            body: optInMessage,
          });
        }
      } else {
        // Fallback to reminder number if no company ID
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: optInMessage,
        });
      }

      return {
        success: true,
        action: MessageAction.OPT_IN,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: message,
        response_sent: optInMessage,
      };
    } catch (error) {
      this.logger.error("Error handling opt-in:", error);
      throw error;
    }
  }
}

