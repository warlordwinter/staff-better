// Handler for help request messages

import { IMessageHandler } from "./IMessageHandler";
import { IMessageService } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";

export class HelpHandler implements IMessageHandler {
  constructor(
    private readonly messageService: IMessageService,
    private readonly logger: any
  ) {}

  canHandle(action: MessageAction): boolean {
    return action === MessageAction.HELP_REQUEST;
  }

  async handle(
    associate: Associate,
    message: string,
    phoneNumber: string
  ): Promise<IncomingMessageResult> {
    const helpMessage =
      `Hi ${associate.first_name}!\n\nHere's how to use our text system:\n\n` +
      `• Reply "C" or "Confirm" to confirm your assignment\n` +
      `• Reply "HELP" for this message\n` +
      `• Reply "STOP" to stop receiving texts\n\n` +
      `Questions? Call us at [YOUR_PHONE_NUMBER]`;

    await this.messageService.sendSMS({
      to: phoneNumber,
      body: helpMessage,
    });

    return {
      success: true,
      action: MessageAction.HELP_REQUEST,
      associate_id: associate.id,
      phone_number: phoneNumber,
      message: message,
      response_sent: helpMessage,
    };
  }
}
