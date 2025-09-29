// Handles opt-out message actions

import { MessageActionHandler } from "./MessageActionHandler";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "../interfaces/IncomingMessageResult";
import { MessageAction } from "../interfaces/MessageAction";
import { SMSService } from "../shared/SMSService";
import { MessageGeneratorService } from "../shared/MessageGeneratorService";
import { AssociateDaoSupabase } from "../../dao/implementations/supabase/AssociatesDaoSupabase";

export class OptOutHandler extends MessageActionHandler {
  private smsService: SMSService;
  private messageGenerator: MessageGeneratorService;
  private associatesDao: AssociateDaoSupabase;

  constructor(
    smsService: SMSService,
    messageGenerator: MessageGeneratorService,
    associatesDao: AssociateDaoSupabase
  ) {
    super();
    this.smsService = smsService;
    this.messageGenerator = messageGenerator;
    this.associatesDao = associatesDao;
  }

  async handle(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    try {
      // Update associate to opt them out of SMS
      await this.associatesDao.optOutAssociate(associate.id);

      const optOutMessage = this.messageGenerator.generateOptOutMessage(
        associate.first_name
      );
      await this.smsService.sendMessage(phoneNumber, optOutMessage);

      return {
        success: true,
        action: MessageAction.OPT_OUT,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: originalMessage,
        response_sent: optOutMessage,
      };
    } catch (error) {
      console.error("Error handling opt-out:", error);
      throw error;
    }
  }
}
