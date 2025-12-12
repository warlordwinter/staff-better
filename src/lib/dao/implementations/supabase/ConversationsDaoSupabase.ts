// Conversations DAO implementation for Supabase
import { createAdminClient } from "@/lib/supabase/admin";
import { IConversations, Conversation } from "../../interfaces/IConversations";

export class ConversationsDaoSupabase implements IConversations {
  /**
   * Find or create a conversation for an associate and company
   * Returns the conversation ID
   */
  async findOrCreateConversation(
    associateId: string,
    companyId: string
  ): Promise<string> {
    const supabaseAdmin = createAdminClient();

    // Try to find existing conversation
    const { data: existingConversations, error: findError } =
      await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("associate_id", associateId)
        .eq("company_id", companyId)
        .limit(1);

    if (findError) {
      console.error("Error finding conversation:", findError);
      throw new Error("Failed to find conversation");
    }

    // If conversation exists, return its ID
    if (existingConversations && existingConversations.length > 0) {
      return existingConversations[0].id;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabaseAdmin
      .from("conversations")
      .insert([
        {
          associate_id: associateId,
          company_id: companyId,
        },
      ])
      .select()
      .single();

    if (createError || !newConversation) {
      console.error("Error creating conversation:", createError);
      throw new Error("Failed to create conversation");
    }

    return newConversation.id;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(
    conversationId: string
  ): Promise<Conversation | null> {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching conversation:", error);
      throw new Error("Failed to fetch conversation");
    }

    return data;
  }

  /**
   * Get all conversations for an associate within a company
   */
  async getConversationsByAssociate(
    associateId: string,
    companyId: string
  ): Promise<Conversation[]> {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("associate_id", associateId)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      throw new Error("Failed to fetch conversations");
    }

    return data || [];
  }
}

