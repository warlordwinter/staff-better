// Messages DAO implementation for Supabase
import { createAdminClient } from "@/lib/supabase/admin";
import {
  IMessages,
  Message,
  CreateMessageData,
} from "../../interfaces/IMessages";

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
    };

    // Only include twilio_sid if provided (handles case where column might not exist yet)
    if (messageData.twilio_sid) {
      insertData.twilio_sid = messageData.twilio_sid;
    }

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

      // If twilio_sid column is missing, try again without it
      if (error.code === "PGRST204" && error.message?.includes("twilio_sid")) {
        console.warn(
          "twilio_sid column not found, retrying insert without it. " +
            "Run migration: supabase/migrations/002_add_twilio_sid_to_messages.sql"
        );

        // Remove twilio_sid and try again
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { twilio_sid: _twilio_sid, ...insertDataWithoutSid } = insertData;
        const retryResult = await supabaseAdmin
          .from("messages")
          .insert([insertDataWithoutSid])
          .select()
          .single();

        if (retryResult.error) {
          console.error("Error creating message (retry):", retryResult.error);
          throw new Error(
            `Failed to create message: ${retryResult.error.message}`
          );
        }

        return retryResult.data;
      }

      throw new Error(`Failed to create message: ${error.message}`);
    }

    return data;
  }

  /**
   * Update message status by Twilio SIDz
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

  /**
   * Check if there's an inbound message in the last 24 hours for a conversation
   * Returns the channel of the most recent inbound message if found, null otherwise
   */
  async hasRecentInboundMessage(
    conversationId: string,
    hoursAgo: number = 24
  ): Promise<"sms" | "whatsapp" | null> {
    const supabaseAdmin = createAdminClient();

    // Calculate the timestamp for 24 hours ago
    const hoursAgoDate = new Date();
    hoursAgoDate.setHours(hoursAgoDate.getHours() - hoursAgo);

    // Get the conversation to determine its channel
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("channel")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation:", convError);
      return null;
    }

    // Check for inbound messages in the last 24 hours
    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("sent_at, direction")
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .gte("sent_at", hoursAgoDate.toISOString())
      .order("sent_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking for recent inbound messages:", error);
      return null;
    }

    // If we found an inbound message in the last 24 hours, return the conversation's channel
    if (messages && messages.length > 0) {
      // Return the conversation's channel (which should match the message channel)
      return conversation.channel === "whatsapp" ? "whatsapp" : "sms";
    }

    return null;
  }
}
