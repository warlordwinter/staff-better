// Base class for message action handlers

import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "../interfaces/IncomingMessageResult";

export abstract class MessageActionHandler {
  /**
   * Handle the specific message action
   */
  abstract handle(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult>;
}
