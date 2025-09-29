// Handles confirmation message actions

import { MessageActionHandler } from "./MessageActionHandler";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult } from "../interfaces/IncomingMessageResult";
import { MessageAction } from "../interfaces/MessageAction";
import { AssignmentService } from "../shared/AssignmentService";
import { SMSService } from "../shared/SMSService";
import { MessageGeneratorService } from "../shared/MessageGeneratorService";

export class ConfirmationHandler extends MessageActionHandler {
  private assignmentService: AssignmentService;
  private smsService: SMSService;
  private messageGenerator: MessageGeneratorService;

  constructor(
    assignmentService: AssignmentService,
    smsService: SMSService,
    messageGenerator: MessageGeneratorService
  ) {
    super();
    this.assignmentService = assignmentService;
    this.smsService = smsService;
    this.messageGenerator = messageGenerator;
  }

  async handle(
    associate: Associate,
    phoneNumber: string,
    originalMessage: string
  ): Promise<IncomingMessageResult> {
    try {
      // Get the associate's active/upcoming assignments
      const activeAssignments =
        await this.assignmentService.getActiveAssignments(associate.id);

      if (activeAssignments.length === 0) {
        // No active assignments to confirm
        const response = this.messageGenerator.generateNoAssignmentsMessage(
          associate.first_name
        );
        await this.smsService.sendMessage(phoneNumber, response);

        return {
          success: true,
          action: MessageAction.CONFIRMATION,
          associate_id: associate.id,
          phone_number: phoneNumber,
          message: originalMessage,
          response_sent: response,
        };
      }

      // Update confirmation status for all active assignments
      const updatedCount =
        await this.assignmentService.updateMultipleAssignments(
          activeAssignments,
          this.assignmentService.determineConfirmationStatus(
            activeAssignments[0]
          )
        );

      // Send confirmation response
      const response = this.messageGenerator.generateConfirmationResponse(
        associate.first_name,
        updatedCount
      );

      await this.smsService.sendMessage(phoneNumber, response);

      return {
        success: true,
        action: MessageAction.CONFIRMATION,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: originalMessage,
        response_sent: response,
      };
    } catch (error) {
      console.error("Error handling confirmation:", error);
      throw error;
    }
  }
}
