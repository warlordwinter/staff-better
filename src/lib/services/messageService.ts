// Message service for handling all message sending business logic

import { IMessageService } from "./interfaces/IMessageService";
import { IAssociates } from "../dao/interfaces/IAssociates";
import { IGroups } from "../dao/interfaces/IGroups";
import { IConversations } from "../dao/interfaces/IConversations";
import { IMessages } from "../dao/interfaces/IMessages";
import { SMSResult, WhatsAppResult, WhatsAppTemplateMessage } from "../twilio/types";
import { sendSMSOptOutIfNeeded } from "../utils/optOutUtils";

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

export interface SendGroupMessageResult {
  success: boolean;
  total_members: number;
  eligible_members: number;
  messages_sent: number;
  messages_failed: number;
  errors?: Array<{
    member_id: string;
    phone: string;
    error: string;
  }>;
  unsubscribed_members: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export class MessageService {
  constructor(
    private readonly messageService: IMessageService,
    private readonly associatesDao: IAssociates,
    private readonly groupsDao: IGroups,
    private readonly conversationsDao: IConversations,
    private readonly messagesDao: IMessages
  ) {}

  /**
   * Send a message to a single associate
   */
  async sendMessageToAssociate(
    associateId: string,
    message: string,
    channel: "sms" | "whatsapp",
    companyId: string,
    senderNumber: string,
    twoWayPhoneNumber?: string,
    isWhatsAppTemplate?: boolean,
    templateData?: {
      contentSid: string;
      contentVariables?: Record<string, string>;
    }
  ): Promise<SendMessageResult> {
    // Get associate details
    const associate = await this.associatesDao.getAssociateById(associateId);

    if (!associate) {
      return {
        success: false,
        error: "Associate not found",
      };
    }

    if (!associate.phone_number) {
      return {
        success: false,
        error: "Associate does not have a phone number",
      };
    }

    // Format phone number
    const formattedPhone = this.messageService.formatPhoneNumber(
      associate.phone_number
    );

    // Send message
    let result: SMSResult | WhatsAppResult;

    if (channel === "whatsapp") {
      if (isWhatsAppTemplate && templateData) {
        result = await this.messageService.sendWhatsAppBusinessTemplate(
          {
            to: formattedPhone,
            contentSid: templateData.contentSid,
            contentVariables: templateData.contentVariables,
          },
          senderNumber
        );
      } else {
        result = await this.messageService.sendWhatsAppBusiness(
          {
            to: formattedPhone,
            body: message.trim(),
          },
          senderNumber
        );
      }
    } else {
      result = await this.messageService.sendSMS({
        to: formattedPhone,
        body: message.trim(),
        from: senderNumber,
      });
    }

    if (!result.success) {
      const errorCode = "code" in result ? result.code : null;
      const errorMessage = "error" in result ? result.error : "Unknown error";

      return {
        success: false,
        error: errorMessage,
        code: errorCode || undefined,
      };
    }

    // Send opt-out message if needed (only for SMS)
    if (channel === "sms" && twoWayPhoneNumber && result.success) {
      try {
        await sendSMSOptOutIfNeeded(
          associateId,
          associate.phone_number,
          companyId,
          twoWayPhoneNumber
        );
      } catch (optOutError) {
        console.error(
          `Failed to send opt-out message for direct message to associate ${associateId}:`,
          optOutError
        );
        // Don't fail the whole operation
      }
    }

    // Find or create conversation and save message
    try {
      const conversationId = await this.conversationsDao.findOrCreateConversation(
        associateId,
        companyId
      );

      const messageBody = isWhatsAppTemplate && templateData
        ? `[Template: ${templateData.contentSid}]`
        : message.trim();

      await this.messagesDao.createMessage({
        conversation_id: conversationId,
        sender_type: "company",
        body: messageBody,
        direction: "outbound",
        status: result.success && "messageId" in result ? "queued" : null,
        twilio_sid: result.success && "messageId" in result ? result.messageId : null,
        sent_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
      // Don't fail the whole operation - message was sent successfully
    }

    return {
      success: true,
      messageId: result.success && "messageId" in result ? result.messageId : undefined,
    };
  }

  /**
   * Send a message to all members of a group
   */
  async sendMessageToGroup(
    groupId: string,
    message: string,
    channel: "sms" | "whatsapp",
    companyId: string,
    senderNumber: string,
    twoWayPhoneNumber?: string,
    isWhatsAppTemplate?: boolean,
    templateData?: {
      contentSid: string;
      contentVariables?: Record<string, string>;
    }
  ): Promise<SendGroupMessageResult> {
    // Verify the group belongs to the company
    const group = await this.groupsDao.getGroupById(groupId, companyId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Get all group members
    const members = await this.groupsDao.getGroupMembers(groupId, companyId);

    if (members.length === 0) {
      throw new Error("No members in this group");
    }

    // Filter out members who have opted out of SMS or missing phone numbers
    const eligibleMembers = members.filter(
      (member) => !member.sms_opt_out && member.phone_number
    );

    const unsubscribedMembers = members.filter(
      (member) => member.sms_opt_out || !member.phone_number
    );

    if (eligibleMembers.length === 0) {
      return {
        success: false,
        total_members: members.length,
        eligible_members: 0,
        messages_sent: 0,
        messages_failed: 0,
        unsubscribed_members: unsubscribedMembers.map((m) => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
        })),
      };
    }

    // Send messages to each eligible member
    const results: Array<{ member_id: string; phone: string; success: boolean }> = [];
    const errors: Array<{ member_id: string; phone: string; error: string }> = [];
    const twilioUnsubscribedMembers: Array<{
      id: string;
      first_name: string;
      last_name: string;
    }> = [];

    for (const member of eligibleMembers) {
      try {
        const formattedPhone = this.messageService.formatPhoneNumber(
          member.phone_number
        );
        let result: SMSResult | WhatsAppResult;

        if (channel === "whatsapp") {
          if (isWhatsAppTemplate && templateData) {
            result = await this.messageService.sendWhatsAppBusinessTemplate(
              {
                to: formattedPhone,
                contentSid: templateData.contentSid,
                contentVariables: templateData.contentVariables,
              },
              senderNumber
            );
          } else {
            result = await this.messageService.sendWhatsAppBusiness(
              {
                to: formattedPhone,
                body: message.trim(),
              },
              senderNumber
            );
          }
        } else {
          // For SMS group senderNumber is the two-way phone number
          result = await this.messageService.sendTwoWaySMS(
            {
              to: formattedPhone,
              body: message.trim(),
            },
            senderNumber
          );
        }

        results.push({
          member_id: member.id,
          phone: member.phone_number,
          success: result.success,
        });

        if (!result.success) {
          const errorCode = "code" in result ? result.code : null;
          if (errorCode === "21610") {
            twilioUnsubscribedMembers.push({
              id: member.id,
              first_name: member.first_name,
              last_name: member.last_name,
            });
          }

          errors.push({
            member_id: member.id,
            phone: member.phone_number,
            error: "error" in result ? result.error : "Unknown error",
          });
        } else {
          // Send opt-out message if needed (only for SMS)
          if (channel === "sms" && twoWayPhoneNumber) {
            try {
              await sendSMSOptOutIfNeeded(
                member.id,
                member.phone_number,
                companyId,
                twoWayPhoneNumber
              );
            } catch (optOutError) {
              console.error(
                `Failed to send opt-out message for group message to member ${member.id}:`,
                optOutError
              );
            }
          }

          // Save message to database
          try {
            const conversationId =
              await this.conversationsDao.findOrCreateConversation(
                member.id,
                companyId
              );

            const messageBody = isWhatsAppTemplate && templateData
              ? `[Template: ${templateData.contentSid}]`
              : message.trim();

            await this.messagesDao.createMessage({
              conversation_id: conversationId,
              sender_type: "company",
              body: messageBody,
              direction: "outbound",
              status: result.success && "messageId" in result ? "queued" : null,
              twilio_sid: result.success && "messageId" in result ? result.messageId : null,
              sent_at: new Date().toISOString(),
            });
          } catch (dbError) {
            console.error(
              `Error saving message to database for associate ${member.id}:`,
              dbError
            );
          }
        }

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending message to ${member.phone_number}:`, error);
        errors.push({
          member_id: member.id,
          phone: member.phone_number,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Combine database unsubscribed members with Twilio unsubscribed members
    const unsubscribedMap = new Map<
      string,
      { id: string; first_name: string; last_name: string }
    >();

    unsubscribedMembers.forEach((m) => {
      unsubscribedMap.set(m.id, {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
      });
    });

    twilioUnsubscribedMembers.forEach((m) => {
      unsubscribedMap.set(m.id, {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
      });
    });

    const allUnsubscribedMembers = Array.from(unsubscribedMap.values());

    return {
      success: true,
      total_members: members.length,
      eligible_members: eligibleMembers.length,
      messages_sent: successCount,
      messages_failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      unsubscribed_members: allUnsubscribedMembers,
    };
  }

  /**
   * Send a direct message (to a phone number with existing conversation)
   */
  async sendDirectMessage(
    to: string,
    message: string,
    conversationId: string,
    channel: "sms" | "whatsapp",
    companyId: string,
    senderNumber: string,
    isWhatsAppTemplate?: boolean,
    templateData?: {
      contentSid: string;
      contentVariables?: Record<string, string>;
    }
  ): Promise<SendMessageResult> {
    // Format phone number
    const formattedPhone = this.messageService.formatPhoneNumber(to);

    // Send message
    let result: SMSResult | WhatsAppResult;

    if (channel === "whatsapp") {
      if (isWhatsAppTemplate && templateData) {
        result = await this.messageService.sendWhatsAppBusinessTemplate(
          {
            to: formattedPhone,
            contentSid: templateData.contentSid,
            contentVariables: templateData.contentVariables,
          },
          senderNumber
        );
      } else {
        result = await this.messageService.sendWhatsAppBusiness(
          {
            to: formattedPhone,
            body: message.trim(),
          },
          senderNumber
        );
      }
    } else {
      result = await this.messageService.sendSMS({
        to: formattedPhone,
        body: message.trim(),
        from: senderNumber,
      });
    }

    if (!result.success) {
      const errorCode = "code" in result ? result.code : null;
      const errorMessage = "error" in result ? result.error : "Unknown error";

      return {
        success: false,
        error: errorMessage,
        code: errorCode || undefined,
      };
    }

    // Save to database
    try {
      const messageBody = isWhatsAppTemplate && templateData
        ? `[Template: ${templateData.contentSid}]`
        : message.trim();

      await this.messagesDao.createMessage({
        conversation_id: conversationId,
        sender_type: "company",
        body: messageBody,
        direction: "outbound",
        status: result.success && "messageId" in result ? "queued" : null,
        twilio_sid: result.success && "messageId" in result ? result.messageId : null,
        sent_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
      // Continue - message was sent successfully
    }

    return {
      success: true,
      messageId: result.success && "messageId" in result ? result.messageId : undefined,
    };
  }
}

