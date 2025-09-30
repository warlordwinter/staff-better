// Handler for opt-out messages

import { IMessageHandler } from "./IMessageHandler";
import { IAssociateRepository, IMessageService } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";

export class OptOutHandler implements IMessageHandler {
  constructor(
    private readonly associateRepository: IAssociateRepository,
    private readonly messageService: IMessageService,
    private readonly logger: any
  ) {}

  canHandle(action: MessageAction): boolean {
    return action === MessageAction.OPT_OUT;
  }

  async handle(
    associate: Associate,
    message: string,
    phoneNumber: string
  ): Promise<IncomingMessageResult> {
    try {
      // Update associate to opt them out of SMS
      await this.associateRepository.optOutAssociate(associate.id);

      const optOutMessage =
        `${associate.first_name}, you have been unsubscribed from our text reminders. ` +
        `You can still receive calls about your assignments. To re-subscribe, please call us.`;

      await this.messageService.sendSMS({
        to: phoneNumber,
        body: optOutMessage,
      });

      return {
        success: true,
        action: MessageAction.OPT_OUT,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: message,
        response_sent: optOutMessage,
      };
    } catch (error) {
      this.logger.error("Error handling opt-out:", error);
      throw error;
    }
  }
}
