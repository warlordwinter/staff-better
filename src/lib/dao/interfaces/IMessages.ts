// Interface for Messages DAO

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  body: string | null;
  direction: string | null;
  status: string | null;
  twilio_sid: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface CreateMessageData {
  conversation_id: string;
  sender_type: string;
  body: string | null;
  direction: string;
  status: string | null;
  twilio_sid: string | null;
  sent_at?: string;
}

export interface IMessages {
  /**
   * Create a new message
   */
  createMessage(messageData: CreateMessageData): Promise<Message>;

  /**
   * Update message status by Twilio SID
   */
  updateMessageStatus(
    twilioSid: string,
    status: string,
    deliveredAt?: string
  ): Promise<void>;

  /**
   * Get all messages for a conversation
   */
  getMessagesByConversation(conversationId: string): Promise<Message[]>;

  /**
   * Check if there's an inbound message in the last 24 hours for a conversation
   * Returns the channel of the most recent inbound message if found, null otherwise
   */
  hasRecentInboundMessage(
    conversationId: string,
    hoursAgo?: number
  ): Promise<"sms" | "whatsapp" | null>;
}

