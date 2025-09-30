// Strategy pattern for handling different message types

import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";

export interface IMessageHandler {
  canHandle(action: MessageAction): boolean;
  handle(
    associate: Associate,
    message: string,
    phoneNumber: string
  ): Promise<IncomingMessageResult>;
}
