// Handler for opt-out messages

import { IMessageHandler } from "./IMessageHandler";
import { IAssociateRepository, IMessageService } from "../interfaces/index";
import { Associate } from "@/model/interfaces/Associate";
import { IncomingMessageResult, MessageAction } from "../types";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";
import { createAdminClient } from "@/lib/supabase/admin";

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
    phoneNumber: string,
    toNumber?: string,
    companyId?: string
  ): Promise<IncomingMessageResult> {
    try {
      // Update associate to opt them out of SMS
      await this.associateRepository.optOutAssociate(associate.id);

      // Update opt_info table based on which number received the STOP message
      const supabaseAdmin = createAdminClient();
      const currentTimestamp = new Date().toISOString();

      // Check if opt_info record exists
      const { data: existingOptInfo } = await supabaseAdmin
        .from("opt_info")
        .select("associate_id")
        .eq("associate_id", associate.id)
        .single();

      if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
        // STOP received on reminder number - update reminder_opt_out_time
        if (existingOptInfo) {
          const { error: updateError } = await supabaseAdmin
            .from("opt_info")
            .update({
              reminder_opt_out_time: currentTimestamp,
            })
            .eq("associate_id", associate.id);

          if (updateError) {
            this.logger.error(
              `Failed to update opt_info.reminder_opt_out_time for associate ${associate.id}:`,
              updateError
            );
          }
        } else {
          // Create new record if it doesn't exist
          const { error: insertError } = await supabaseAdmin
            .from("opt_info")
            .insert({
              associate_id: associate.id,
              reminder_opt_out_time: currentTimestamp,
            });

          if (insertError) {
            this.logger.error(
              `Failed to create opt_info with reminder_opt_out_time for associate ${associate.id}:`,
              insertError
            );
          }
        }
      } else {
        // STOP received on company number - update sms_opt_out_time
        if (existingOptInfo) {
          const { error: updateError } = await supabaseAdmin
            .from("opt_info")
            .update({
              sms_opt_out_time: currentTimestamp,
            })
            .eq("associate_id", associate.id);

          if (updateError) {
            this.logger.error(
              `Failed to update opt_info.sms_opt_out_time for associate ${associate.id}:`,
              updateError
            );
          }
        } else {
          // Create new record if it doesn't exist
          const { error: insertError } = await supabaseAdmin
            .from("opt_info")
            .insert({
              associate_id: associate.id,
              sms_opt_out_time: currentTimestamp,
            });

          if (insertError) {
            this.logger.error(
              `Failed to create opt_info with sms_opt_out_time for associate ${associate.id}:`,
              insertError
            );
          }
        }
      }

      const optOutMessage =
        `${associate.first_name}, you have been unsubscribed from our text reminders. ` +
        `You can still receive calls about your assignments. Reply START to re-subscribe anytime.`;

      // Determine which number to reply from
      // If message was sent to reminder number, reply from reminder number
      // Otherwise, reply from company's two-way number
      if (toNumber === TWILIO_PHONE_NUMBER_REMINDERS) {
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: optOutMessage,
        });
      } else if (companyId) {
        // Get company phone number and reply from it
        const companyPhoneNumber = await getCompanyPhoneNumberAdmin(companyId);
        if (companyPhoneNumber) {
          await this.messageService.sendTwoWaySMS(
            {
              to: phoneNumber,
              body: optOutMessage,
            },
            companyPhoneNumber
          );
        } else {
          // Fallback to reminder number if company number not found
          await this.messageService.sendReminderSMS({
            to: phoneNumber,
            body: optOutMessage,
          });
        }
      } else {
        // Fallback to reminder number if no company ID
        await this.messageService.sendReminderSMS({
          to: phoneNumber,
          body: optOutMessage,
        });
      }

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
