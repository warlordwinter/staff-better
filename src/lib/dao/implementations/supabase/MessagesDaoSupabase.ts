// Messages DAO implementation for Supabase
import { createAdminClient } from "../../../supabase/admin";
import { IMessages, Message, CreateMessageData } from "../../interfaces/IMessages";

export class MessagesDaoSupabase implements IMessages {
  /**
   * Create a new message
   */
  async createMessage(messageData: CreateMessageData): Promise<Message> {
    const supabaseAdmin = createAdminClient();

    const insertData: any = {
      conversation_id: messageData.conversation_id,
      sender_type: messageData.sender_type,
      body: messageData.body,
      direction: messageData.direction,
      status: messageData.status,
      twilio_sid: messageData.twilio_sid,
    };

    if (messageData.sent_at) {
      insertData.sent_at = messageData.sent_at;
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Error creating message:", error);
      throw new Error("Failed to create message");
    }

    return data;
  }

  /**
   * Update message status by Twilio SID
   */
  async updateMessageStatus(
    twilioSid: string,
    status: string,
    deliveredAt?: string
  ): Promise<void> {
    const supabaseAdmin = createAdminClient();

    const updateData: any = {
      status,
    };

    if (deliveredAt) {
      updateData.delivered_at = deliveredAt;
    }

    const { error } = await supabaseAdmin
      .from("messages")
      .update(updateData)
      .eq("twilio_sid", twilioSid);

    if (error) {
      console.error("Error updating message status:", error);
      throw new Error("Failed to update message status");
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching messages:", error);
      throw new Error("Failed to fetch messages");
    }

    return data || [];
  }
}

