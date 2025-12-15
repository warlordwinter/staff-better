// Interface for Conversations DAO

export interface Conversation {
  id: string;
  associate_id: string;
  company_id: string;
  channel?: "sms" | "whatsapp";
  created_at: string | null;
  updated_at: string | null;
}

export interface IConversations {
  /**
   * Find or create a conversation for an associate and company
   * Returns the conversation ID
   * @param channel - Optional channel type ('sms' or 'whatsapp'). Defaults to 'sms' if not provided.
   */
  findOrCreateConversation(
    associateId: string,
    companyId: string,
    channel?: "sms" | "whatsapp"
  ): Promise<string>;

  /**
   * Get conversation by ID
   */
  getConversationById(conversationId: string): Promise<Conversation | null>;

  /**
   * Get all conversations for an associate within a company
   */
  getConversationsByAssociate(
    associateId: string,
    companyId: string
  ): Promise<Conversation[]>;
}

