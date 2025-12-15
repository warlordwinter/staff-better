// Conversations DAO implementation for Supabase
import { createAdminClient } from "@/lib/supabase/admin";
import { IConversations, Conversation } from "../../interfaces/IConversations";

export class ConversationsDaoSupabase implements IConversations {
  /**
   * Find or create a conversation for an associate and company
   * Returns the conversation ID
   * @param channel - Optional channel type ('sms' or 'whatsapp'). Defaults to 'sms' if not provided.
   */
  async findOrCreateConversation(
    associateId: string,
    companyId: string,
    channel: "sms" | "whatsapp" = "sms"
  ): Promise<string> {
    const supabaseAdmin = createAdminClient();

    // Try to find existing conversation with matching channel
    const { data: existingConversations, error: findError } =
      await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("associate_id", associateId)
        .eq("company_id", companyId)
        .eq("channel", channel)
        .limit(1);

    if (findError) {
      console.error("Error finding conversation:", findError);
      throw new Error("Failed to find conversation");
    }

    // If conversation exists, return its ID
    if (existingConversations && existingConversations.length > 0) {
      return existingConversations[0].id;
    }

    // Create new conversation with channel
    const { data: newConversation, error: createError } = await supabaseAdmin
      .from("conversations")
      .insert([
        {
          associate_id: associateId,
          company_id: companyId,
          channel: channel,
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

