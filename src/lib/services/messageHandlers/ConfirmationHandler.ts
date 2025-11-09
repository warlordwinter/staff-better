// Handler for confirmation messages

import { IMessageHandler } from "./IMessageHandler";
import { IAssignmentRepository, IMessageService } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";

export class ConfirmationHandler implements IMessageHandler {
  constructor(
    private readonly assignmentRepository: IAssignmentRepository,
    private readonly messageService: IMessageService,
    private readonly logger: any
  ) {}

  canHandle(action: MessageAction): boolean {
    return action === MessageAction.CONFIRMATION;
  }

  async handle(
    associate: Associate,
    message: string,
    phoneNumber: string,
    toNumber?: string,
    companyId?: string
  ): Promise<IncomingMessageResult> {
    try {
      const activeAssignments =
        await this.assignmentRepository.getActiveAssignments(associate.id);

      if (activeAssignments.length === 0) {
        const response = `Hi ${associate.first_name}!\n\nWe don't have any upcoming assignments for you to confirm right now.\n\nIf you think this is an error, please call us.`;

        // Determine which number to reply from
        if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
          await this.messageService.sendReminderSMS({
            to: phoneNumber,
            body: response,
          });
        } else if (companyId) {
          const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);
          if (companyPhoneNumber) {
            await this.messageService.sendTwoWaySMS(
              { to: phoneNumber, body: response },
              companyPhoneNumber
            );
          } else {
            await this.messageService.sendReminderSMS({
              to: phoneNumber,
              body: response,
            });
          }
        } else {
          await this.messageService.sendReminderSMS({
            to: phoneNumber,
            body: response,
          });
        }

        return {
          success: true,
          action: MessageAction.CONFIRMATION,
          associate_id: associate.id,
          phone_number: phoneNumber,
          message: message,
          response_sent: response,
        };
      }

      // Update confirmation status for all active assignments
      let updatedCount = 0;
      for (const assignment of activeAssignments) {
        const newStatus = this.determineConfirmationStatus(assignment);
        await this.assignmentRepository.updateAssignmentStatus(
          assignment.job_id,
          assignment.associate_id,
          newStatus
        );
        updatedCount++;
      }

      // Send confirmation response
      const response =
        updatedCount === 1
          ? `Thanks ${associate.first_name}!\n\nYour assignment is confirmed.\n\nWe'll see you there!`
          : `Thanks ${associate.first_name}!\n\nYour ${updatedCount} assignments are confirmed.\n\nWe'll see you there!`;

      // Determine which number to reply from
      if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: response,
        });
      } else if (companyId) {
        const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);
        if (companyPhoneNumber) {
          await this.messageService.sendTwoWaySMS(
            { to: phoneNumber, body: response },
            companyPhoneNumber
          );
        } else {
          await this.messageService.sendReminderSMS({
            to: phoneNumber,
            body: response,
          });
        }
      } else {
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: response,
        });
      }

      return {
        success: true,
        action: MessageAction.CONFIRMATION,
        associate_id: associate.id,
        phone_number: phoneNumber,
        message: message,
        response_sent: response,
      };
    } catch (error) {
      this.logger.error("Error handling confirmation:", error);
      throw error;
    }
  }

  private determineConfirmationStatus(assignment: any): ConfirmationStatus {
    const now = new Date();
    const workDateTime = this.combineDateTime(
      assignment.work_date,
      assignment.start_time
    );
    const hoursDifference =
      (workDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference <= 6 && hoursDifference > 0) {
      return ConfirmationStatus.CONFIRMED;
    } else if (hoursDifference <= 24) {
      return ConfirmationStatus.LIKELY_CONFIRMED;
    } else {
      return ConfirmationStatus.SOFT_CONFIRMED;
    }
  }

  private combineDateTime(date: Date, timeString: string): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const [hours, minutes] = timeString.split(":").map(Number);
    return new Date(year, month, day, hours, minutes, 0, 0);
  }
}
