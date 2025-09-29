// Handles help request message actions

import { MessageActionHandler } from "./MessageActionHandler";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "../interfaces/IncomingMessageResult";
import { MessageAction } from "../interfaces/MessageAction";
import { SMSService } from "../shared/SMSService";
import { MessageGeneratorService } from "../shared/MessageGeneratorService";

export class HelpRequestHandler extends MessageActionHandler {
  private smsService: SMSService;
  private messageGenerator: MessageGeneratorService;

  constructor(
    smsService: SMSService,
    messageGenerator: MessageGeneratorService
  ) {
    super();
    this.smsService = smsService;
    this.messageGenerator = messageGenerator;
  }

  async handle(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    const helpMessage = this.messageGenerator.generateHelpMessage(
      associate.first_name
    );

    await this.smsService.sendMessage(phoneNumber, helpMessage);

    return {
      success: true,
      action: MessageAction.HELP_REQUEST,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: originalMessage,
      response_sent: helpMessage,
    };
  }
}
