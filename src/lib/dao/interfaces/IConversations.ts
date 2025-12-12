// Interface for Conversations DAO

export interface Conversation {
  id: string;
  associate_id: string;
  company_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface IConversations {
  /**
   * Find or create a conversation for an associate and company
   * Returns the conversation ID
   */
  findOrCreateConversation(
    associateId: string,
    companyId: string
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

