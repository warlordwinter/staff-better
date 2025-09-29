// Handles unknown/unrecognized message actions

import { MessageActionHandler } from "./MessageActionHandler";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "../interfaces/IncomingMessageResult";
import { MessageAction } from "../interfaces/MessageAction";
import { SMSService } from "../shared/SMSService";
import { MessageGeneratorService } from "../shared/MessageGeneratorService";

export class UnknownMessageHandler extends MessageActionHandler {
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
    const unknownMessage = this.messageGenerator.generateUnknownMessageResponse(
      associate.first_name
    );

    await this.smsService.sendMessage(phoneNumber, unknownMessage);

    return {
      success: true,
      action: MessageAction.UNKNOWN,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: originalMessage,
      response_sent: unknownMessage,
    };
  }
}
