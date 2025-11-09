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
      `Hi ${associate.first_name}!\n\n` +
      `Here’s what you can do right from this text thread:\n\n` +
      `• Reply "C" (or "Confirm") to confirm your next assignment\n` +
      `• Reply "HELP" anytime to see this info again\n` +
      `• Reply "STOP" to opt out of future texts\n\n` +
      `Need a person right now? Call or text us at 801-361-0540 and we’ll get you connected.`;

    await this.messageService.sendReminderSMS({
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
